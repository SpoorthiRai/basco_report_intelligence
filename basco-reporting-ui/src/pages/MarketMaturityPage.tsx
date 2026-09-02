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
  if (score < 80) {
    return {
      fill: "#EF4444",
      gradientId: "redBubbleGrad",
      border: "#B91C1C",
      badgeBg: "bg-[#EF4444]/10",
      badgeText: "text-[#EF4444]",
      label: "Critical Action (< 80%)",
    };
  }
  if (score <= 90) {
    return {
      fill: "#F59E0B",
      gradientId: "amberBubbleGrad",
      border: "#D97706",
      badgeBg: "bg-[#F59E0B]/10",
      badgeText: "text-[#F59E0B]",
      label: "Moderate (80% – 90%)",
    };
  }
  return {
    fill: "#10B981",
    gradientId: "greenBubbleGrad",
    border: "#059669",
    badgeBg: "bg-[#10B981]/10",
    badgeText: "text-[#10B981]",
    label: "Healthy (> 90%)",
  };
}

// ── Custom Dot for Bubble Chart with Smart Collision-Free Labels ────────────
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;

  const { country, basco_score, radius } = payload;
  const colorInfo = getScoreColor(basco_score);

  // Vertical boundary check
  const isNearTop = cy - radius < 35;
  
  // Specific dense cluster placement strategies to avoid collision
  const bottomPlacements = [
    "India",
    "Portugal",
    "Spain",
    "France",
    "Turkey",
    "Thailand",
    "Malaysia",
    "New Zealand",
    "Egypt",
    "Saudi Arabia",
    "Netherlands",
  ];
  const leftPlacements = ["Brazil", "Nordics", "UAE"];

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

  const pillWidth = Math.max(country.length * 6.2 + 10, 32);
  const pillHeight = 15;
  const pillX = textAnchor === "end" ? labelX - pillWidth : labelX - pillWidth / 2;

  return (
    <g className="cursor-pointer group">
      {/* Outer subtle glow ring */}
      <circle
        cx={cx}
        cy={cy}
        r={radius + 3}
        fill={colorInfo.fill}
        fillOpacity={0.18}
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
        className="transition-all duration-200 hover:opacity-100 hover:stroke-width-[2.5px]"
      />
      {/* Label Background Pill */}
      <rect
        x={pillX}
        y={pillY}
        width={pillWidth}
        height={pillHeight}
        rx={4}
        fill="#ffffff"
        fillOpacity={0.94}
        stroke="#e2e8f0"
        strokeWidth={1}
        className="pointer-events-none drop-shadow-2xs"
      />
      {/* Country Label */}
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
            <span className="text-slate-400">Attribution Loss:</span>
            <span className="font-semibold text-rose-400">
              ${Number(item.attr_loss ?? 0).toLocaleString()}
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
      y: d.attr_loss,
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
      label: "Attribution Loss ($)",
      formatter: (v: number) => `$${(v / 1000).toFixed(0)}K`,
      domain: [0, (max: number) => Math.ceil((max * 1.15) / 50000) * 50000 || 300000],
    };
  }, []);

  // Dynamic Quadrant Breakdown with Country Lists & Clear 2D Criteria
  const quadrantStats = useMemo(() => {
    const critical: string[] = [];
    const highRisk: string[] = [];
    const emerging: string[] = [];
    const healthy: string[] = [];

    currentDataset.forEach((d) => {
      const isHighScore = d.basco_score >= 90;
      const isModerateScore = d.basco_score >= 80 && d.basco_score < 90;
      const isLowScore = d.basco_score < 80;
      const isHighLoss = d.attr_loss > 100000;

      if (isLowScore && isHighLoss) {
        critical.push(d.country);
      } else if ((isModerateScore || isHighScore) && isHighLoss) {
        highRisk.push(d.country);
      } else if (isLowScore && !isHighLoss) {
        emerging.push(d.country);
      } else {
        healthy.push(d.country);
      }
    });

    return { critical, highRisk, emerging, healthy };
  }, [currentDataset]);

  const footNote = useMemo(() => {
    return `FMV data sourced from Intel POP records. ${currentDataset.length} countries shown for ${selectedQuarter}.`;
  }, [currentDataset.length, selectedQuarter]);

  return (
    <div className="space-y-4 pb-6">
      {/* ── Page Header & Top Telemetry Summary + Quarter Filter ─────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-[#111827] tracking-tight">
            Market Maturity Model
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            BASCO Compliance Score vs. Risk & Violations • Compare market maturity cohorts across global regions.
          </p>
        </div>

        {/* Top Summary Telemetry Chips & Quarter Filter Dropdown */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-white/95 border border-[#E5E7EB] rounded-xl px-3.5 py-1.5 shadow-2xs">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Tracked Markets</span>
            <span className="text-base font-black text-[#111827]">{currentDataset.length}</span>
          </div>
          <div className="bg-white/95 border border-[#E5E7EB] rounded-xl px-3.5 py-1.5 shadow-2xs">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Avg BASCO Score</span>
            <span className="text-base font-black text-[#1E429F]">{avgCohortScore}%</span>
          </div>

          {/* Quarter Selector Dropdown */}
          <div ref={quarterRef} className="relative flex items-center">
            <button
              type="button"
              onClick={() => setIsQuarterOpen((v) => !v)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs border ${
                selectedQuarter !== "All Quarters"
                  ? "bg-[#1E429F] text-white border-[#1E429F]"
                  : "bg-white text-[#111827] border-[#E5E7EB] hover:border-[#CBD5E1] hover:bg-slate-50"
              } cursor-pointer`}
            >
              <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-2xs"></span>
              <span className="text-[#6B7280] font-medium">Quarter:</span>
              <span>{selectedQuarter}</span>
              <span className="text-[10px] transform transition-transform" style={{ transform: isQuarterOpen ? "rotate(180deg)" : "none" }}>
                ▼
              </span>
            </button>

            {isQuarterOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-[#E5E7EB] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider border-b border-[#E5E7EB]">
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
                          ? "bg-[#1E429F]/10 text-[#1E429F]"
                          : "text-[#111827] hover:bg-slate-100/80 cursor-pointer"
                      }`}
                    >
                      <span>{period}</span>
                      {isSelected && <span className="text-[#1E429F] font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Full-Width Matrix Card ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-4 sm:p-5 flex flex-col justify-between">
        {/* Sub-header with Score Legend Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#E5E7EB]">
          <div>
            <span className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
              Quadrant Distribution Matrix
            </span>
            <span className="text-[11px] text-[#6B7280] font-medium">
              Bubble size represents <strong className="text-[#111827]">{activeMetric}</strong>
            </span>
          </div>

          {/* Score Legend Badges */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center gap-1.5 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 font-bold px-2.5 py-0.5 rounded-lg text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
              <span>&gt; 90% Healthy</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/25 font-bold px-2.5 py-0.5 rounded-lg text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
              <span>80% – 90% Moderate</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/25 font-bold px-2.5 py-0.5 rounded-lg text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>
              <span>&lt; 80% Critical Action</span>
            </span>
          </div>
        </div>

        {/* ── Scatter/Bubble Chart Container ─────────────────────────── */}
        <div className="relative mt-2">
          {/* Recharts Scatter Chart - Foreground Layer (z-10) */}
          <div className="relative z-10 h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 15, right: 25, bottom: 25, left: 15 }}>
                <defs>
                  <linearGradient id="redBubbleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F87171" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                  <linearGradient id="amberBubbleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                  <linearGradient id="greenBubbleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                  <filter id="bubbleShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.18" />
                  </filter>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeOpacity={0.8} />

                {/* X-Axis: BASCO Score */}
                <XAxis
                  type="number"
                  dataKey="x"
                  name="BASCO Score"
                  domain={[40, 100]}
                  ticks={[40, 50, 60, 70, 80, 90, 100]}
                  stroke="#94A3B8"
                  tick={{ fill: "#6B7280", fontSize: 11, fontWeight: 600 }}
                >
                  <Label
                    value="BASCO Score (% Adherence)"
                    offset={-10}
                    position="insideBottom"
                    style={{
                      fill: "#111827",
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
                  name="Attribution Loss"
                  domain={yAxisConfig.domain as any}
                  tickFormatter={yAxisConfig.formatter}
                  stroke="#94A3B8"
                  tick={{ fill: "#6B7280", fontSize: 11, fontWeight: 600 }}
                  width={65}
                >
                  <Label
                    value={yAxisConfig.label}
                    angle={-90}
                    position="insideLeft"
                    offset={-5}
                    style={{
                      fill: "#111827",
                      fontSize: "11px",
                      fontWeight: 700,
                      textAnchor: "middle",
                    }}
                  />
                </YAxis>

                <Tooltip
                  content={<CustomTooltip activeMetric={activeMetric} />}
                  cursor={{ strokeDasharray: "3 3", stroke: "#94A3B8", strokeWidth: 1 }}
                />

                {/* Target Line at 90% (Healthy Threshold) */}
                <ReferenceLine
                  x={90}
                  stroke="#1E429F"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: "Target BASCO (90%)",
                    position: "top",
                    fill: "#1E429F",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />

                {/* Moderate Boundary Line at 80% */}
                <ReferenceLine
                  x={80}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "Moderate (80%)",
                    position: "top",
                    fill: "#D97706",
                    fontSize: 10,
                    fontWeight: 700,
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

        {/* ── 4-Quadrant Strategic Summary Cards (Clear 2D Criteria + Country Tags) ── */}
        <div className="mt-3 pt-3 border-t border-[#E5E7EB] grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* Card 1: Critical Action */}
          <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-extrabold text-[#EF4444] flex items-center gap-1.5">
                <span>🚨</span> Critical Action
              </span>
              <span className="text-xs font-black bg-[#EF4444]/15 text-[#EF4444] px-2 py-0.5 rounded-md">
                {quadrantStats.critical.length}
              </span>
            </div>
            <span className="text-[10px] text-[#6B7280] font-medium mt-1">
              Score &lt; 80% &bull; Loss &gt; $100K
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {quadrantStats.critical.map((c) => (
                <span key={c} className="text-[9px] font-bold bg-[#EF4444]/10 text-[#EF4444] px-1.5 py-0.2 rounded border border-[#EF4444]/20">
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Card 2: High Volume Risk */}
          <div className="bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-extrabold text-[#D97706] flex items-center gap-1.5">
                <span>⚠️</span> High Volume Risk
              </span>
              <span className="text-xs font-black bg-[#F59E0B]/15 text-[#D97706] px-2 py-0.5 rounded-md">
                {quadrantStats.highRisk.length}
              </span>
            </div>
            <span className="text-[10px] text-[#6B7280] font-medium mt-1">
              Score &ge; 80% &bull; Loss &gt; $100K
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {quadrantStats.highRisk.map((c) => (
                <span key={c} className="text-[9px] font-bold bg-[#F59E0B]/10 text-[#D97706] px-1.5 py-0.2 rounded border border-[#F59E0B]/20">
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Card 3: Emerging Market */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                <span>🌱</span> Emerging Market
              </span>
              <span className="text-xs font-black bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                {quadrantStats.emerging.length}
              </span>
            </div>
            <span className="text-[10px] text-[#6B7280] font-medium mt-1">
              Score &lt; 80% &bull; Loss &le; $100K
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {quadrantStats.emerging.map((c) => (
                <span key={c} className="text-[9px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded border border-slate-300">
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Card 4: Healthy & Mature */}
          <div className="bg-[#10B981]/5 border border-[#10B981]/20 rounded-xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-extrabold text-[#059669] flex items-center gap-1.5">
                <span>✨</span> Healthy &amp; Mature
              </span>
              <span className="text-xs font-black bg-[#10B981]/15 text-[#059669] px-2 py-0.5 rounded-md">
                {quadrantStats.healthy.length}
              </span>
            </div>
            <span className="text-[10px] text-[#6B7280] font-medium mt-1">
              Score &ge; 90% &bull; Loss &le; $100K
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1 max-h-[36px] overflow-y-auto">
              {quadrantStats.healthy.slice(0, 3).map((c) => (
                <span key={c} className="text-[9px] font-bold bg-[#10B981]/10 text-[#059669] px-1.5 py-0.2 rounded border border-[#10B981]/20">
                  {c}
                </span>
              ))}
              {quadrantStats.healthy.length > 3 && (
                <span className="text-[9px] font-bold text-[#6B7280] px-1 py-0.2">
                  +{quadrantStats.healthy.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom Footnote ───────────────────────────────────────── */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 gap-1.5">
          <span>{footNote}</span>
          <span className="font-semibold text-slate-500">
            Target BASCO: &gt; 90% Healthy • 80%–90% Moderate • &lt; 80% Critical Action • Period: {selectedQuarter}
          </span>
        </div>
      </div>
    </div>
  );
}

