import { useState, useMemo, useEffect, useRef } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Label,
} from "recharts";
import { useMarketMaturity } from "../hooks/useMarketMaturity";




interface FmvDataRow {
  country: string;
  region: string;
  basco_score: number;
  fmv: number;
  attr_loss: number;
}

type MetricType = "Total FMV";

const initialFmvData: FmvDataRow[] = [
  { country: "Australia",   region: "APJ",   basco_score: 11.8, fmv: 1473000, attr_loss: 276350 },
  { country: "Brazil",      region: "LATAM", basco_score: 14.7, fmv: 1158842, attr_loss: 121675 },
  { country: "South Korea", region: "APJ",   basco_score: 15,   fmv: 1124500, attr_loss: 39210  },
  { country: "Germany",     region: "EMEA",  basco_score: 0,    fmv: 946900,  attr_loss: 179009 },
  { country: "Nordics",     region: "EMEA",  basco_score: 3.8,  fmv: 765000,  attr_loss: 147150 },
  { country: "Mexico",      region: "LATAM", basco_score: 5.7,  fmv: 255809,  attr_loss: 53720  },
  { country: "Indonesia",   region: "APJ",   basco_score: 24.7, fmv: 145500,  attr_loss: 11640  },
  { country: "France",      region: "EMEA",  basco_score: 9.4,  fmv: 97000,   attr_loss: 9600   },
  { country: "Spain",       region: "EMEA",  basco_score: 11.7, fmv: 46770,   attr_loss: 13290  },
];

function getScoreColor(score: number): {
  fill: string;
  gradientId: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  label: string;
} {
  if (score < 8) {
    return {
      fill: "#ef4444",
      gradientId: "redBubbleGrad",
      border: "#b91c1c",
      badgeBg: "bg-red-500/10",
      badgeText: "text-red-400",
      label: "Critical Risk (< 8)",
    };
  }
  if (score < 15) {
    return {
      fill: "#f59e0b",
      gradientId: "amberBubbleGrad",
      border: "#d97706",
      badgeBg: "bg-amber-500/10",
      badgeText: "text-amber-400",
      label: "Moderate (8 - 14)",
    };
  }
  return {
    fill: "#10b981",
    gradientId: "greenBubbleGrad",
    border: "#059669",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-400",
    label: "Mature (≥ 15)",
  };
}

// ── Custom Dot for Bubble Chart ─────────────────────────────────────────────
// ── Custom Dot with Smart Collision-Free Label Placement ───────────────────
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;

  const { country, basco_score, radius } = payload;
  const colorInfo = getScoreColor(basco_score);

  // Compute smart, collision-free label position
  // 1. Check vertical boundaries so labels near top/bottom don't get clipped
  const isNearTop = cy - radius < 30;
  
  // 2. Specific dense cluster distribution:
  // - Close pairs at same X:
  //   - Germany (top) vs Portugal (bottom)
  //   - South Korea (top) vs India (bottom)
  //   - Australia (top) vs France (bottom-left) vs Spain (bottom-right)
  //   - Brazil (top-left) vs South Korea (top)
  const bottomPlacements = [
    "India",
    "Portugal",
    "Spain",
    "France",
    "Turkey",
    "Thailand",
    "Malaysia",
    "New Zealand",
  ];
  const leftPlacements = ["Brazil", "Nordics"];

  let labelX = cx;
  let labelY = cy - radius - 7;
  let pillY = cy - radius - 18;
  let textAnchor: "middle" | "end" = "middle";

  if (isNearTop || bottomPlacements.includes(country)) {
    labelY = cy + radius + 13;
    pillY = cy + radius + 3;
  } else if (leftPlacements.includes(country)) {
    labelX = cx - radius - 6;
    labelY = cy + 4;
    pillY = cy - 6;
    textAnchor = "end";
  }

  const pillWidth = Math.max(country.length * 6.2 + 8, 30);
  const pillHeight = 15;
  const pillX = textAnchor === "end" ? labelX - pillWidth : labelX - pillWidth / 2;

  return (
    <g className="cursor-pointer">
      {/* Outer subtle glow ring */}
      <circle
        cx={cx}
        cy={cy}
        r={radius + 2.5}
        fill={colorInfo.fill}
        fillOpacity={0.15}
        pointerEvents="none"
      />
      {/* Main Bubble */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={`url(#${colorInfo.gradientId})`}
        fillOpacity={0.92}
        stroke="#ffffff"
        strokeWidth={2}
        filter="url(#bubbleShadow)"
        className="transition-opacity duration-150 hover:opacity-100"
      />
      {/* Label Background Pill to prevent overlap with gridlines & bubbles */}
      <rect
        x={pillX}
        y={pillY}
        width={pillWidth}
        height={pillHeight}
        rx={4}
        fill="#ffffff"
        fillOpacity={0.92}
        stroke="#e2e8f0"
        strokeWidth={1}
        className="pointer-events-none drop-shadow-2xs"
      />
      {/* Country Label with high contrast text */}
      <text
        x={labelX}
        y={labelY}
        textAnchor={textAnchor}
        fill="#0f172a"
        fontSize={10}
        fontWeight={800}
        letterSpacing="0.01em"
        pointerEvents="none"
        className="select-none pointer-events-none"
      >
        {country}
      </text>
    </g>
  );
};

// ── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    const colorInfo = getScoreColor(item.basco_score);

    return (
      <div className="pointer-events-none select-none bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl p-4 shadow-2xl border border-slate-700/80 text-xs space-y-2.5 min-w-[230px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/70 pb-2.5">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: colorInfo.fill }}
            />
            <span className="font-bold text-sm text-white tracking-tight">
              {item.country}
            </span>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium border border-slate-700">
            {item.region}
          </span>
        </div>

        {/* Metric Rows */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-400">BASCO Score:</span>
            <span className="font-extrabold text-sm text-white">
              {Number(item.basco_score).toFixed(1)}%
            </span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-400">Total FMV:</span>
            <span className="font-semibold text-cyan-400">
              ${Number(item.fmv ?? 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function MarketMaturityPage() {
  const [selectedQuarter, setSelectedQuarter] = useState<string>("All Quarters");
  const [isQuarterOpen, setIsQuarterOpen] = useState(false);
  const quarterRef = useRef<HTMLDivElement>(null);

  const activeMetric: MetricType = "Total FMV";

  const { data: apiResponse } = useMarketMaturity(selectedQuarter);


  const availableQuarters = apiResponse?.filter_options?.quarters || ["All Quarters", "Q3 2026", "Q2 2026", "Q1 2026", "Q4 2025", "Q3 2025", "Q2 2025", "Q1 2025"];

  const metrics: { id: MetricType; icon: string; desc: string }[] = [
    { id: "Total FMV", icon: "💰", desc: "Total Fair Market Value" },
  ];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (quarterRef.current && !quarterRef.current.contains(e.target as Node)) {
        setIsQuarterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Compute Country Aggregates based on live backend data ────────────────────
  const currentFmvData = useMemo(() => {
    const rawData = apiResponse?.data;
    if (rawData && rawData.length > 0) {
      return rawData.map((r) => ({
        country: r.country,
        region: r.region,
        basco_score: r.avg_basco_score,
        total_jobs: r.total_jobs || 1,
        fmv: r.fmv ?? (r.total_jobs * 35000),
        attr_loss: r.attr_loss ?? Math.round((r.fmv ?? (r.total_jobs * 35000)) * ((100 - r.avg_basco_score) / 100) * 0.22),
      }));
    }

    return initialFmvData;
  }, [apiResponse]);


  // ── Calculate dynamic bubbles and radii ───────────────────────────────────────
  const currentDataset = useMemo(() => {
    const maxVal = Math.max(...currentFmvData.map((d) => d.fmv), 1);
    return currentFmvData.map((d) => ({
      ...d,
      x: d.basco_score,
      y: d.fmv,
      radius: Math.max(7, Math.min(26, Math.round((d.fmv / maxVal) * 26))),
    }));
  }, [currentFmvData]);

  const avgCohortScore = useMemo(() => {
    if (!currentDataset.length) return "0.0";
    const totalJobs = currentDataset.reduce((acc, d) => acc + ((d as any).total_jobs || 1), 0);
    const weightedSum = currentDataset.reduce((acc, d) => acc + (d.basco_score * ((d as any).total_jobs || 1)), 0);
    return (weightedSum / Math.max(1, totalJobs)).toFixed(1);
  }, [currentDataset]);

  // Dynamic Y-axis properties
  const yAxisConfig = useMemo(() => {
    return {
      label: "Total Fair Market Value ($)",
      formatter: (v: number) => `$${(v / 1000).toFixed(0)}K`,
      domain: [0, (max: number) => Math.ceil((max * 1.15) / 250000) * 250000 || 1600000],
      yRefLine: 500000,
      yRefLabel: "FMV Threshold ($500K)",
    };
  }, []);

  const footNote = useMemo(() => {
    return `FMV data sourced from Intel POP records. ${currentDataset.length} countries shown for ${selectedQuarter}.`;
  }, [currentDataset.length, selectedQuarter]);

  return (
    <div className="space-y-4 pb-6">
      {/* ── Page Header & Top Telemetry Summary ─────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black text-[#071739] tracking-tight">
              Market Maturity Model
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-[#0062d2] border border-blue-200/80 shadow-2xs">
              Live Matrix
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            BASCO Compliance Score vs. Risk & Violations • Compare market maturity cohorts across global regions.
          </p>
        </div>

        {/* Top Summary Telemetry Chips (Period card removed) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-white/95 border border-slate-200/90 rounded-xl px-3.5 py-1.5 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tracked Markets</span>
            <span className="text-base font-black text-[#071739]">{currentDataset.length}</span>
          </div>
          <div className="bg-white/95 border border-slate-200/90 rounded-xl px-3.5 py-1.5 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg BASCO Score</span>
            <span className="text-base font-black text-[#0062d2]">{avgCohortScore}%</span>
          </div>
        </div>
      </div>

      {/* ── Top Controls Bar: Metric Dimension Tabs + Quarter Filter ──── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Metric Dimension Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Sizing Dimension:
          </span>
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 flex-wrap">
            {metrics.map(({ id, icon, desc }) => (
              <button
                key={id}
                type="button"
                title={desc}
                className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 bg-white text-[#0062d2] shadow-xs border border-blue-100 cursor-default"
              >
                <span>{icon}</span>
                <span>{id}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Quarter Selector Dropdown */}
        <div ref={quarterRef} className="relative flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setIsQuarterOpen((v) => !v)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs border ${
              selectedQuarter !== "All Quarters"
                ? "bg-[#0062d2] text-white border-[#0062d2]"
                : "bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50"
            } cursor-pointer`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-2xs"></span>
            <span className="text-slate-400 font-medium">Quarter:</span>
            <span>{selectedQuarter}</span>
            <span className="text-[10px] transform transition-transform" style={{ transform: isQuarterOpen ? "rotate(180deg)" : "none" }}>
              ▼
            </span>
          </button>

          {isQuarterOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Select Maturity Period
              </div>
              {availableQuarters.map((period) => {
                const isSelected = selectedQuarter === period;
                return (
                  <button
                    key={period}
                    onClick={() => {
                      setSelectedQuarter(period);
                      setIsQuarterOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-blue-50 text-[#0062d2]"
                        : "text-slate-700 hover:bg-slate-100/80 cursor-pointer"
                    }`}
                  >
                    <span>{period}</span>
                    {isSelected && <span className="text-[#0062d2] font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Full-Width Matrix Card ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
        {/* Sub-header with Score Legend Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Quadrant Distribution Matrix
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Bubble size represents <strong className="text-slate-700">{activeMetric}</strong>
            </span>
          </div>

          {/* Score Legend Badges */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold px-2.5 py-0.5 rounded-lg text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>≥ 15% Mature (Healthy)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/80 font-bold px-2.5 py-0.5 rounded-lg text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>8% – 14% Moderate</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200/80 font-bold px-2.5 py-0.5 rounded-lg text-[11px]">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>&lt; 8% Critical Action</span>
            </span>
          </div>
        </div>

        {/* ── Scatter/Bubble Chart Container ─────────────────────────── */}
        <div className="relative mt-2">
          {/* Background Quadrant Watermark Badges (Layered behind the chart) */}
          {/* Top-Left: High Violations/Loss, Low Score */}
          <div className="absolute top-[8px] left-[70px] z-0 pointer-events-none select-none opacity-75">
            <div className="inline-flex items-center gap-1.5 bg-rose-50/70 text-rose-700/90 border border-rose-200/60 text-[11px] font-bold px-2.5 py-0.5 rounded-lg shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500/80"></span>
              <span>🚨 Critical Action</span>
              <span className="hidden lg:inline text-[10px] font-normal text-rose-500/90">(High Risk / Low Score)</span>
            </div>
          </div>

          {/* Top-Right: High Violations/Loss, High Score */}
          <div className="absolute top-[8px] right-[24px] z-0 pointer-events-none select-none opacity-75">
            <div className="inline-flex items-center gap-1.5 bg-amber-50/70 text-amber-700/90 border border-amber-200/60 text-[11px] font-bold px-2.5 py-0.5 rounded-lg shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80"></span>
              <span>⚠️ Needs Support</span>
              <span className="hidden lg:inline text-[10px] font-normal text-amber-600/90">(High Risk / High Score)</span>
            </div>
          </div>

          {/* Bottom-Left: Low Violations/Loss, Low Score */}
          <div className="absolute bottom-[48px] left-[70px] z-0 pointer-events-none select-none opacity-75">
            <div className="inline-flex items-center gap-1.5 bg-amber-50/70 text-amber-700/90 border border-amber-200/60 text-[11px] font-bold px-2.5 py-0.5 rounded-lg shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80"></span>
              <span>⚠️ Needs Support</span>
              <span className="hidden lg:inline text-[10px] font-normal text-amber-600/90">(Low Risk / Low Score)</span>
            </div>
          </div>

          {/* Bottom-Right: Low Violations/Loss, High Score */}
          <div className="absolute bottom-[48px] right-[24px] z-0 pointer-events-none select-none opacity-75">
            <div className="inline-flex items-center gap-1.5 bg-emerald-50/70 text-emerald-700/90 border border-emerald-200/60 text-[11px] font-bold px-2.5 py-0.5 rounded-lg shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80"></span>
              <span>✨ Healthy & Mature</span>
              <span className="hidden lg:inline text-[10px] font-normal text-emerald-600/90">(Optimal Market)</span>
            </div>
          </div>

          {/* Recharts Scatter Chart - Foreground Layer (z-10) */}
          <div className="relative z-10 h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 15, right: 25, bottom: 25, left: 15 }}>
                <defs>
                  <linearGradient id="redBubbleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                  <linearGradient id="amberBubbleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <linearGradient id="greenBubbleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  <filter id="bubbleShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.18" />
                  </filter>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.8} />

                {/* X-Axis: BASCO Score */}
                <XAxis
                  type="number"
                  dataKey="x"
                  name="BASCO Score"
                  domain={[0, 30]}
                  ticks={[0, 5, 10, 15, 20, 25, 30]}
                  stroke="#94a3b8"
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                >
                  <Label
                    value="BASCO Score (% Adherence)"
                    offset={-10}
                    position="insideBottom"
                    style={{
                      fill: "#334155",
                      fontSize: "11px",
                      fontWeight: 700,
                      textAnchor: "middle",
                    }}
                  />
                </XAxis>

                {/* Y-Axis: Dynamic Metric Value */}
                <YAxis
                  type="number"
                  dataKey="y"
                  name={activeMetric}
                  domain={yAxisConfig.domain as any}
                  tickFormatter={yAxisConfig.formatter}
                  stroke="#94a3b8"
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                  width={65}
                >
                  <Label
                    value={yAxisConfig.label}
                    angle={-90}
                    position="insideLeft"
                    offset={-5}
                    style={{
                      fill: "#334155",
                      fontSize: "11px",
                      fontWeight: 700,
                      textAnchor: "middle",
                    }}
                  />
                </YAxis>

                <Tooltip
                  content={<CustomTooltip activeMetric={activeMetric} />}
                  cursor={{ strokeDasharray: "3 3", stroke: "#94a3b8", strokeWidth: 1 }}
                />

                {/* Vertical Quadrant Separator Line at BASCO Score = 15 */}
                <ReferenceLine
                  x={15}
                  stroke="#0062d2"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: "Target BASCO (15%)",
                    position: "top",
                    fill: "#0062d2",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />

                {/* Horizontal Threshold Reference Line */}
                <ReferenceLine
                  y={yAxisConfig.yRefLine}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: yAxisConfig.yRefLabel,
                    position: "insideBottomLeft",
                    fill: "#64748b",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />

                {/* Scatter Bubbles */}
                <Scatter
                  data={currentDataset}
                  shape={<CustomDot />}
                  animationDuration={600}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Bottom Footnote ───────────────────────────────────────── */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 gap-1.5">
          <span>{footNote}</span>
          <span className="font-semibold text-slate-500">
            Quadrant Baseline: X = 15% Score • Period: {selectedQuarter}
          </span>
        </div>
      </div>
    </div>
  );
}

