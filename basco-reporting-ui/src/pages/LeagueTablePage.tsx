import { useState, useMemo, useEffect, useRef } from "react";
import api from "../api/client";
import EvidenceLocker from "./EvidenceLocker";

// ── Data Types ─────────────────────────────────────────────────────────────────
export interface RetailerRow {
  retailer: string;
  country: string;
  region: "APJ" | "EMEA" | "LATAM" | "CANADA" | "US" | "PRC";
  queries: number;
  artwork?: number;
  basco: number;
  violations: number;
  prev_basco: number | null;
  trend: "UP" | "DOWN" | "FLAT" | "NEW";
  fmv: number | null;
  attr_loss: number | null;
  quarter?: string;
  year?: number;
  period?: string;
  topAccount?: "YES" | "NO";
}

type SortKey = keyof RetailerRow;
type SortDir = "asc" | "desc";
type RegionFilter = "All" | "APJ" | "EMEA" | "LATAM" | "CANADA";

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtUSD(val: number): string {
  return "$" + val.toLocaleString("en-US");
}

function bascoBarColor(score: number): string {
  if (score > 90) return "#10B981";
  if (score >= 75) return "#F59E0B";
  return "#EF4444";
}

function regionPillClass(region: string): string {
  switch (region) {
    case "APJ":    return "bg-[#1E429F]/10 text-[#1E429F]";
    case "EMEA":   return "bg-[#0EA5E9]/10 text-[#0EA5E9]";
    case "LATAM":  return "bg-[#64748B]/10 text-[#64748B]";
    case "CANADA": return "bg-[#1E429F]/10 text-[#1E429F]";
    default:       return "bg-[#64748B]/10 text-[#64748B]";
  }
}

function TrendIcon({ trend }: { trend: RetailerRow["trend"] }) {
  if (trend === "UP")
    return <span style={{ color: "#10B981", fontSize: 16, fontWeight: 700 }}>↑</span>;
  if (trend === "DOWN")
    return <span style={{ color: "#EF4444", fontSize: 16, fontWeight: 700 }}>↓</span>;
  if (trend === "FLAT")
    return <span style={{ color: "#6B7280", fontSize: 16, fontWeight: 700 }}>→</span>;
  return (
    <span
      style={{
        display: "inline-block",
        backgroundColor: "#1E429F",
        color: "#fff",
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 6px",
        borderRadius: 999,
        letterSpacing: "0.05em",
        lineHeight: 1.4,
      }}
    >
      NEW
    </span>
  );
}

const FMV_TOOLTIP = "Fair Market Value (FMV) and Attribution data from Intel POP marketing warehouse.";

// ── KPI Chip Component ─────────────────────────────────────────────────────────
function KpiChip({
  label,
  value,
  accentColor,
}: {
  label: string;
  value: string;
  accentColor?: string;
}) {
  return (
    <div className="flex flex-col justify-between bg-white/95 rounded-2xl border border-[#E5E7EB] p-4 shadow-sm hover:shadow-md hover:border-[#1E429F]/30 transition-all min-w-[170px] flex-1">
      <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
        {label}
      </span>
      <span
        className="text-2xl font-black mt-1 tracking-tight"
        style={{ color: accentColor ?? "#111827" }}
      >
        {value}
      </span>
    </div>
  );
}


// ── Sort Indicator Component ───────────────────────────────────────────────────
function SortIndicator({
  col,
  active,
  dir,
}: {
  col: SortKey;
  active: SortKey;
  dir: SortDir;
}) {
  if (col !== active)
    return <span style={{ marginLeft: 4, opacity: 0.35, fontSize: 10 }}>⇅</span>;
  return (
    <span style={{ marginLeft: 4, color: "#0D9488", fontSize: 10 }}>
      {dir === "asc" ? "▲" : "▼"}
    </span>
  );
}

// ── Main Page Component ────────────────────────────────────────────────────────
export default function LeagueTablePage() {
  const [data, setData] = useState<RetailerRow[]>([]);
  const [availableQuarters, setAvailableQuarters] = useState<string[]>([
    "All Quarters",
    "Q3 2026",
    "Q2 2026",
    "Q1 2026",
  ]);
  const [availableCountries, setAvailableCountries] = useState<string[]>(["All Countries"]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedQuarter, setSelectedQuarter] = useState<string>("All Quarters");
  const [selectedCountry, setSelectedCountry] = useState<string>("All Countries");
  const [countrySearch, setCountrySearch] = useState<string>("");
  
  const [isQuarterOpen, setIsQuarterOpen] = useState(false);
  const [isCountryOpen, setIsCountryOpen] = useState(false);

  const quarterRef = useRef<HTMLDivElement>(null);
  const countryRef = useRef<HTMLDivElement>(null);

  const [search, setSearch]   = useState("");
  const [region, setRegion]   = useState<RegionFilter>("All");
  const [sortKey, setSortKey] = useState<SortKey>("basco");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  // Fetch 2026 Retailer Performance live data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api
      .get<{ data: RetailerRow[]; filter_options: { quarters: string[]; countries: string[]; regions: string[] } }>(
        "/api/reports/league-table/"
      )
      .then((res) => {
        if (!isMounted) return;
        const resData = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setData(resData);
        if (res.data?.filter_options?.quarters) {
          setAvailableQuarters(res.data.filter_options.quarters);
        }
        if (res.data?.filter_options?.countries) {
          setAvailableCountries(res.data.filter_options.countries);
        }
      })
      .catch((err) => {
        console.error("Failed to load retailer performance data", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (quarterRef.current && !quarterRef.current.contains(e.target as Node)) {
        setIsQuarterOpen(false);
      }
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setIsCountryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Transform Raw Data into Table Rows ─────────────────────────────
  const baseRows: RetailerRow[] = useMemo(() => {
    let sourceData = data;

    if (selectedQuarter !== "All Quarters") {
      sourceData = sourceData.filter((d) => d.period === selectedQuarter || d.quarter === selectedQuarter);
    }

    if (selectedCountry !== "All Countries") {
      sourceData = sourceData.filter((d) => d.country === selectedCountry);
    }

    return sourceData;
  }, [data, selectedQuarter, selectedCountry]);

  // Country search filter
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return availableCountries;
    return availableCountries.filter((c) =>
      c.toLowerCase().includes(countrySearch.toLowerCase())
    );
  }, [availableCountries, countrySearch]);

  // ── Filtered & Sorted Table Rows ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    return baseRows
      .filter((r) => {
        const matchesSearch =
          r.retailer.toLowerCase().includes(search.toLowerCase()) ||
          r.country.toLowerCase().includes(search.toLowerCase());
        const matchesRegion = region === "All" || r.region === region;
        return matchesSearch && matchesRegion;
      })
      .sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];

        if (valA === null || valA === undefined) valA = -Infinity as any;
        if (valB === null || valB === undefined) valB = -Infinity as any;

        if (typeof valA === "string" && typeof valB === "string") {
          return sortDir === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        return sortDir === "asc"
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      });
  }, [baseRows, search, region, sortKey, sortDir]);

  // ── Dynamic KPI Calculations for Active Slice ────────────────────────────────
  const totalRetailers = filtered.length;
  const avgBasco = useMemo(() => {
    if (!filtered.length) return "0.0";
    const totalQ = filtered.reduce((acc, r) => acc + (r.queries || 1), 0);
    const weightedSum = filtered.reduce((acc, r) => acc + (r.basco * (r.queries || 1)), 0);
    return (weightedSum / Math.max(1, totalQ)).toFixed(1);
  }, [filtered]);

  const totalFmvAtRisk = useMemo(() => {
    const sum = filtered.reduce((acc, r) => acc + (r.attr_loss ?? 0), 0);
    return fmtUSD(sum);
  }, [filtered]);

  const totalQueries = useMemo(() => {
    return filtered.reduce((acc, r) => acc + r.queries, 0);
  }, [filtered]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "basco" ? "asc" : (key === "retailer" || key === "country" || key === "quarter" || key === "region" ? "asc" : "desc"));
    }
  }

  // ── Styles ───────────────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 4px 24px rgba(13,27,42,0.10)",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 20,
  };

  const thStyle = (align: string): React.CSSProperties => ({
    padding: "10px 14px",
    color: "#fff",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    textAlign: align as any,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    background: "transparent",
    borderBottom: "none",
  });

  return (
    <div style={{ position: "relative" }}>
      {/* ── Global Tooltip ────────────────────────────────────────────────── */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 14,
            top: tooltip.y - 8,
            zIndex: 9999,
            pointerEvents: "none",
            background: "rgba(15,23,42,0.93)",
            color: "#f8fafc",
            fontSize: 11,
            padding: "7px 12px",
            borderRadius: 8,
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            maxWidth: 230,
            lineHeight: 1.5,
          }}
        >
          {tooltip.text}
        </div>
      )}

      <div style={cardStyle}>
        {/* ── Page Header with Interactive Dropdown Filters ────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
                Retailer{" "}
                <span className="bg-gradient-to-r from-[#1E429F] via-[#0D9488] to-[#6366F1] bg-clip-text text-transparent inline-block">
                  Performance
                </span>
              </h1>
            </div>
            <p className="text-xs text-[#6B7280] font-medium mt-1">
              BASCO Score &times; Helpdesk Usage • Filter by Quarter and Country
            </p>
          </div>



          {/* ── Filter Dropdown Buttons (Quarter & Country) ─────────────────── */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            
            {/* 1. Quarter Dropdown */}
            <div ref={quarterRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsQuarterOpen((v) => !v);
                  setIsCountryOpen(false);
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs border ${
                  selectedQuarter !== "All Quarters"
                    ? "bg-[#1E429F] text-white border-[#1E429F]"
                    : "bg-white text-[#111827] border-[#E5E7EB] hover:border-[#CBD5E1] hover:bg-slate-50"
                }`}
              >
                <span className="text-[#6B7280] font-medium">Quarter:</span>
                <span>{selectedQuarter}</span>
                <span className="text-[10px] transform transition-transform" style={{ transform: isQuarterOpen ? "rotate(180deg)" : "none" }}>
                  ▼
                </span>
              </button>

              {isQuarterOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-[#E5E7EB] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider border-b border-[#E5E7EB]">
                    Select Quarter
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
                            : "text-[#111827] hover:bg-slate-100/80"
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

            {/* 2. Country Dropdown */}
            <div ref={countryRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsCountryOpen((v) => !v);
                  setIsQuarterOpen(false);
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs border ${
                  selectedCountry !== "All Countries"
                    ? "bg-[#1E429F] text-white border-[#1E429F]"
                    : "bg-white text-[#111827] border-[#E5E7EB] hover:border-[#CBD5E1] hover:bg-slate-50"
                }`}
              >
                <span className="text-[#6B7280] font-medium">Country:</span>
                <span>{selectedCountry}</span>
                <span className="text-[10px] transform transition-transform" style={{ transform: isCountryOpen ? "rotate(180deg)" : "none" }}>
                  ▼
                </span>
              </button>

              {isCountryOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-[#E5E7EB] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-72 flex flex-col">
                  <div className="p-2 border-b border-[#E5E7EB]">
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      placeholder="Search country..."
                      className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1E429F] font-medium text-[#111827]"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 py-1">
                    {filteredCountries.map((c) => {
                      const isSelected = selectedCountry === c;
                      return (
                        <button
                          key={c}
                          onClick={() => {
                            setSelectedCountry(c);
                            setIsCountryOpen(false);
                            setCountrySearch("");
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-[#1E429F]/10 text-[#1E429F]"
                              : "text-[#111827] hover:bg-slate-100/80"
                          }`}
                        >
                          <span>{c}</span>
                          {isSelected && <span className="text-[#1E429F] font-bold">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Reset Filters Pill (visible if any filter active) */}
            {(selectedQuarter !== "All Quarters" || selectedCountry !== "All Countries") && (
              <button
                onClick={() => {
                  setSelectedQuarter("All Quarters");
                  setSelectedCountry("All Countries");
                  setSearch("");
                  setRegion("All");
                }}
                className="text-xs font-semibold text-[#EF4444] hover:text-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/20 px-3 py-2 rounded-xl transition-colors border border-[#EF4444]/25 flex items-center gap-1 cursor-pointer"
              >
                <span>✕</span>
                <span>Reset</span>
              </button>
            )}

          </div>
        </div>

        {/* ── Dynamic KPI Summary Row ──────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <KpiChip label="Total Retailers" value={String(totalRetailers)} />
          <KpiChip
            label="Avg BASCO Score"
            value={avgBasco + "%"}
            accentColor={bascoBarColor(Number(avgBasco))}
          />
          <KpiChip
            label="Total FMV at Risk"
            value={totalFmvAtRisk}
            accentColor="#EF4444"
          />
          <KpiChip
            label="Helpdesk Queries"
            value={String(totalQueries)}
            accentColor="#1E429F"
          />
        </div>

        {/* ── Search & Region Filter Bar ───────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Search Input with SVG Icon */}
          <div className="relative min-w-[280px]">
            <input
              type="text"
              placeholder="Search retailer or country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-xs rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1E429F]/20 font-medium text-[#111827] placeholder:text-[#6B7280] shadow-2xs"
            />
            <svg
              className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>

          {/* Region Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-[#E5E7EB] flex-wrap">
            {(["All", "APJ", "EMEA", "LATAM"] as RegionFilter[]).map((r) => {
              const isActive = region === r;
              return (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-[#1E429F] shadow-xs border border-[#1E429F]/20 font-extrabold"
                      : "text-[#6B7280] hover:text-[#111827] hover:bg-white/60"
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>


        {/* ── Table Container (Scrollable with Sticky Header) ─────────────── */}
        <div
          style={{
            border: "1px solid #E5E7EB",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ overflowX: "auto", maxHeight: "480px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 850 }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#071739" }}>
                <tr style={{ background: "linear-gradient(90deg, #0B1325 0%, #1C3668 100%)" }}>
                  <th style={thStyle("center")} onClick={() => handleSort("trend")}>
                    # <SortIndicator col="trend" active={sortKey} dir={sortDir} />
                  </th>
                  <th style={thStyle("center")} onClick={() => handleSort("quarter")}>
                    Quarter <SortIndicator col="quarter" active={sortKey} dir={sortDir} />
                  </th>
                  <th style={thStyle("left")} onClick={() => handleSort("retailer")}>
                    Retailer <SortIndicator col="retailer" active={sortKey} dir={sortDir} />
                  </th>
                  <th style={thStyle("left")} onClick={() => handleSort("country")}>
                    Country <SortIndicator col="country" active={sortKey} dir={sortDir} />
                  </th>
                  <th style={thStyle("center")} onClick={() => handleSort("region")}>
                    Region <SortIndicator col="region" active={sortKey} dir={sortDir} />
                  </th>
                  <th style={thStyle("right")} onClick={() => handleSort("basco")}>
                    BASCO Score <SortIndicator col="basco" active={sortKey} dir={sortDir} />
                  </th>
                  <th
                    style={thStyle("right")}
                    onClick={() => handleSort("fmv")}
                    onMouseEnter={(e) =>
                      setTooltip({ x: e.clientX, y: e.clientY, text: FMV_TOOLTIP })
                    }
                    onMouseLeave={() => setTooltip(null)}
                  >
                    FMV ($) ℹ <SortIndicator col="fmv" active={sortKey} dir={sortDir} />
                  </th>
                  <th
                    style={thStyle("right")}
                    onClick={() => handleSort("attr_loss")}
                    onMouseEnter={(e) =>
                      setTooltip({
                        x: e.clientX,
                        y: e.clientY,
                        text: "Attribution Loss ($) at risk for this market",
                      })
                    }
                    onMouseLeave={() => setTooltip(null)}
                  >
                    Attribution Loss ($) ℹ <SortIndicator col="attr_loss" active={sortKey} dir={sortDir} />
                  </th>
                  <th style={thStyle("right")} onClick={() => handleSort("queries")}>
                    Helpdesk Queries <SortIndicator col="queries" active={sortKey} dir={sortDir} />
                  </th>
                  <th style={thStyle("center")} onClick={() => handleSort("trend")}>
                    Trend <SortIndicator col="trend" active={sortKey} dir={sortDir} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        padding: "48px",
                        textAlign: "center",
                        color: "#6B7280",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#1E429F] border-t-transparent rounded-full animate-spin" />
                        <span>Loading 2026 Retailer Performance data...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        padding: "36px",
                        textAlign: "center",
                        color: "#6B7280",
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      No retailers found for the selected filters ({selectedQuarter} • {selectedCountry}).
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={`${row.retailer}-${row.country}-${row.quarter || ''}-${idx}`}
                        style={{
                          background: isEven ? "#ffffff" : "#F8FAFC",
                          borderBottom: "1px solid #E5E7EB",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "#F1F5F9";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = isEven
                            ? "#ffffff"
                            : "#F8FAFC";
                        }}
                      >
                        {/* 1. Rank (#) */}
                        <td
                          style={{
                            padding: "11px 14px",
                            textAlign: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            color: idx < 3 ? "#1E429F" : "#6B7280",
                          }}
                        >
                          {idx + 1}
                        </td>

                        {/* 2. Quarter */}
                        <td
                          style={{
                            padding: "11px 14px",
                            textAlign: "center",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#1E429F",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span className="inline-block bg-[#1E429F]/10 text-[#1E429F] px-2 py-0.5 rounded-md font-bold text-[11px] border border-[#1E429F]/20">
                            {row.quarter || row.period || "—"}
                          </span>
                        </td>

                        {/* 3. Retailer Name */}
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#111827",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span>{row.retailer}</span>
                            {row.topAccount === "YES" && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 800,
                                  background: "#FEF3C7",
                                  color: "#92400E",
                                  padding: "1px 5px",
                                  borderRadius: 4,
                                  letterSpacing: "0.05em",
                                }}
                              >
                                TOP
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Country */}
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: 12,
                            color: "#475569",
                            fontWeight: 500,
                          }}
                        >
                          {row.country}
                        </td>

                        {/* 5. Region Pill */}
                        <td style={{ padding: "11px 14px", textAlign: "center" }}>
                          <span
                            className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${regionPillClass(
                              row.region
                            )}`}
                          >
                            {row.region}
                          </span>
                        </td>

                        {/* 6. BASCO Score Bar */}
                        <td style={{ padding: "11px 14px", textAlign: "right" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                width: 55,
                                height: 6,
                                background: "#E5E7EB",
                                borderRadius: 999,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(100, row.basco)}%`,
                                  height: "100%",
                                  background: bascoBarColor(row.basco),
                                  borderRadius: 999,
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 800,
                                color: bascoBarColor(row.basco),
                                minWidth: 38,
                              }}
                            >
                              {row.basco}%
                            </span>
                          </div>
                        </td>

                        {/* 7. FMV ($) */}
                        <td
                          style={{
                            padding: "11px 14px",
                            textAlign: "right",
                            fontSize: 12,
                            fontWeight: 700,
                            color: row.fmv != null ? "#1E429F" : "#6B7280",
                          }}
                        >
                          {row.fmv != null ? fmtUSD(row.fmv) : "—"}
                        </td>

                        {/* 8. Attribution Loss ($) */}
                        <td
                          style={{
                            padding: "11px 14px",
                            textAlign: "right",
                            fontSize: 12,
                            fontWeight: 700,
                            color: row.attr_loss != null && row.attr_loss > 0 ? "#EF4444" : "#6B7280",
                          }}
                        >
                          {row.attr_loss != null && row.attr_loss > 0 ? fmtUSD(row.attr_loss) : "$0"}
                        </td>

                        {/* 9. Helpdesk Queries */}
                        <td
                          style={{
                            padding: "11px 14px",
                            textAlign: "right",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#334155",
                          }}
                        >
                          {row.queries}
                        </td>

                        {/* 10. Trend */}
                        <td style={{ padding: "11px 14px", textAlign: "center" }}>
                          <TrendIcon trend={row.trend} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Table Footer Caption ─────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: "#6B7280",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>
            Showing <strong style={{ color: "#111827" }}>{filtered.length}</strong> of{" "}
            <strong style={{ color: "#111827" }}>{baseRows.length}</strong> retailers for{" "}
            <strong style={{ color: "#1E429F" }}>{selectedQuarter}</strong> • {selectedCountry}
          </span>
          <span>FMV & Attribution Loss sourced from Intel POP Analytics Warehouse</span>
        </div>
      </div>

      {/* ── Creative Evidence Locker Section ─────────────────────────────── */}
      <EvidenceLocker />
    </div>
  );
}
