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
  'Buy/Shop CTA': '#1E429F',
  'Urgency CTA': '#1E429F',
  'Learn CTA': '#0EA5E9',
  'No CTA': '#64748B',
  'Other CTA': '#CBD5E1',
};

const TREEMAP_PALETTE = [
  '#1E429F', // Rank 1 - Hero Sapphire
  '#1D4ED8', // Rank 2 - Royal Blue
  '#0284C7', // Rank 3 - Sky Teal
  '#0EA5E9', // Rank 4 - Cyan
  '#2563EB', // Rank 5 - Vibrant Blue
  '#475569', // Rank 6 - Deep Slate
  '#64748B', // Rank 7 - Cool Slate
];

// Custom Treemap Cell Content with high-contrast, razor-sharp typography
const CustomizedTreemapContent = (props: any) => {
  const { x, y, width, height, index } = props;
  const phrase = props.phrase || props.payload?.phrase || props.name || '';
  const size = props.size ?? props.payload?.size ?? props.value ?? 0;
  const color = TREEMAP_PALETTE[index % TREEMAP_PALETTE.length];

  if (!width || !height || width < 14 || height < 14) return null;

  const pad = 2;
  const rw = Math.max(0, width - pad * 2);
  const rh = Math.max(0, height - pad * 2);

  // Determine display capability based on cell dimensions
  const canShowBoth = rw >= 64 && rh >= 44;
  const canShowPhraseOnly = rw >= 50 && rh >= 28;
  const isNarrow = rw < 50 || rh < 28;

  // Calculate clean max characters to prevent clipped ellipses
  const maxChars = Math.max(4, Math.floor((rw - 10) / 7.2));
  const displayPhrase = phrase.length > maxChars ? `${phrase.slice(0, Math.max(2, maxChars - 1))}…` : phrase;

  return (
    <g className="transition-opacity hover:opacity-90 cursor-pointer">
      {/* Tile Rectangle */}
      <rect
        x={x + pad}
        y={y + pad}
        width={rw}
        height={rh}
        fill={color}
        stroke="#ffffff"
        strokeWidth={2}
        rx={6}
        ry={6}
      />
      <title>{`"${phrase}": ${size} creative${size !== 1 ? 's' : ''}`}</title>

      {/* Content Rendering */}
      {canShowBoth ? (
        <>
          {/* Phrase Title */}
          <text
            x={x + width / 2}
            y={y + height / 2 - 9}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#ffffff"
            fontSize={rw > 100 ? 12 : 11}
            fontWeight="600"
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {displayPhrase}
          </text>
          {/* Creative Count */}
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#ffffff"
            fillOpacity={0.95}
            fontSize={13}
            fontWeight="800"
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {size}
          </text>
        </>
      ) : canShowPhraseOnly ? (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#ffffff"
            fontSize={10}
            fontWeight="600"
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {displayPhrase}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 7}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#ffffff"
            fontSize={11}
            fontWeight="800"
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {size}
          </text>
        </>
      ) : isNarrow ? (
        /* In small tiles: show only the bold number cleanly with zero truncated word mess */
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          fontSize={12}
          fontWeight="800"
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
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

  const totalAssets = (data?.aligned_count || 0) + (data?.misaligned_count || 0);
  const alignedPct = totalAssets > 0 ? Math.round(((data?.aligned_count || 0) / totalAssets) * 100) : 0;
  const misalignedPct = totalAssets > 0 ? Math.round(((data?.misaligned_count || 0) / totalAssets) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#111827]">
              Campaign{" "}
              <span className="bg-gradient-to-r from-[#1E429F] via-[#0D9488] to-[#6366F1] bg-clip-text text-transparent inline-block">
                Effectiveness
              </span>
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20 shadow-2xs">
              Strategic Alignment
            </span>
          </div>
          <p className="text-xs md:text-sm text-[#6B7280] mt-1">
            Analysis of Call-to-Action distribution, strategic alignment with campaign objectives, and misaligned evidence.
          </p>
        </div>

        {/* Quarter, Country, Retailer Dropdowns */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quarter dropdown */}
          <div className="flex items-center gap-2 bg-white/95 border border-[#E5E7EB] shadow-2xs px-3.5 py-2 rounded-xl text-xs font-bold text-[#111827]">
            <span className="text-[#6B7280] font-medium">Quarter:</span>
            <select
              value={quarterFilter}
              onChange={(e) => setQuarterFilter(e.target.value)}
              className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer pr-1"
            >
              {(data?.filter_options?.quarters || ['All']).map((q) => (
                <option key={q} value={q} className="bg-white text-[#111827]">
                  {q}
                </option>
              ))}
            </select>
          </div>

          {/* Country dropdown */}
          <div className="flex items-center gap-2 bg-white/95 border border-[#E5E7EB] shadow-2xs px-3.5 py-2 rounded-xl text-xs font-bold text-[#111827]">
            <span className="text-[#6B7280] font-medium">Country:</span>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer pr-1"
            >
              {(data?.filter_options?.countries || ['All']).map((c) => (
                <option key={c} value={c} className="bg-white text-[#111827]">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Retailer dropdown */}
          <div className="flex items-center gap-1.5 bg-[#1E429F] text-white px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-xs font-semibold text-white/90">Retailer:</span>
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
      {/* TOP ROW: Strategic Alignment + CTA Distribution KPI Strip   */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Strategically Aligned */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] truncate">
              Strategically Aligned
            </span>
            <span className="w-2 h-2 rounded-full bg-[#1E429F]" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tracking-tight text-[#1E429F]">
                {alignedPct}%
              </span>
              <span className="text-[10px] text-[#6B7280] font-semibold">
                ({data?.aligned_count?.toLocaleString() || 0})
              </span>
            </div>
            <span className="text-[10px] text-[#6B7280] font-medium block mt-0.5 truncate">
              Matched Intent
            </span>
          </div>
        </div>

        {/* Card 2: Misaligned Intent */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] truncate">
              Misaligned Intent
            </span>
            <span className="w-2 h-2 rounded-full bg-[#64748B]" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tracking-tight text-[#64748B]">
                {misalignedPct}%
              </span>
              <span className="text-[10px] text-[#6B7280] font-semibold">
                ({data?.misaligned_count?.toLocaleString() || 0})
              </span>
            </div>
            <span className="text-[10px] text-[#6B7280] font-medium block mt-0.5 truncate">
              Requires Attention
            </span>
          </div>
        </div>

        {/* Cards 3-6: CTA Distribution Breakdown */}
        {kpiTiles.slice(0, 4).map((tile) => (
          <div
            key={tile.label}
            className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] truncate">
                {tile.label}
              </span>
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: BUCKET_COLORS[tile.label] || '#64748B' }}
              />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-2xl font-black tracking-tight"
                  style={{ color: BUCKET_COLORS[tile.label] || '#111827' }}
                >
                  {tile.pct}%
                </span>
                <span className="text-[10px] text-[#6B7280] font-semibold">
                  ({tile.count.toLocaleString()})
                </span>
              </div>
              <span className="text-[10px] text-[#6B7280] font-medium block mt-0.5 truncate">
                Total Creatives
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* MAIN SECTION: Left (Visual Analytics) & Right (Evidence)    */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN (58% / lg:col-span-7): Charts & Treemap ─── */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Card 1: CTA Usage by Retailer (Fixed Height: 390px) */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col justify-between h-[390px]">
            <div>
              <div className="pb-3 border-b border-[#E5E7EB]">
                <h3 className="text-sm font-bold text-[#111827] tracking-tight">
                  CTA Usage by Retailer
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Distribution of call-to-action types across monitored retailers.
                </p>
              </div>

              <div className="w-full h-[240px] mt-2 flex items-center justify-center">
                {loading && !data ? (
                  <div className="w-full h-full bg-[#F8FAFC] rounded-xl animate-pulse flex items-center justify-center">
                    <span className="text-xs font-semibold text-[#6B7280]">Loading retailer breakdown...</span>
                  </div>
                ) : retailerBreakdown.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[#6B7280]">
                    No retailer CTA data found.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      layout="vertical"
                      data={retailerBreakdown}
                      margin={{ top: 5, right: 20, left: 25, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} />
                      <YAxis
                        dataKey="retailer"
                        type="category"
                        width={95}
                        tick={{ fontSize: 10, fill: '#111827', fontWeight: 500 }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '0.5rem',
                          fontSize: '11px',
                          borderColor: '#E5E7EB',
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
            </div>

            {/* Legend Below Chart */}
            <div className="pt-2 border-t border-[#E5E7EB] flex flex-wrap gap-x-4 gap-y-1 justify-center text-[10px]">
              {Object.entries(BUCKET_COLORS).map(([bucket, color]) => (
                <div key={bucket} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[#6B7280] font-semibold">{bucket}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Top CTA Phrases Used Treemap (Fixed Height: 420px) */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col justify-between h-[420px]">
            <div>
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-[#E5E7EB]">
                <div>
                  <h3 className="text-sm font-bold text-[#111827] tracking-tight">
                    Top CTA Phrases Used (Volume)
                  </h3>
                  <p className="text-xs text-[#6B7280] font-medium mt-0.5">
                    Volume distribution by key call-to-action phrase
                  </p>
                </div>

                {/* Content Objective Filter Dropdown */}
                <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E5E7EB] px-2.5 py-1 rounded-lg">
                  <span className="text-[11px] font-bold text-[#6B7280]">Objective:</span>
                  <select
                    value={objectiveFilter}
                    onChange={(e) => setObjectiveFilter(e.target.value)}
                    className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="All">All</option>
                    <option value="Conversion/Sales">Conversion/Sales</option>
                    <option value="Awareness">Awareness</option>
                  </select>
                </div>
              </div>

              <div className="w-full h-[225px] mt-2 flex items-center justify-center">
                {loading && !data ? (
                  <div className="w-full h-full bg-[#F8FAFC] rounded-xl animate-pulse flex items-center justify-center">
                    <span className="text-xs font-semibold text-[#6B7280]">Loading CTA treemap...</span>
                  </div>
                ) : treemapData.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[#6B7280]">
                    No CTA phrases found for {objectiveFilter}.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={225}>
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
                          borderColor: '#E5E7EB',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                      />
                    </Treemap>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top Phrases Quick-Reference Badges */}
            <div className="pt-2 border-t border-[#E5E7EB]">
              <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1.5">
                Ranked Top Phrases (Volume):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-[64px] overflow-y-auto">
                {treemapData.slice(0, 10).map((item, idx) => (
                  <div
                    key={item.phrase}
                    className="bg-[#F8FAFC] border border-[#E5E7EB] hover:border-[#1E429F]/40 rounded-lg px-2 py-0.5 flex items-center gap-1.5 text-xs transition-colors"
                  >
                    <span className="text-[10px] font-extrabold text-[#1E429F]">#{idx + 1}</span>
                    <span className="font-semibold text-[#111827] max-w-[120px] truncate text-[11px]" title={item.phrase}>
                      {item.phrase}
                    </span>
                    <span className="bg-[#1E429F]/10 text-[#1E429F] text-[10px] font-extrabold px-1.5 py-0.2 rounded-md">
                      {item.size}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (42% / lg:col-span-5): Campaigns Requiring CTA Attention (Height: 834px) */}
        <div
          ref={evidenceTableRef}
          id="misaligned-evidence-table"
          className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col justify-between h-[834px]"
        >
          <div className="pb-3 border-b border-[#E5E7EB] flex items-center justify-between flex-wrap gap-2 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-[#111827] tracking-tight">
                Campaigns Requiring CTA Attention
              </h3>
              <p className="text-xs text-[#6B7280] font-medium mt-0.5">
                Creatives where CTA does not match campaign intent
              </p>
            </div>
            <span className="text-[11px] font-bold text-[#64748B] bg-[#F8FAFC] border border-[#E5E7EB] px-2.5 py-1 rounded-lg shrink-0">
              {evidenceList.length} Creatives
            </span>
          </div>

          <div className="flex-1 min-h-0 w-full mt-3 overflow-y-auto border border-[#E5E7EB] rounded-xl">
            {loading && !data ? (
              <div className="p-8 text-center text-xs font-semibold text-[#6B7280] animate-pulse">
                Loading evidence assets...
              </div>
            ) : evidenceList.length === 0 ? (
              <div className="p-8 text-center text-xs font-medium text-[#6B7280]">
                No misaligned creatives found for current filters.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-[#6B7280] font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Creative</th>
                    <th className="py-2.5 px-3">Objective</th>
                    <th className="py-2.5 px-3">CTA Text</th>
                    <th className="py-2.5 px-3">CTA Bucket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {evidenceList.map((row, idx) => (
                    <tr
                      key={`${row.Asset_URL}-${idx}`}
                      className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-[#F8FAFC]/50 hover:bg-slate-50'}
                    >
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => setSelectedCreative(row)}
                          className="group relative w-20 h-14 bg-slate-900 rounded-md overflow-hidden flex items-center justify-center border border-[#E5E7EB] shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E429F]"
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
                        <span className="text-[10px] text-[#6B7280] truncate block max-w-[80px] mt-0.5">
                          {row.Retailer}
                        </span>
                      </td>
                      <td className="py-2 px-3 align-top font-medium text-[#111827]">
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold inline-block">
                          {row.Objective}
                        </span>
                      </td>
                      <td className="py-2 px-3 align-top text-[#6B7280] font-mono text-[11px]">
                        {row.CTA_Text || 'None'}
                      </td>
                      <td className="py-2 px-3 align-top">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap inline-block"
                          style={{
                            backgroundColor: BUCKET_COLORS[row.cta_bucket || 'No CTA'] || '#1E429F',
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

