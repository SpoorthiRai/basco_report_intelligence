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
  helpdesk_queries?: number;
  helpdesk_artworks?: number;
  helpdesk_usage?: "Yes" | "No" | string;
}

type ViewMode = "markets" | "accounts";
type QuadrantFilter = "ALL" | "Priority Action" | "High-Value Opportunity" | "Build Momentum" | "Strong Performance";
type MaturityQuadrant = Exclude<QuadrantFilter, "ALL">;

const QUADRANT_LABELS: Record<MaturityQuadrant, string> = {
  "Priority Action": "Action Needed",
  "High-Value Opportunity": "Watch",
  "Build Momentum": "Lower Priority",
  "Strong Performance": "Strong",
};

const QUADRANT_RULES: Record<MaturityQuadrant, string> = {
  "Strong Performance": "Score ≥ 90% • Loss < Benchmark",
  "High-Value Opportunity": "Score ≥ 85% • Loss ≥ Benchmark",
  "Build Momentum": "Score > 76% • Loss < Benchmark",
  "Priority Action": "Score < 76% • Loss ≥ Benchmark",
};

function classifyMaturity(score: number, attrLoss: number, benchmark: number): MaturityQuadrant {
  const highLoss = Number(attrLoss || 0) >= Number(benchmark || 0);
  if (!highLoss) {
    if (score >= 90) return "Strong Performance";
    return "Build Momentum";
  }
  if (score >= 85) return "High-Value Opportunity";
  return "Priority Action";
}

function medianLoss(values: number[]): number {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function fmtCompactUsd(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "$0";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    const millions = abs / 1_000_000;
    const formatted = millions >= 10 ? String(Math.round(millions)) : millions.toFixed(1).replace(/\.0$/, "");
    return `${sign}$${formatted}M`;
  }
  if (abs >= 1000) return `${sign}$${Math.round(abs / 1000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

function getQuadrantColor(quadrant: MaturityQuadrant): {
  fill: string;
  gradientId: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  label: string;
} {
  if (quadrant === "Priority Action") {
    return {
      fill: "#EF4444",
      gradientId: "redBubbleGrad",
      border: "#B91C1C",
      badgeBg: "bg-[#EF4444]/10",
      badgeText: "text-[#EF4444]",
      label: QUADRANT_LABELS[quadrant],
    };
  }
  if (quadrant === "High-Value Opportunity") {
    return {
      fill: "#F59E0B",
      gradientId: "amberBubbleGrad",
      border: "#D97706",
      badgeBg: "bg-[#F59E0B]/10",
      badgeText: "text-[#F59E0B]",
      label: QUADRANT_LABELS[quadrant],
    };
  }
  if (quadrant === "Build Momentum") {
    return {
      fill: "#64748B",
      gradientId: "slateBubbleGrad",
      border: "#475569",
      badgeBg: "bg-slate-200",
      badgeText: "text-slate-700",
      label: QUADRANT_LABELS[quadrant],
    };
  }
  return {
    fill: "#10B981",
    gradientId: "greenBubbleGrad",
    border: "#059669",
    badgeBg: "bg-[#10B981]/10",
    badgeText: "text-[#10B981]",
    label: QUADRANT_LABELS[quadrant],
  };
}

// ── Custom Dot for Bubble Chart with Smart Collision-Free Labels ────────────
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;

  const { country, basco_score, radius, attr_loss, attribution_loss_threshold } = payload;
  const colorInfo = getQuadrantColor(
    classifyMaturity(basco_score, attr_loss, attribution_loss_threshold ?? 0)
  );

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
    const colorInfo = getQuadrantColor(
      classifyMaturity(item.basco_score, item.attr_loss, item.attribution_loss_threshold ?? 0)
    );

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
            <span className="text-slate-400">Status:</span>
            <span className={`font-extrabold text-sm ${colorInfo.badgeText.replace("text-", "text-")}`} style={{ color: colorInfo.fill }}>
              {colorInfo.label}
            </span>
          </div>

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

          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-400">Attribution Loss Threshold:</span>
            <span className="font-semibold text-slate-200">
              {fmtCompactUsd(Number(item.attribution_loss_threshold ?? 0))}
            </span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-400">Loss vs Threshold %:</span>
            <span className={`font-extrabold ${Number(item.loss_vs_threshold_pct ?? 0) > 100 ? "text-rose-400" : "text-emerald-400"}`}>
              {item.loss_vs_threshold_pct == null ? "—" : `${Number(item.loss_vs_threshold_pct).toFixed(1)}%`}
            </span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-400">Helpdesk Queries:</span>
            <span className="font-semibold text-white">
              {Number(item.helpdesk_queries ?? 0).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-400">No. of Creatives:</span>
            <span className="font-semibold text-white">
              {Number(item.total_jobs ?? 0).toLocaleString()}
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
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [isQuarterOpen, setIsQuarterOpen] = useState(false);
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const quarterRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);

  // ── Account / Market View Mode Toggle & Quadrant Filter ───────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("markets");
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [countryFilter, setCountryFilter] = useState<string>("All Countries");

  const { data: apiResponse } = useMarketMaturity(selectedQuarter, selectedRegion);
  const { data: leagueResponse } = useLeagueTable(selectedQuarter, selectedRegion);

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

  const availableRegions = apiResponse?.filter_options?.regions || leagueResponse?.filter_options?.regions || ["All"];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (quarterRef.current && !quarterRef.current.contains(e.target as Node)) {
        setIsQuarterOpen(false);
      }
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) {
        setIsRegionOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Parent accounts from backend ──────────────────────────────────────────
  const parentAccountList: ParentAccountRow[] = useMemo(() => {
    const raw = (leagueResponse?.parent_accounts || []) as unknown as ParentAccountRow[];
    const benchmark = medianLoss(raw.map((a) => Number(a.attr_loss || 0)));
    return raw.map((a) => ({
      ...a,
      quadrant: classifyMaturity(Number(a.basco_score || 0), Number(a.attr_loss || 0), benchmark),
    }));
  }, [leagueResponse]);

  // ── Compute Country Aggregates based on live backend data ────────────────────
  const currentFmvData = useMemo(() => {
    const rawData = apiResponse?.data;
    if (rawData && rawData.length > 0) {
      return rawData.map((r) => {
        const countryKey = (r.country || "").toLowerCase();
        const accountsInCountry = Array.from(
          new Set(
            (leagueResponse?.data || [])
              .filter((row: { country?: string }) => (row.country || "").toLowerCase() === countryKey)
              .map((row: { parent_account?: string; retailer?: string }) => row.parent_account || row.retailer)
              .filter(Boolean) as string[]
          )
        );

        return {
          country: r.country,
          region: r.region,
          basco_score: r.avg_basco_score,
          total_jobs: r.total_jobs || 0,
          fmv: r.fmv ?? 0,
          attr_loss: r.attr_loss ?? 0,
          helpdesk_queries: Number(r.helpdesk_queries ?? 0),
          helpdesk_artworks: Number(r.helpdesk_artworks ?? 0),
          parent_accounts: accountsInCountry.length > 0 ? accountsInCountry : undefined,
        };
      });
    }

    return [];
  }, [apiResponse, leagueResponse]);

  const attributionLossThreshold = useMemo(
    () => medianLoss(currentFmvData.map((d) => d.attr_loss)),
    [currentFmvData]
  );

  const attributionLossThresholdLabel = useMemo(
    () => fmtCompactUsd(attributionLossThreshold),
    [attributionLossThreshold]
  );

  // ── Calculate dynamic bubbles and radii ───────────────────────────────────────
  const currentDataset = useMemo(() => {
    const maxVal = Math.max(...currentFmvData.map((d) => d.fmv), 1);
    return currentFmvData.map((d) => {
      const threshold = attributionLossThreshold;
      const lossVsPct = threshold > 0 ? (d.attr_loss / threshold) * 100 : null;
      return {
        ...d,
        x: d.basco_score,
        y: d.attr_loss,
        radius: Math.max(7, Math.min(26, Math.round((d.fmv / maxVal) * 26))),
        attribution_loss_threshold: threshold,
        loss_vs_threshold_pct: lossVsPct,
      };
    });
  }, [currentFmvData, attributionLossThreshold]);

  const avgCohortScore = apiResponse?.kpis?.avg_score ?? 0;

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
      const quadrant = classifyMaturity(d.basco_score, d.attr_loss, attributionLossThreshold);
      if (quadrant === "Priority Action") criticalCountries.push(d.country);
      else if (quadrant === "High-Value Opportunity") highRiskCountries.push(d.country);
      else if (quadrant === "Build Momentum") emergingCountries.push(d.country);
      else healthyCountries.push(d.country);
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
  }, [currentDataset, parentAccountList, attributionLossThreshold]);

  const availableCountries = useMemo(() => {
    const countries = Array.from(
      new Set(parentAccountList.map((a) => a.country).filter((c) => c && c !== "Unknown"))
    ).sort();
    return ["All Countries", ...countries];
  }, [parentAccountList]);

  // ── Filtered Parent Accounts for the Drilldown Table ───────────────────────
  const filteredAccounts = useMemo(() => {
    return parentAccountList.filter((acc) => {
      const matchesQuadrant = selectedQuadrant === "ALL" || acc.quadrant === selectedQuadrant;
      const matchesCountry = countryFilter === "All Countries" || acc.country === countryFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        acc.parent_account.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.country.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesQuadrant && matchesCountry && matchesSearch;
    });
  }, [parentAccountList, selectedQuadrant, countryFilter, searchQuery]);

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
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Country</span>
            <span className="text-base font-black text-[#111827]">{currentDataset.length}</span>
          </div>
          <div className="bg-white/95 border border-[#E5E7EB] rounded-xl px-3.5 py-1.5 shadow-2xs">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Retailers</span>
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
              onClick={() => {
                setIsQuarterOpen((v) => !v);
                setIsRegionOpen(false);
              }}
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

          {/* Region Selector Dropdown */}
          <div ref={regionRef} className="relative flex items-center">
            <button
              type="button"
              onClick={() => {
                setIsRegionOpen((v) => !v);
                setIsQuarterOpen(false);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs border ${
                selectedRegion !== "All"
                  ? "bg-[#1E429F] text-white border-[#1E429F]"
                  : "bg-white text-[#111827] border-[#E5E7EB] hover:border-[#CBD5E1] hover:bg-slate-50"
              } cursor-pointer`}
            >
              <span className="text-[#6B7280] font-medium">Region:</span>
              <span>{selectedRegion === "All" ? "All Regions" : selectedRegion}</span>
              <span className="text-[10px] transform transition-transform" style={{ transform: isRegionOpen ? "rotate(180deg)" : "none" }}>
                ▼
              </span>
            </button>

            {isRegionOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-[#E5E7EB] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider border-b border-[#E5E7EB]">
                  Select Region
                </div>
                {availableRegions.map((option) => {
                  const isSelected = selectedRegion === option;
                  return (
                    <button
                      key={option}
                      onClick={() => {
                        setSelectedRegion(option);
                        setCountryFilter("All Countries");
                        setIsRegionOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-[#1E429F]/10 text-[#1E429F]"
                          : "text-[#111827] hover:bg-slate-100/80 cursor-pointer"
                      }`}
                    >
                      <span>{option === "All" ? "All Regions" : option}</span>
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
              Bubble size represents market value (FMV). Horizontal line is the median attribution loss benchmark.
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
          </div>
        </div>

        {/* ── Scatter/Bubble Chart Container ─────────────────────────── */}
        <div className="relative mt-2">
          {/* Recharts Scatter Chart - Foreground Layer (z-10) */}
          <div className="relative z-10 h-[420px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 28, right: 16, bottom: 25, left: 15 }}>
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
                  <linearGradient id="slateBubbleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94A3B8" />
                    <stop offset="100%" stopColor="#64748B" />
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
                  ticks={[40, 50, 60, 70, 76, 85, 90, 100]}
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

                {/* Target Line at 90% (Strong) */}
                <ReferenceLine
                  x={90}
                  stroke="#1E429F"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: "Strong (90%)",
                    position: "top",
                    fill: "#1E429F",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />

                {/* Watch boundary at 85% */}
                <ReferenceLine
                  x={85}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "Watch (85%)",
                    position: "top",
                    fill: "#D97706",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />

                {/* Action / Lower Priority boundary at 76% */}
                <ReferenceLine
                  x={76}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "Action (76%)",
                    position: "top",
                    fill: "#B91C1C",
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

                {attributionLossThreshold > 0 && (
                  <ReferenceLine
                    y={attributionLossThreshold}
                    stroke="#64748B"
                    strokeDasharray="5 4"
                    strokeWidth={1.75}
                    ifOverflow="extendDomain"
                    label={({ viewBox }) => {
                      if (!viewBox || !("y" in viewBox) || !("x" in viewBox)) return null;
                      const lineY = Number(viewBox.y);
                      const lineX = Number(viewBox.x);
                      const text = `Attribution Loss Threshold (${attributionLossThresholdLabel})`;
                      const width = Math.min(280, 16 + text.length * 6.15);
                      const placeBelow = lineY < 32;
                      const labelY = placeBelow ? lineY + 6 : lineY - 20;
                      return (
                        <g pointerEvents="none">
                          <rect
                            x={lineX + 8}
                            y={labelY}
                            width={width}
                            height={16}
                            rx={4}
                            fill="#FFFFFF"
                            fillOpacity={0.96}
                            stroke="#CBD5E1"
                            strokeWidth={1}
                          />
                          <text
                            x={lineX + 16}
                            y={labelY + 12}
                            fill="#334155"
                            fontSize={10}
                            fontWeight={700}
                          >
                            {text}
                          </text>
                        </g>
                      );
                    }}
                  />
                )}
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
                  <span>🚨</span> {QUADRANT_LABELS["Priority Action"]}
                </span>
                <span className="text-xs font-black bg-[#EF4444]/15 text-[#EF4444] px-2 py-0.5 rounded-md">
                  {viewMode === "markets" ? quadrantStats.criticalCountries.length : quadrantStats.criticalAccounts.length}
                </span>
              </div>
              <span className="text-[10px] text-[#6B7280] font-medium mt-1 block">
                {QUADRANT_RULES["Priority Action"]}
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
                  <span>⚠️</span> {QUADRANT_LABELS["High-Value Opportunity"]}
                </span>
                <span className="text-xs font-black bg-[#F59E0B]/15 text-[#D97706] px-2 py-0.5 rounded-md">
                  {viewMode === "markets" ? quadrantStats.highRiskCountries.length : quadrantStats.highRiskAccounts.length}
                </span>
              </div>
              <span className="text-[10px] text-[#6B7280] font-medium mt-1 block">
                {QUADRANT_RULES["High-Value Opportunity"]}
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
                  <span>🌱</span> {QUADRANT_LABELS["Build Momentum"]}
                </span>
                <span className="text-xs font-black bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                  {viewMode === "markets" ? quadrantStats.emergingCountries.length : quadrantStats.emergingAccounts.length}
                </span>
              </div>
              <span className="text-[10px] text-[#6B7280] font-medium mt-1 block">
                {QUADRANT_RULES["Build Momentum"]}
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
                  <span>✨</span> {QUADRANT_LABELS["Strong Performance"]}
                </span>
                <span className="text-xs font-black bg-[#10B981]/15 text-[#059669] px-2 py-0.5 rounded-md">
                  {viewMode === "markets" ? quadrantStats.healthyCountries.length : quadrantStats.healthyAccounts.length}
                </span>
              </div>
              <span className="text-[10px] text-[#6B7280] font-medium mt-1 block">
                {QUADRANT_RULES["Strong Performance"]}
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
            Target BASCO: Strong ≥ 90% & Loss &lt; Benchmark • Watch ≥ 85% & Loss ≥ Benchmark • Lower Priority &gt; 76% & Loss &lt; Benchmark • Action Needed &lt; 76% & Loss ≥ Benchmark • Period: {selectedQuarter}
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

          {/* Search and Country Filters */}
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

            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="bg-slate-50 border border-[#E5E7EB] text-xs font-semibold rounded-xl px-3 py-1.5 text-[#111827] outline-none cursor-pointer hover:bg-slate-100 transition-colors"
            >
              {availableCountries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
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
                <span>{q === "ALL" ? "All Quadrants" : QUADRANT_LABELS[q]}</span>
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
                <th className="py-2.5 px-3 text-right">Helpdesk Queries</th>
                <th className="py-2.5 px-3 text-right">Helpdesk Artworks</th>
                <th className="py-2.5 px-3 text-center">Helpdesk Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 font-medium">
                    No parent accounts found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc, idx) => {
                  const scoreColor = getQuadrantColor(acc.quadrant);

                  let quadrantBadge = (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#10B981]/10 text-[#059669] border border-[#10B981]/25">
                      <span>✨</span> {QUADRANT_LABELS["Strong Performance"]}
                    </span>
                  );
                  if (acc.quadrant === "Priority Action") {
                    quadrantBadge = (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/25">
                        <span>🚨</span> {QUADRANT_LABELS["Priority Action"]}
                      </span>
                    );
                  } else if (acc.quadrant === "High-Value Opportunity") {
                    quadrantBadge = (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F59E0B]/10 text-[#D97706] border border-[#F59E0B]/25">
                        <span>⚠️</span> {QUADRANT_LABELS["High-Value Opportunity"]}
                      </span>
                    );
                  } else if (acc.quadrant === "Build Momentum") {
                    quadrantBadge = (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300">
                        <span>🌱</span> {QUADRANT_LABELS["Build Momentum"]}
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
                      <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">
                        {acc.helpdesk_queries ?? 0}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">
                        {acc.helpdesk_artworks ?? 0}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {acc.helpdesk_usage === "Yes" ? (
                          <span className="inline-flex text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#10B981]/10 text-[#059669] border border-[#10B981]/25">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                            No
                          </span>
                        )}
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
