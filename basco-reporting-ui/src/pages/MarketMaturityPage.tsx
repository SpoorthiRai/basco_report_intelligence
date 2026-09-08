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
import { useLeagueTable } from "../hooks/useLeagueTable";

interface FmvDataRow {
  country: string;
  region: string;
  basco_score: number;
  fmv: number;
  attr_loss: number;
  total_jobs?: number;
  parent_accounts?: string[];
}

export interface ParentAccountRow {
  parent_account: string;
  country: string;
  region: string;
  basco_score: number;
  total_jobs: number;
  fmv: number;
  attr_loss: number;
  quadrant: "Priority Action" | "High-Value Opportunity" | "Build Momentum" | "Strong Performance";
  topAccount?: boolean;
}

type ViewMode = "markets" | "accounts";
type QuadrantFilter = "ALL" | "Priority Action" | "High-Value Opportunity" | "Build Momentum" | "Strong Performance";

const fallbackParentAccounts: ParentAccountRow[] = [
  { parent_account: "JB Hi-Fi Group", country: "Australia", region: "APJ", basco_score: 74.2, total_jobs: 38, fmv: 850000, attr_loss: 190000, quadrant: "Priority Action", topAccount: true },
  { parent_account: "Harvey Norman", country: "Australia", region: "APJ", basco_score: 79.1, total_jobs: 26, fmv: 623000, attr_loss: 110000, quadrant: "Priority Action", topAccount: true },
  { parent_account: "Currys PLC", country: "UK", region: "EMEA", basco_score: 76.5, total_jobs: 32, fmv: 710000, attr_loss: 145000, quadrant: "Priority Action", topAccount: true },
  { parent_account: "MediaMarktSaturn", country: "Germany", region: "EMEA", basco_score: 86.4, total_jobs: 45, fmv: 946900, attr_loss: 179009, quadrant: "High-Value Opportunity", topAccount: true },
  { parent_account: "Elkjop Nordic", country: "Nordics", region: "EMEA", basco_score: 83.8, total_jobs: 34, fmv: 765000, attr_loss: 147150, quadrant: "High-Value Opportunity", topAccount: true },
  { parent_account: "Magazine Luiza", country: "Brazil", region: "LATAM", basco_score: 84.7, total_jobs: 28, fmv: 680000, attr_loss: 105000, quadrant: "High-Value Opportunity" },
  { parent_account: "Yodobashi Camera", country: "Japan", region: "APJ", basco_score: 88.2, total_jobs: 30, fmv: 590000, attr_loss: 115000, quadrant: "High-Value Opportunity", topAccount: true },
  { parent_account: "Liverpool", country: "Mexico", region: "LATAM", basco_score: 75.7, total_jobs: 14, fmv: 255809, attr_loss: 53720, quadrant: "Build Momentum" },
  { parent_account: "Sharaf DG", country: "UAE", region: "EMEA", basco_score: 72.4, total_jobs: 12, fmv: 180000, attr_loss: 42000, quadrant: "Build Momentum" },
  { parent_account: "Fnac Darty", country: "France", region: "EMEA", basco_score: 78.0, total_jobs: 11, fmv: 97000, attr_loss: 9600, quadrant: "Build Momentum" },
  { parent_account: "El Corte Ingles", country: "Spain", region: "EMEA", basco_score: 91.7, total_jobs: 9, fmv: 46770, attr_loss: 4290, quadrant: "Strong Performance" },
  { parent_account: "B&H Photo Video", country: "US", region: "US", basco_score: 96.5, total_jobs: 54, fmv: 1200000, attr_loss: 12000, quadrant: "Strong Performance", topAccount: true },
  { parent_account: "Best Buy", country: "US", region: "US", basco_score: 94.8, total_jobs: 62, fmv: 1450000, attr_loss: 18500, quadrant: "Strong Performance", topAccount: true },
  { parent_account: "Coupang", country: "South Korea", region: "APJ", basco_score: 93.0, total_jobs: 22, fmv: 540000, attr_loss: 8200, quadrant: "Strong Performance" },
  { parent_account: "Reliance Digital", country: "India", region: "APJ", basco_score: 92.4, total_jobs: 35, fmv: 480000, attr_loss: 14000, quadrant: "Strong Performance", topAccount: true },
  { parent_account: "Croma", country: "India", region: "APJ", basco_score: 91.2, total_jobs: 29, fmv: 400000, attr_loss: 11500, quadrant: "Strong Performance" },
  { parent_account: "Boulanger", country: "France", region: "EMEA", basco_score: 94.1, total_jobs: 16, fmv: 85000, attr_loss: 3200, quadrant: "Strong Performance" },
  { parent_account: "Memory Express", country: "Canada", region: "CANADA", basco_score: 95.0, total_jobs: 18, fmv: 210000, attr_loss: 4500, quadrant: "Strong Performance" },
];

const initialFmvData: FmvDataRow[] = [
  { country: "Australia",   region: "APJ",   basco_score: 75.8, fmv: 1473000, attr_loss: 276350, parent_accounts: ["JB Hi-Fi Group", "Harvey Norman"] },
  { country: "Brazil",      region: "LATAM", basco_score: 84.7, fmv: 1158842, attr_loss: 121675, parent_accounts: ["Magazine Luiza", "Casas Bahia"] },
  { country: "South Korea", region: "APJ",   basco_score: 93.0, fmv: 1124500, attr_loss: 39210,  parent_accounts: ["Coupang", "Himart"] },
  { country: "Germany",     region: "EMEA",  basco_score: 86.4, fmv: 946900,  attr_loss: 179009, parent_accounts: ["MediaMarktSaturn", "Cyberport"] },
  { country: "Nordics",     region: "EMEA",  basco_score: 83.8, fmv: 765000,  attr_loss: 147150, parent_accounts: ["Elkjop Nordic", "Power"] },
  { country: "Mexico",      region: "LATAM", basco_score: 75.7, fmv: 255809,  attr_loss: 53720,  parent_accounts: ["Liverpool", "Palacio de Hierro"] },
  { country: "Indonesia",   region: "APJ",   basco_score: 91.5, fmv: 145500,  attr_loss: 11640,  parent_accounts: ["Erajaya", "Hartono"] },
  { country: "France",      region: "EMEA",  basco_score: 86.4, fmv: 182000,  attr_loss: 12800,  parent_accounts: ["Fnac Darty", "Boulanger"] },
  { country: "Spain",       region: "EMEA",  basco_score: 91.7, fmv: 46770,   attr_loss: 4290,   parent_accounts: ["El Corte Ingles", "PC Componentes"] },
  { country: "UK",          region: "EMEA",  basco_score: 76.5, fmv: 710000,  attr_loss: 145000, parent_accounts: ["Currys PLC", "Argos"] },
  { country: "India",       region: "APJ",   basco_score: 91.8, fmv: 880000,  attr_loss: 25500,  parent_accounts: ["Reliance Digital", "Croma"] },
  { country: "Japan",       region: "APJ",   basco_score: 88.2, fmv: 590000,  attr_loss: 115000, parent_accounts: ["Yodobashi Camera", "Bic Camera"] },
  { country: "UAE",         region: "EMEA",  basco_score: 72.4, fmv: 180000,  attr_loss: 42000,  parent_accounts: ["Sharaf DG", "Virgin Megastore"] },
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
      label: "Needs Attention (< 80%)",
    };
  }
  if (score <= 90) {
    return {
      fill: "#F59E0B",
      gradientId: "amberBubbleGrad",
      border: "#D97706",
      badgeBg: "bg-[#F59E0B]/10",
      badgeText: "text-[#F59E0B]",
      label: "Watch (80% – 90%)",
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

// ── Custom Tooltip with Parent Accounts listing ─────────────────────────────
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    const colorInfo = getScoreColor(item.basco_score);

    return (
      <div className="pointer-events-none select-none bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl p-4 shadow-2xl border border-slate-700/80 text-xs space-y-2.5 min-w-[250px]">
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

        {/* Parent Accounts in this market */}
        {item.parent_accounts && item.parent_accounts.length > 0 && (
          <div className="pt-2 border-t border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Parent Retailers:
            </span>
            <div className="flex flex-wrap gap-1">
              {item.parent_accounts.map((acc: string) => (
                <span
                  key={acc}
                  className="bg-slate-800/90 text-slate-200 border border-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-md"
                >
                  {acc}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function MarketMaturityPage() {
  const [selectedQuarter, setSelectedQuarter] = useState<string>("All Quarters");
  const [isQuarterOpen, setIsQuarterOpen] = useState(false);
  const quarterRef = useRef<HTMLDivElement>(null);

  // ── Account / Market View Mode Toggle & Quadrant Filter ───────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("markets");
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [regionFilter, setRegionFilter] = useState<string>("All");

  const { data: apiResponse } = useMarketMaturity(selectedQuarter);
  const { data: leagueResponse } = useLeagueTable(selectedQuarter);

  const availableQuarters = apiResponse?.filter_options?.quarters || [
    "All Quarters",
    "Q3 2026",
    "Q2 2026",
    "Q1 2026",
    "Q4 2025",
    "Q3 2025",
    "Q2 2025",
    "Q1 2025",
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

  // ── Process League Table into Grouped Parent Accounts ─────────────────────
  const parentAccountList: ParentAccountRow[] = useMemo(() => {
    const rawRows = (leagueResponse as any[]) || [];
    if (rawRows.length > 0) {
      const grouped: Record<string, {
        parent_account: string;
        country: string;
        region: string;
        weighted_score: number;
        total_jobs: number;
        fmv: number;
        attr_loss: number;
        topAccount: boolean;
      }> = {};

      rawRows.forEach((r: any) => {
        const parentName = (r.parent_account || r.retailer || "Unknown").trim();
        if (!parentName || parentName === "Unknown" || parentName === "Unmapped") return;

        const score = typeof r.basco === "number" ? r.basco : parseFloat(r.basco) || 0;
        const jobs = r.queries || r.artwork || 1;
        const fmv = typeof r.fmv === "number" ? r.fmv : parseInt(r.fmv, 10) || (jobs * 35000);
        const loss = typeof r.attr_loss === "number" ? r.attr_loss : parseInt(r.attr_loss, 10) || 0;
        const country = r.country || "Global";
        const region = r.region || "EMEA";
        const isTop = r.topAccount === "YES";

        if (!grouped[parentName]) {
          grouped[parentName] = {
            parent_account: parentName,
            country,
            region,
            weighted_score: score * jobs,
            total_jobs: jobs,
            fmv,
            attr_loss: loss,
            topAccount: isTop,
          };
        } else {
          grouped[parentName].weighted_score += score * jobs;
          grouped[parentName].total_jobs += jobs;
          grouped[parentName].fmv += fmv;
          grouped[parentName].attr_loss += loss;
          if (isTop) grouped[parentName].topAccount = true;
        }
      });

      return Object.values(grouped).map((item) => {
        const avgScore = item.total_jobs > 0 ? Math.round((item.weighted_score / item.total_jobs) * 10) / 10 : 0;
        const isHighScore = avgScore >= 90;
        const isModerateScore = avgScore >= 80 && avgScore < 90;
        const isLowScore = avgScore < 80;
        const isHighLoss = item.attr_loss > 100000;

        let quadrant: ParentAccountRow["quadrant"] = "Strong Performance";
        if (isLowScore && isHighLoss) {
          quadrant = "Priority Action";
        } else if ((isModerateScore || isHighScore) && isHighLoss) {
          quadrant = "High-Value Opportunity";
        } else if (isLowScore && !isHighLoss) {
          quadrant = "Build Momentum";
        } else {
          quadrant = "Strong Performance";
        }

        return {
          parent_account: item.parent_account,
          country: item.country,
          region: item.region,
          basco_score: avgScore,
          total_jobs: item.total_jobs,
          fmv: item.fmv,
          attr_loss: item.attr_loss,
          quadrant,
          topAccount: item.topAccount,
        };
      });
    }

    return fallbackParentAccounts;
  }, [leagueResponse]);

  // ── Compute Country Aggregates based on live backend data ────────────────────
  const currentFmvData = useMemo(() => {
    const rawData = apiResponse?.data;
    if (rawData && rawData.length > 0) {
      return rawData.map((r) => {
        // Find parent accounts belonging to this country
        const accountsInCountry = parentAccountList
          .filter((a) => a.country.toLowerCase() === r.country.toLowerCase())
          .map((a) => a.parent_account);

        return {
          country: r.country,
          region: r.region,
          basco_score: r.avg_basco_score,
          total_jobs: r.total_jobs || 1,
          fmv: r.fmv ?? (r.total_jobs * 35000),
          attr_loss: r.attr_loss ?? Math.round((r.fmv ?? (r.total_jobs * 35000)) * ((100 - r.avg_basco_score) / 100) * 0.22),
          parent_accounts: accountsInCountry.length > 0 ? accountsInCountry : undefined,
        };
      });
    }

    return initialFmvData;
  }, [apiResponse, parentAccountList]);

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

  // Dynamic Quadrant Breakdown with Country & Account Lists
  const quadrantStats = useMemo(() => {
    const criticalCountries: string[] = [];
    const highRiskCountries: string[] = [];
    const emergingCountries: string[] = [];
    const healthyCountries: string[] = [];

    currentDataset.forEach((d) => {
      const isHighScore = d.basco_score >= 90;
      const isModerateScore = d.basco_score >= 80 && d.basco_score < 90;
      const isLowScore = d.basco_score < 80;
      const isHighLoss = d.attr_loss > 100000;

      if (isLowScore && isHighLoss) {
        criticalCountries.push(d.country);
      } else if ((isModerateScore || isHighScore) && isHighLoss) {
        highRiskCountries.push(d.country);
      } else if (isLowScore && !isHighLoss) {
        emergingCountries.push(d.country);
      } else {
        healthyCountries.push(d.country);
      }
    });

    const criticalAccounts = parentAccountList.filter((a) => a.quadrant === "Priority Action").map((a) => a.parent_account);
    const highRiskAccounts = parentAccountList.filter((a) => a.quadrant === "High-Value Opportunity").map((a) => a.parent_account);
    const emergingAccounts = parentAccountList.filter((a) => a.quadrant === "Build Momentum").map((a) => a.parent_account);
    const healthyAccounts = parentAccountList.filter((a) => a.quadrant === "Strong Performance").map((a) => a.parent_account);

    return {
      criticalCountries,
      highRiskCountries,
      emergingCountries,
      healthyCountries,
      criticalAccounts,
      highRiskAccounts,
      emergingAccounts,
      healthyAccounts,
    };
  }, [currentDataset, parentAccountList]);

  // ── Filtered Parent Accounts for the Drilldown Table ───────────────────────
  const filteredAccounts = useMemo(() => {
    return parentAccountList.filter((acc) => {
      const matchesQuadrant = selectedQuadrant === "ALL" || acc.quadrant === selectedQuadrant;
      const matchesRegion = regionFilter === "All" || acc.region.toUpperCase() === regionFilter.toUpperCase();
      const matchesSearch =
        !searchQuery.trim() ||
        acc.parent_account.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.country.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesQuadrant && matchesRegion && matchesSearch;
    });
  }, [parentAccountList, selectedQuadrant, regionFilter, searchQuery]);

  const footNote = useMemo(() => {
    return `FMV data sourced from Intel POP records. ${currentDataset.length} countries and ${parentAccountList.length} parent accounts represented for ${selectedQuarter}.`;
  }, [currentDataset.length, parentAccountList.length, selectedQuarter]);

  return (
    <div className="space-y-4 pb-6">
      {/* ── Page Header & Top Telemetry Summary + Quarter Filter ─────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-[#111827] tracking-tight">
            Market Maturity Model
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            See where retail execution is strongest, where brand value is at risk, and which markets need attention.
          </p>
        </div>

        {/* Top Summary Telemetry Chips & Quarter Filter Dropdown */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-white/95 border border-[#E5E7EB] rounded-xl px-3.5 py-1.5 shadow-2xs">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Markets Monitored</span>
            <span className="text-base font-black text-[#111827]">{currentDataset.length}</span>
          </div>
          <div className="bg-white/95 border border-[#E5E7EB] rounded-xl px-3.5 py-1.5 shadow-2xs">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Parent Accounts</span>
            <span className="text-base font-black text-[#0D9488]">{parentAccountList.length}</span>
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
        {/* Sub-header with Score Legend Badges & Perspective Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
          <div>
            <span className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
              Market Performance &amp; Opportunity Map
            </span>
            <span className="text-[11px] text-[#6B7280] font-medium">
              Bubble size represents market value (FMV)
            </span>
          </div>

          {/* View Mode Toggle: Markets vs Parent Accounts */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex items-center">
              <button
                type="button"
                onClick={() => setViewMode("markets")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "markets"
                    ? "bg-white text-[#111827] shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                🌍 Markets (Countries)
              </button>
              <button
                type="button"
                onClick={() => setViewMode("accounts")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "accounts"
                    ? "bg-[#1E429F] text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                🏢 Parent Accounts ({parentAccountList.length})
              </button>
            </div>

            {/* Score Legend Badges */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 font-bold px-2 py-0.5 rounded-lg text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                <span>&gt; 90% Healthy</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/25 font-bold px-2 py-0.5 rounded-lg text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
                <span>80% – 90% Watch</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/25 font-bold px-2 py-0.5 rounded-lg text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></span>
                <span>&lt; 80% Needs Attention</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Scatter/Bubble Chart Container ─────────────────────────── */}
        <div className="relative mt-2">
          {/* Recharts Scatter Chart - Foreground Layer (z-10) */}
          <div className="relative z-10 h-[420px] w-full">
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
                  content={<CustomTooltip />}
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

                {/* Watch Boundary Line at 80% */}
                <ReferenceLine
                  x={80}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "Watch (80%)",
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

        {/* ── 4-Quadrant Strategic Summary Cards (Toggleable: Markets vs Parent Accounts) ── */}
        <div className="mt-3 pt-3 border-t border-[#E5E7EB] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Card 1: Priority Action */}
          <div
            onClick={() => setSelectedQuadrant(selectedQuadrant === "Priority Action" ? "ALL" : "Priority Action")}
            className={`cursor-pointer transition-all rounded-xl p-3 flex flex-col justify-between border ${
              selectedQuadrant === "Priority Action"
                ? "bg-[#EF4444]/15 border-[#EF4444] ring-2 ring-[#EF4444]/30 shadow-md"
                : "bg-[#EF4444]/5 border-[#EF4444]/20 hover:border-[#EF4444]/40 hover:bg-[#EF4444]/10"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-extrabold text-[#EF4444] flex items-center gap-1.5">
                  <span>🚨</span> Priority Action
                </span>
                <span className="text-xs font-black bg-[#EF4444]/15 text-[#EF4444] px-2 py-0.5 rounded-md">
                  {viewMode === "markets" ? quadrantStats.criticalCountries.length : quadrantStats.criticalAccounts.length}
                </span>
              </div>
              <span className="text-[10px] text-[#6B7280] font-medium mt-1 block">
                Score &lt; 80% &bull; Loss &gt; $100K
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1 max-h-[48px] overflow-y-auto">
              {viewMode === "markets"
                ? quadrantStats.criticalCountries.map((c) => (
                    <span key={c} className="text-[9px] font-bold bg-[#EF4444]/10 text-[#EF4444] px-1.5 py-0.5 rounded border border-[#EF4444]/20">
                      {c}
                    </span>
                  ))
                : quadrantStats.criticalAccounts.map((a) => (
                    <span key={a} className="text-[9px] font-bold bg-[#EF4444]/15 text-[#B91C1C] px-1.5 py-0.5 rounded border border-[#EF4444]/30">
                      {a}
                    </span>
                  ))}
            </div>
          </div>

          {/* Card 2: High-Value Opportunity */}
          <div
            onClick={() => setSelectedQuadrant(selectedQuadrant === "High-Value Opportunity" ? "ALL" : "High-Value Opportunity")}
            className={`cursor-pointer transition-all rounded-xl p-3 flex flex-col justify-between border ${
              selectedQuadrant === "High-Value Opportunity"
                ? "bg-[#F59E0B]/15 border-[#D97706] ring-2 ring-[#F59E0B]/30 shadow-md"
                : "bg-[#F59E0B]/5 border-[#F59E0B]/20 hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/10"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-extrabold text-[#D97706] flex items-center gap-1.5">
                  <span>⚠️</span> High-Value Opportunity
                </span>
                <span className="text-xs font-black bg-[#F59E0B]/15 text-[#D97706] px-2 py-0.5 rounded-md">
                  {viewMode === "markets" ? quadrantStats.highRiskCountries.length : quadrantStats.highRiskAccounts.length}
                </span>
              </div>
              <span className="text-[10px] text-[#6B7280] font-medium mt-1 block">
                Score &ge; 80% &bull; Loss &gt; $100K
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1 max-h-[48px] overflow-y-auto">
              {viewMode === "markets"
                ? quadrantStats.highRiskCountries.map((c) => (
                    <span key={c} className="text-[9px] font-bold bg-[#F59E0B]/10 text-[#D97706] px-1.5 py-0.5 rounded border border-[#F59E0B]/20">
                      {c}
                    </span>
                  ))
                : quadrantStats.highRiskAccounts.map((a) => (
                    <span key={a} className="text-[9px] font-bold bg-[#F59E0B]/15 text-[#B45309] px-1.5 py-0.5 rounded border border-[#F59E0B]/30">
                      {a}
                    </span>
                  ))}
            </div>
          </div>

          {/* Card 3: Build Momentum */}
          <div
            onClick={() => setSelectedQuadrant(selectedQuadrant === "Build Momentum" ? "ALL" : "Build Momentum")}
            className={`cursor-pointer transition-all rounded-xl p-3 flex flex-col justify-between border ${
              selectedQuadrant === "Build Momentum"
                ? "bg-slate-200 border-slate-400 ring-2 ring-slate-300 shadow-md"
                : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                  <span>🌱</span> Build Momentum
                </span>
                <span className="text-xs font-black bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                  {viewMode === "markets" ? quadrantStats.emergingCountries.length : quadrantStats.emergingAccounts.length}
                </span>
              </div>
              <span className="text-[10px] text-[#6B7280] font-medium mt-1 block">
                Score &lt; 80% &bull; Loss &le; $100K
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1 max-h-[48px] overflow-y-auto">
              {viewMode === "markets"
                ? quadrantStats.emergingCountries.map((c) => (
                    <span key={c} className="text-[9px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300">
                      {c}
                    </span>
                  ))
                : quadrantStats.emergingAccounts.map((a) => (
                    <span key={a} className="text-[9px] font-bold bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded border border-slate-300">
                      {a}
                    </span>
                  ))}
            </div>
          </div>

          {/* Card 4: Strong Performance */}
          <div
            onClick={() => setSelectedQuadrant(selectedQuadrant === "Strong Performance" ? "ALL" : "Strong Performance")}
            className={`cursor-pointer transition-all rounded-xl p-3 flex flex-col justify-between border ${
              selectedQuadrant === "Strong Performance"
                ? "bg-[#10B981]/15 border-[#059669] ring-2 ring-[#10B981]/30 shadow-md"
                : "bg-[#10B981]/5 border-[#10B981]/20 hover:border-[#10B981]/40 hover:bg-[#10B981]/10"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-extrabold text-[#059669] flex items-center gap-1.5">
                  <span>✨</span> Strong Performance
                </span>
                <span className="text-xs font-black bg-[#10B981]/15 text-[#059669] px-2 py-0.5 rounded-md">
                  {viewMode === "markets" ? quadrantStats.healthyCountries.length : quadrantStats.healthyAccounts.length}
                </span>
              </div>
              <span className="text-[10px] text-[#6B7280] font-medium mt-1 block">
                Score &ge; 90% &bull; Loss &le; $100K
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1 max-h-[48px] overflow-y-auto">
              {viewMode === "markets" ? (
                <>
                  {quadrantStats.healthyCountries.slice(0, 3).map((c) => (
                    <span key={c} className="text-[9px] font-bold bg-[#10B981]/10 text-[#059669] px-1.5 py-0.5 rounded border border-[#10B981]/20">
                      {c}
                    </span>
                  ))}
                  {quadrantStats.healthyCountries.length > 3 && (
                    <span className="text-[9px] font-bold text-[#6B7280] px-1 py-0.5">
                      +{quadrantStats.healthyCountries.length - 3} more
                    </span>
                  )}
                </>
              ) : (
                <>
                  {quadrantStats.healthyAccounts.slice(0, 3).map((a) => (
                    <span key={a} className="text-[9px] font-bold bg-[#10B981]/15 text-[#047857] px-1.5 py-0.5 rounded border border-[#10B981]/30">
                      {a}
                    </span>
                  ))}
                  {quadrantStats.healthyAccounts.length > 3 && (
                    <span className="text-[9px] font-bold text-[#6B7280] px-1 py-0.5">
                      +{quadrantStats.healthyAccounts.length - 3} more
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom Footnote ───────────────────────────────────────── */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 gap-1.5">
          <span>{footNote}</span>
          <span className="font-semibold text-slate-500">
            Target BASCO: &gt; 90% Healthy • 80%–90% Watch • &lt; 80% Needs Attention • Period: {selectedQuarter}
          </span>
        </div>
      </div>

      {/* ── Granular Parent Account Performance Breakdown Section ───────── */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-black text-[#111827] tracking-tight">
                Parent Account Execution &amp; Risk Explorer
              </h2>
              <span className="bg-[#1E429F]/10 text-[#1E429F] text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {filteredAccounts.length} Parent Accounts
              </span>
            </div>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              Granular compliance execution, FMV exposure, and attribution loss mapped at parent retailer level.
            </p>
          </div>

          {/* Search and Region Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search parent account or country..."
                className="w-56 bg-slate-50 border border-[#E5E7EB] focus:border-[#1E429F] focus:bg-white rounded-xl px-3 py-1.5 text-xs text-[#111827] placeholder:text-slate-400 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Region Filter */}
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="bg-slate-50 border border-[#E5E7EB] text-xs font-semibold rounded-xl px-3 py-1.5 text-[#111827] outline-none cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <option value="All">All Regions</option>
              <option value="APJ">APJ</option>
              <option value="EMEA">EMEA</option>
              <option value="LATAM">LATAM</option>
              <option value="US">US</option>
              <option value="CANADA">CANADA</option>
            </select>
          </div>
        </div>

        {/* Quadrant Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1">
          {(["ALL", "Priority Action", "High-Value Opportunity", "Build Momentum", "Strong Performance"] as QuadrantFilter[]).map((q) => {
            const isActive = selectedQuadrant === q;
            const count = q === "ALL" ? parentAccountList.length : parentAccountList.filter((a) => a.quadrant === q).length;

            return (
              <button
                key={q}
                type="button"
                onClick={() => setSelectedQuadrant(q)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isActive
                    ? "bg-[#1E429F] text-white border-[#1E429F] shadow-2xs"
                    : "bg-slate-50 text-slate-600 border-[#E5E7EB] hover:bg-slate-100"
                }`}
              >
                <span>{q === "ALL" ? "All Quadrants" : q}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Data Table ───────────────────────────────────────────────── */}
        <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider border-b border-[#E5E7EB]">
              <tr>
                <th className="py-2.5 px-3.5">Parent Account</th>
                <th className="py-2.5 px-3">Primary Market &amp; Region</th>
                <th className="py-2.5 px-3">Quadrant Status</th>
                <th className="py-2.5 px-3 text-right">BASCO Score</th>
                <th className="py-2.5 px-3 text-right">Total FMV</th>
                <th className="py-2.5 px-3 text-right">Attribution Loss</th>
                <th className="py-2.5 px-3 text-right">Creatives</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    No parent accounts found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc, idx) => {
                  const scoreColor = getScoreColor(acc.basco_score);

                  let quadrantBadge = (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#10B981]/10 text-[#059669] border border-[#10B981]/25">
                      <span>✨</span> Strong Performance
                    </span>
                  );
                  if (acc.quadrant === "Priority Action") {
                    quadrantBadge = (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/25">
                        <span>🚨</span> Priority Action
                      </span>
                    );
                  } else if (acc.quadrant === "High-Value Opportunity") {
                    quadrantBadge = (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F59E0B]/10 text-[#D97706] border border-[#F59E0B]/25">
                        <span>⚠️</span> High-Value Opportunity
                      </span>
                    );
                  } else if (acc.quadrant === "Build Momentum") {
                    quadrantBadge = (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300">
                        <span>🌱</span> Build Momentum
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={`${acc.parent_account}-${idx}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Parent Account Name */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#111827]">
                            {acc.parent_account}
                          </span>
                          {acc.topAccount && (
                            <span className="bg-[#1E429F]/10 text-[#1E429F] border border-[#1E429F]/20 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md">
                              TOP
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Market & Region */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">{acc.country}</span>
                          <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.2 rounded">
                            {acc.region}
                          </span>
                        </div>
                      </td>

                      {/* Quadrant Status */}
                      <td className="py-2.5 px-3">
                        {quadrantBadge}
                      </td>

                      {/* BASCO Score */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(acc.basco_score, 100)}%`,
                                backgroundColor: scoreColor.fill,
                              }}
                            />
                          </div>
                          <span className="font-extrabold text-[#111827]">
                            {Number(acc.basco_score).toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* Total FMV */}
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                        ${acc.fmv.toLocaleString()}
                      </td>

                      {/* Attribution Loss */}
                      <td className="py-2.5 px-3 text-right font-bold text-rose-500">
                        {acc.attr_loss > 0 ? `-$${acc.attr_loss.toLocaleString()}` : "$0"}
                      </td>

                      {/* Creatives */}
                      <td className="py-2.5 px-3 text-right text-slate-500 font-semibold">
                        {acc.total_jobs}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
