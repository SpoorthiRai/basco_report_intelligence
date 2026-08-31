// src/pages/CTACampaignPage.tsx
// CTA X Campaign Objective
// 4-Panel layout: KPI tiles, Retailer stacked bar, Misaligned evidence table, Alignment summary, and Top CTA Phrases Treemap

import { useState, useEffect, useRef } from 'react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Treemap,
} from 'recharts';

import api from '../api/client';
import ImageModal from '../components/common/ImageModal';

interface KPITile {
  label: string;
  count: number;
  pct: number;
  color: string;
}

interface RetailerCTA {
  retailer: string;
  total: number;
  'Buy/Shop CTA': number;
  'Learn CTA': number;
  'No CTA': number;
  'Urgency CTA': number;
  'Other CTA': number;
}

interface TopCTAPhrase {
  phrase: string;
  volume: number;
  objective_breakdown?: {
    'Conversion/Sales'?: number;
    Awareness?: number;
    Other?: number;
  };
  conversion_count?: number;
  awareness_count?: number;
}

interface MisalignedCreative {
  Asset_URL: string;
  Objective: string;
  CTA_Text: string;
  CTA_Flag: string;
  Narrative_Style: string;
  Retailer: string;
  Region: string;
  Country: string;
  quarter_label: string;
  cta_bucket?: string;
}

interface CTACampaignResponse {
  total_creatives: number;
  aligned_count: number;
  misaligned_count: number;
  kpi_tiles: KPITile[];
  retailer_cta_breakdown: RetailerCTA[];
  top_cta_phrases: TopCTAPhrase[];
  misaligned_evidence: MisalignedCreative[];
  filter_options: {
    quarters: string[];
    countries: string[];
    retailers: string[];
  };
}

const BUCKET_COLORS: Record<string, string> = {
  'Buy/Shop CTA': '#F59E0B',
  'Learn CTA': '#06B6D4',
  'No CTA': '#F97316',
  'Urgency CTA': '#8B5CF6',
  'Other CTA': '#6B7280',
};

const TREEMAP_COLORS = ['#06B6D4', '#F59E0B', '#8B5CF6', '#10B981', '#F97316', '#3B82F6', '#EC4899'];


// Custom Treemap Cell Content with high-contrast, crisp text rendering
const CustomizedTreemapContent = (props: any) => {
  const { x, y, width, height, index } = props;
  const phrase = props.phrase || props.payload?.phrase || props.name || '';
  const size = props.size ?? props.payload?.size ?? props.value ?? 0;
  const color = TREEMAP_COLORS[index % TREEMAP_COLORS.length];

  if (!width || !height || width < 12 || height < 12) return null;

  const pad = 2.5;
  const rw = Math.max(0, width - pad * 2);
  const rh = Math.max(0, height - pad * 2);

  // Responsive font sizes tailored to box dimensions
  const isTiny = rw < 38 || rh < 26;
  const isSmall = rw < 65 || rh < 42;
  const isMedium = rw < 110 || rh < 65;

  const phraseFontSize = isTiny ? 9 : isSmall ? 10 : isMedium ? 11 : 13;
  const countFontSize = isTiny ? 9 : isSmall ? 10 : isMedium ? 12 : 14;

  // Max characters calculation with conservative character width factor
  const maxChars = Math.max(3, Math.floor((rw - 6) / (phraseFontSize * 0.62)));
  const displayPhrase = phrase && phrase.length > maxChars ? `${phrase.slice(0, Math.max(1, maxChars - 1))}…` : phrase;

  const showPhrase = rw >= 32 && rh >= 24;
  const showCount = rw >= 20 && rh >= 16;
  const showBoth = showPhrase && rh >= 44;

  return (
    <g>
      <rect
        x={x + pad}
        y={y + pad}
        width={rw}
        height={rh}
        fill={color}
        stroke="#ffffff"
        strokeWidth={1.5}
        rx={5}
        ry={5}
      />
      <title>{`${phrase}: ${size} creatives`}</title>
      {showBoth ? (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 8}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#000000"
            fontSize={phraseFontSize}
            fontWeight="400"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {displayPhrase}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#000000"
            fontSize={countFontSize}
            fontWeight="400"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {size}
          </text>
        </>
      ) : showPhrase && !isTiny ? (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#000000"
          fontSize={phraseFontSize}
          fontWeight="400"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {displayPhrase}
        </text>
      ) : showCount ? (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#000000"
          fontSize={countFontSize}
          fontWeight="400"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {size}
        </text>
      ) : null}
    </g>
  );
};

export default function CTACampaignPage() {
  const [data, setData] = useState<CTACampaignResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [quarterFilter, setQuarterFilter] = useState<string>('All Quarters');
  const [countryFilter, setCountryFilter] = useState<string>('All Countries');
  const [retailerFilter, setRetailerFilter] = useState<string>('All Retailers');
  const [objectiveFilter, setObjectiveFilter] = useState<string>('All');
  const [selectedCreative, setSelectedCreative] = useState<MisalignedCreative | null>(null);

  const evidenceTableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (quarterFilter && quarterFilter !== 'All' && quarterFilter !== 'All Quarters') {
      params.append('quarter', quarterFilter);
    }
    if (countryFilter && countryFilter !== 'All' && countryFilter !== 'All Countries') {
      params.append('country', countryFilter);
    }
    if (retailerFilter && retailerFilter !== 'All' && retailerFilter !== 'All Retailers') {
      params.append('retailer', retailerFilter);
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';

    api
      .get<CTACampaignResponse>(`/api/reports/cta-campaign/${queryString}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.data) {
          setData(res.data);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        const msg = err.response?.data?.error || err.message || 'Failed to load CTA Campaign data.';
        setError(msg);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [quarterFilter, countryFilter, retailerFilter]);

  // Process Treemap data based on objective filter
  const rawPhrases = data?.top_cta_phrases || [];
  const treemapData = rawPhrases
    .map((p) => {
      let size = p.volume;
      if (objectiveFilter === 'Conversion/Sales') {
        size = p.conversion_count ?? p.objective_breakdown?.['Conversion/Sales'] ?? 0;
      } else if (objectiveFilter === 'Awareness') {
        size = p.awareness_count ?? p.objective_breakdown?.['Awareness'] ?? 0;
      }
      return {
        name: p.phrase,
        phrase: p.phrase,
        size: size,
      };
    })
    .filter((item) => item.size > 0)
    .slice(0, 20);

  const kpiTiles = data?.kpi_tiles || [];
  const retailerBreakdown = data?.retailer_cta_breakdown || [];
  const evidenceList = data?.misaligned_evidence || [];

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#071739]">
              Campaign{" "}
              <span className="bg-gradient-to-r from-[#0062d2] via-[#0284c7] to-[#6366f1] bg-clip-text text-transparent inline-block">
                Effectiveness
              </span>
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs">
              Strategic Alignment
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Analysis of Call-to-Action distribution, strategic alignment with campaign objectives, and misaligned evidence.
          </p>
        </div>

        {/* Quarter, Country, Retailer Dropdowns */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quarter dropdown */}
          <div className="flex items-center gap-2 bg-white/95 border border-slate-200/90 shadow-2xs px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700">
            <span className="text-slate-400 font-medium">Quarter:</span>
            <select
              value={quarterFilter}
              onChange={(e) => setQuarterFilter(e.target.value)}
              className="bg-transparent text-slate-900 text-xs font-bold focus:outline-none cursor-pointer pr-1"
            >
              {(data?.filter_options?.quarters || ['All']).map((q) => (
                <option key={q} value={q} className="bg-white text-slate-900">
                  {q}
                </option>
              ))}
            </select>
          </div>

          {/* Country dropdown */}
          <div className="flex items-center gap-2 bg-white/95 border border-slate-200/90 shadow-2xs px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700">
            <span className="text-slate-400 font-medium">Country:</span>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="bg-transparent text-slate-900 text-xs font-bold focus:outline-none cursor-pointer pr-1"
            >
              {(data?.filter_options?.countries || ['All']).map((c) => (
                <option key={c} value={c} className="bg-white text-slate-900">
                  {c}
                </option>
              ))}
            </select>
          </div>


          {/* Retailer dropdown */}
          <div className="flex items-center gap-1.5 bg-[#071739] text-white px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-xs font-semibold text-slate-300">Retailer:</span>
            <select
              value={retailerFilter}
              onChange={(e) => setRetailerFilter(e.target.value)}
              className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer pr-1"
            >
              {(data?.filter_options?.retailers || ['All']).map((r) => (
                <option key={r} value={r} className="bg-slate-900 text-white">
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs md:text-sm font-semibold flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            onClick={() => setQuarterFilter((prev) => prev)}
            className="text-xs underline hover:text-rose-900 cursor-pointer font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* TOP SECTION: Left (60% width) & Right (40% width)           */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ── TOP LEFT (60% / lg:col-span-7): KPI Tiles + Retailer Chart */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between min-h-[620px]">
          <div>
            {/* Row 1 — 5 KPI Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {kpiTiles.map((tile) => (
                <div
                  key={tile.label}
                  className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between hover:shadow-xs transition-shadow"
                >
                  <span
                    className="text-2xl font-black tracking-tight"
                    style={{ color: tile.color }}
                  >
                    {tile.pct}%
                  </span>
                  <div className="mt-1.5">
                    <p className="text-[11px] font-bold text-slate-800 leading-tight">
                      {tile.label}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      {tile.count.toLocaleString()} creatives
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 italic font-medium mt-4">
              Split into Retailer-wise
            </p>

            {/* Row 2 — Retailer Stacked Horizontal Bar Chart */}
            <div className="mt-2">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                CTA Usage by Retailer
              </h3>
            </div>
          </div>

          <div className="w-full h-[380px] mt-2 flex items-center justify-center">
            {loading && !data ? (
              <div className="w-full h-full bg-slate-50 rounded-xl animate-pulse flex items-center justify-center">
                <span className="text-xs font-semibold text-slate-400">Loading retailer breakdown...</span>
              </div>
            ) : retailerBreakdown.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs font-medium text-slate-400">
                No retailer CTA data found.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <BarChart
                  layout="vertical"
                  data={retailerBreakdown}
                  margin={{ top: 10, right: 20, left: 25, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    dataKey="retailer"
                    type="category"
                    width={95}
                    tick={{ fontSize: 10, fill: '#334155', fontWeight: 500 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '0.5rem',
                      fontSize: '11px',
                      borderColor: '#e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  {Object.keys(BUCKET_COLORS).map((bucket) => (
                    <Bar
                      key={bucket}
                      dataKey={bucket}
                      name={bucket}
                      stackId="ctaStack"
                      fill={BUCKET_COLORS[bucket]}
                      barSize={12}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend Below Chart */}
          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1.5 justify-center text-[10px]">
            {Object.entries(BUCKET_COLORS).map(([bucket, color]) => (
              <div key={bucket} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-slate-600 font-semibold">{bucket}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── TOP RIGHT (40% / lg:col-span-5): Misaligned Evidence Table */}
        <div
          ref={evidenceTableRef}
          id="misaligned-evidence-table"
          className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between min-h-[620px]"
        >
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">
              Campaigns Requiring CTA Attention
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Creatives where the CTA doesn't match the campaign's intent (e.g. Sales objective without a Buy/Urgency CTA)
            </p>
          </div>

          <div className="flex-1 mt-4 overflow-y-auto max-h-[500px] border border-slate-200 rounded-xl">
            {loading && !data ? (
              <div className="p-8 text-center text-xs font-semibold text-slate-400 animate-pulse">
                Loading evidence assets...
              </div>
            ) : evidenceList.length === 0 ? (
              <div className="p-8 text-center text-xs font-medium text-slate-400">
                No misaligned creatives found for current filters.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Creative</th>
                    <th className="py-2.5 px-3">Objective</th>
                    <th className="py-2.5 px-3">CTA Text</th>
                    <th className="py-2.5 px-3">CTA Bucket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evidenceList.slice(0, 20).map((row, idx) => (
                    <tr
                      key={`${row.Asset_URL}-${idx}`}
                      className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/50 hover:bg-slate-50'}
                    >
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => setSelectedCreative(row)}
                          className="group relative w-20 h-14 bg-slate-900 rounded-md overflow-hidden flex items-center justify-center border border-slate-200 shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
                          title="Click to view bigger creative"
                        >
                          <img
                            src={row.Asset_URL}
                            alt="Creative Asset"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                            🔍
                          </span>
                        </button>
                        <span className="text-[10px] text-slate-400 truncate block max-w-[80px] mt-0.5">
                          {row.Retailer}
                        </span>
                      </td>
                      <td className="py-2 px-3 align-top font-medium text-slate-700">
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold inline-block">
                          {row.Objective}
                        </span>
                      </td>
                      <td className="py-2 px-3 align-top text-slate-600 font-mono text-[11px]">
                        {row.CTA_Text || 'None'}
                      </td>
                      <td className="py-2 px-3 align-top">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap inline-block"
                          style={{
                            backgroundColor: BUCKET_COLORS[row.cta_bucket || 'No CTA'] || '#F97316',
                          }}
                        >
                          {row.cta_bucket || 'No CTA'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* BOTTOM SECTION: Left (50% width) & Right (50% width)        */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ── BOTTOM LEFT (50% / lg:col-span-6): Aligned vs Misaligned */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                Strategic Alignment Summary
              </h3>
            </div>

            {/* Stat Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">🟢</span>
                <div>
                  <span className="text-xs font-bold text-emerald-900 block">
                    Strategically Aligned
                  </span>
                  <span className="text-lg font-black text-emerald-700">
                    {data?.aligned_count?.toLocaleString() || 0} Assets
                  </span>
                </div>
              </div>

              <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">🔴</span>
                <div>
                  <span className="text-xs font-bold text-rose-900 block">
                    Misaligned
                  </span>
                  <span className="text-lg font-black text-rose-700">
                    {data?.misaligned_count?.toLocaleString() || 0} Assets
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Alignment Rules Text Block */}
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1.5 italic">
            <p className="font-semibold text-slate-700 not-italic uppercase tracking-wider text-[10px]">
              Strategic Alignment Rules:
            </p>
            <p>• Conversion/Sales objective = Requires Buy/Shop CTA or Urgency CTA</p>
            <p>• Awareness objective = Requires Learn CTA or Appropriate Narrative CTA</p>
          </div>
        </div>

        {/* ── BOTTOM RIGHT (50% / lg:col-span-6): Top CTA Phrases Treemap */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2.5 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                  Top CTA Phrases Used (Volume)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Volume distribution by key call-to-action phrase
                </p>
              </div>

              {/* Content Objective Filter Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                <span className="text-[11px] font-bold text-slate-600">Objective:</span>
                <select
                  value={objectiveFilter}
                  onChange={(e) => setObjectiveFilter(e.target.value)}
                  className="bg-transparent text-slate-900 text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="All">All</option>
                  <option value="Conversion/Sales">Conversion/Sales</option>
                  <option value="Awareness">Awareness</option>
                </select>
              </div>
            </div>
          </div>

          <div className="w-full h-[340px] mt-3 flex items-center justify-center">
            {loading && !data ? (
              <div className="w-full h-full bg-slate-50 rounded-xl animate-pulse flex items-center justify-center">
                <span className="text-xs font-semibold text-slate-400">Loading CTA treemap...</span>
              </div>
            ) : treemapData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs font-medium text-slate-400">
                No CTA phrases found for {objectiveFilter}.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <Treemap
                  data={treemapData}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  stroke="#fff"
                  content={<CustomizedTreemapContent />}
                >
                  <Tooltip
                    formatter={(value: any, _name: any, item: any) => [
                      `${value} creatives`,
                      `Phrase: "${item?.payload?.phrase || item?.name}"`,
                    ]}
                    contentStyle={{
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                      borderColor: '#e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                </Treemap>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top Phrases Quick-Reference Badges */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Ranked Top Phrases (Volume):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-[72px] overflow-y-auto">
              {treemapData.slice(0, 10).map((item, idx) => (
                <div
                  key={item.phrase}
                  className="bg-slate-50 border border-slate-200/80 rounded-md px-2 py-0.5 flex items-center gap-1.5 text-[11px]"
                >
                  <span className="text-[10px] font-extrabold text-cyan-800">#{idx + 1}</span>
                  <span className="font-semibold text-slate-700 max-w-[120px] truncate" title={item.phrase}>
                    {item.phrase}
                  </span>
                  <span className="bg-slate-200 text-slate-800 text-[10px] font-extrabold px-1 rounded">
                    {item.size}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>


      </div>

      {/* ── Image Lightbox Modal ─────────────────────────────────── */}
      <ImageModal
        isOpen={!!selectedCreative}
        onClose={() => setSelectedCreative(null)}
        imageUrl={selectedCreative?.Asset_URL || ''}
        title={`Creative Asset — ${selectedCreative?.Retailer || 'Unknown'}`}
        subtitle={`Objective: ${selectedCreative?.Objective} • Quarter: ${selectedCreative?.quarter_label || 'N/A'}`}
        details={[
          { label: 'Parent Account', value: selectedCreative?.Retailer || 'Unknown' },
          {
            label: 'Objective',
            value: selectedCreative?.Objective || 'Conversion/Sales',
            badge: true,
            badgeColor: '#BE123C',
          },
          { label: 'CTA Text', value: selectedCreative?.CTA_Text || 'None' },
          {
            label: 'CTA Bucket',
            value: selectedCreative?.cta_bucket || 'No CTA',
            badge: true,
            badgeColor: BUCKET_COLORS[selectedCreative?.cta_bucket || 'No CTA'] || '#F97316',
          },
          { label: 'Country', value: selectedCreative?.Country || 'Unknown' },
          { label: 'Region', value: selectedCreative?.Region || 'Unknown' },
        ]}
      />
    </div>
  );
}

