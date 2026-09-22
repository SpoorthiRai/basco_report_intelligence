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
  'Missing CTA'?: number;
  'No CTA'?: number;
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
  Voice_Of_Attribute?: string;
  Application_Of_Voice?: string;
  Retailer: string;
  Region: string;
  Country: string;
  quarter_label: string;
  cta_bucket?: string;
  aligned?: boolean;
  alignment?: 'Aligned' | 'Misaligned' | string;
}

interface CTACampaignResponse {
  total_creatives: number;
  aligned_count: number;
  misaligned_count: number;
  aligned_qoq_delta_pts?: number | null;
  misaligned_qoq_delta_pts?: number | null;
  qoq_label?: string;
  kpi_tiles: KPITile[];
  retailer_cta_breakdown: RetailerCTA[];
  top_cta_phrases: TopCTAPhrase[];
  misaligned_evidence: MisalignedCreative[];
  filter_options: {
    quarters: string[];
    regions?: string[];
    countries: string[];
    retailers: string[];
    products?: string[];
  };
}

const STACK_BUCKETS = ['Missing CTA', 'Buy/Shop CTA', 'Urgency CTA', 'Learn CTA', 'Other CTA'];

const BUCKET_COLORS: Record<string, string> = {
  'Missing CTA': '#64748B',
  'No CTA': '#64748B',
  'Buy/Shop CTA': '#1E429F',
  'Urgency CTA': '#1E429F',
  'Learn CTA': '#0EA5E9',
  'Other CTA': '#CBD5E1',
};

const TREEMAP_PALETTE = [
  '#1E429F',
  '#1D4ED8',
  '#0284C7',
  '#0EA5E9',
  '#2563EB',
  '#475569',
  '#64748B',
];

function qoqCaption(delta: number | null | undefined, label?: string): { text: string; up: boolean | null } {
  const vs = label || 'vs prior quarter';
  if (delta == null) return { text: vs, up: null };
  return {
    text: `${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)} pts ${vs}`,
    up: delta >= 0,
  };
}

// Custom Treemap Cell Content with high-contrast, razor-sharp typography
const CustomizedTreemapContent = (props: any) => {
  const { x, y, width, height, index } = props;
  const phrase = props.phrase || props.payload?.phrase || props.name || '';
  const size = props.size ?? props.payload?.size ?? props.value ?? 0;
  const color = BUCKET_COLORS[phrase] || TREEMAP_PALETTE[index % TREEMAP_PALETTE.length];

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
  const [regionFilter, setRegionFilter] = useState<string>('All Regions');
  const [countryFilter, setCountryFilter] = useState<string>('All Countries');
  const [retailerFilter, setRetailerFilter] = useState<string>('All Retailers');
  const [objectiveFilter, setObjectiveFilter] = useState<string>('All');
  const [driveObjective, setDriveObjective] = useState<string>('Conversion/Sales');
  const [ctaProductFilter, setCtaProductFilter] = useState<string>('All Products');
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
    if (regionFilter && regionFilter !== 'All' && regionFilter !== 'All Regions') {
      params.append('region', regionFilter);
    }
    if (countryFilter && countryFilter !== 'All' && countryFilter !== 'All Countries') {
      params.append('country', countryFilter);
    }
    if (retailerFilter && retailerFilter !== 'All' && retailerFilter !== 'All Retailers') {
      params.append('retailer', retailerFilter);
    }
    if (driveObjective === 'Conversion/Sales' || driveObjective === 'Awareness') {
      params.append('drive_objective', driveObjective);
    }
    if (ctaProductFilter && ctaProductFilter !== 'All' && ctaProductFilter !== 'All Products') {
      params.append('cta_product', ctaProductFilter);
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
  }, [quarterFilter, regionFilter, countryFilter, retailerFilter, driveObjective, ctaProductFilter]);

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
  const alignedTrend = qoqCaption(data?.aligned_qoq_delta_pts, data?.qoq_label);
  const needsTrend = qoqCaption(data?.misaligned_qoq_delta_pts, data?.qoq_label);

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
          </div>
          <p className="text-xs md:text-sm text-[#6B7280] mt-1">
            See whether campaign calls to action support the intended marketing objective – and where execution needs attention.
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

          {/* Region dropdown */}
          <div className="flex items-center gap-2 bg-white/95 border border-[#E5E7EB] shadow-2xs px-3.5 py-2 rounded-xl text-xs font-bold text-[#111827]">
            <span className="text-[#6B7280] font-medium">Region:</span>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer pr-1"
            >
              {(data?.filter_options?.regions || ['All Regions']).map((r) => (
                <option key={r} value={r} className="bg-white text-[#111827]">
                  {r}
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
          <div className="flex items-center gap-2 bg-white/95 border border-[#E5E7EB] shadow-2xs px-3.5 py-2 rounded-xl text-xs font-bold text-[#111827]">
            <span className="text-[#6B7280] font-medium">Retailer:</span>
            <select
              value={retailerFilter}
              onChange={(e) => setRetailerFilter(e.target.value)}
              className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer pr-1"
            >
              {(data?.filter_options?.retailers || ['All Retailers']).map((r) => (
                <option key={r} value={r} className="bg-white text-[#111827]">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 items-stretch">
        {kpiTiles.slice(0, 4).map((tile) => (
          <div
            key={tile.label}
            className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs p-4 flex flex-col h-full"
          >
            <div className="flex items-center justify-between min-h-[16px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] truncate">
                {tile.label}
              </span>
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: BUCKET_COLORS[tile.label] || '#64748B' }}
              />
            </div>
            <div className="mt-3 flex items-baseline gap-1.5 leading-none">
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
            <span className="text-[10px] text-[#6B7280] font-medium mt-1.5 truncate">
              Total Creatives
            </span>
          </div>
        ))}

        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs p-4 flex flex-col h-full">
          <div className="flex items-center justify-between min-h-[16px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] truncate">
              Aligned to Objective
            </span>
            <span className="w-2 h-2 rounded-full bg-[#1E429F] shrink-0" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5 leading-none">
            <span className="text-2xl font-black tracking-tight text-[#1E429F]">
              {alignedPct}%
            </span>
            <span className="text-[10px] text-[#6B7280] font-semibold">
              ({data?.aligned_count?.toLocaleString() || 0})
            </span>
          </div>
          <span className={`text-[10px] font-bold mt-1.5 truncate ${
            alignedTrend.up == null ? 'text-[#6B7280]' : alignedTrend.up ? 'text-[#10B981]' : 'text-[#EF4444]'
          }`}>
            {alignedTrend.text}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs p-4 flex flex-col h-full">
          <div className="flex items-center justify-between min-h-[16px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] truncate">
              Needs Alignment
            </span>
            <span className="w-2 h-2 rounded-full bg-[#64748B] shrink-0" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5 leading-none">
            <span className="text-2xl font-black tracking-tight text-[#64748B]">
              {misalignedPct}%
            </span>
            <span className="text-[10px] text-[#6B7280] font-semibold">
              ({data?.misaligned_count?.toLocaleString() || 0})
            </span>
          </div>
          <span className={`text-[10px] font-bold mt-1.5 truncate ${
            needsTrend.up == null ? 'text-[#6B7280]' : needsTrend.up ? 'text-[#EF4444]' : 'text-[#10B981]'
          }`}>
            {needsTrend.text}
          </span>
        </div>
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
              <div className="pb-3 border-b border-[#E5E7EB] flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-sm font-bold text-[#111827] tracking-tight">
                    How Retailers Drive Action
                  </h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Compare CTA usage and mix across retailer creative.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {(['Conversion/Sales', 'Awareness'] as const).map((objective) => (
                    <button
                      key={objective}
                      type="button"
                      onClick={() => setDriveObjective((prev) => (prev === objective ? 'All' : objective))}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        driveObjective === objective
                          ? 'bg-[#1E429F] text-white shadow-xs'
                          : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:text-[#111827] hover:bg-slate-50'
                      }`}
                    >
                      {objective}
                    </button>
                  ))}
                </div>
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
                      {STACK_BUCKETS.map((bucket) => (
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
              {STACK_BUCKETS.map((bucket) => (
                <div key={bucket} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: BUCKET_COLORS[bucket] }}
                  />
                  <span className="text-[#6B7280] font-semibold">{bucket}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Top CTA Phrases Used Treemap (Fixed Height: 420px) */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col h-[420px]">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-[#E5E7EB] shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-[#111827] tracking-tight">
                    Most-Used Calls to Action
                  </h3>
                  <p className="text-xs text-[#6B7280] font-medium mt-0.5">
                    Clean CTA phrases showing which calls to action appear most often.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E5E7EB] px-2.5 py-1 rounded-lg">
                    <span className="text-[11px] font-bold text-[#6B7280]">Product:</span>
                    <select
                      value={ctaProductFilter}
                      onChange={(e) => setCtaProductFilter(e.target.value)}
                      className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer max-w-[140px]"
                    >
                      {(data?.filter_options?.products || ['All Products']).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
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
              </div>

              <div className="w-full flex-1 min-h-0 mt-2 flex items-center justify-center">
                {loading && !data ? (
                  <div className="w-full h-full bg-[#F8FAFC] rounded-xl animate-pulse flex items-center justify-center">
                    <span className="text-xs font-semibold text-[#6B7280]">Loading CTA mix...</span>
                  </div>
                ) : treemapData.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[#6B7280]">
                    No Clean CTA phrases found for the selected filters.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
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
                          item?.payload?.phrase || item?.name,
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
                Campaigns to Review
              </h3>
              <p className="text-xs text-[#6B7280] font-medium mt-0.5">
                All campaign objectives and CTA types, with alignment and Intel Voice of Application.
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
                No creatives found for current filters.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-[#6B7280] font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Creative</th>
                    <th className="py-2.5 px-3">Campaign Objective</th>
                    <th className="py-2.5 px-3">CTA Type</th>
                    <th className="py-2.5 px-3">Alignment</th>
                    <th className="py-2.5 px-3">Intel Voice of Application</th>
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
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block border ${
                          row.Objective === 'Conversion/Sales'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : row.Objective === 'Awareness'
                            ? 'bg-[#1E429F]/10 text-[#1E429F] border-[#1E429F]/20'
                            : 'bg-[#F8FAFC] text-[#111827] border-[#E5E7EB]'
                        }`}>
                          {row.Objective}
                        </span>
                      </td>
                      <td className="py-2 px-3 align-top">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap inline-block"
                          style={{
                            backgroundColor: BUCKET_COLORS[row.cta_bucket || 'Missing CTA'] || '#1E429F',
                          }}
                        >
                          {row.cta_bucket || 'Missing CTA'}
                        </span>
                      </td>
                      <td className="py-2 px-3 align-top">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                            row.aligned
                              ? 'bg-[#10B981]/10 text-[#047857] border border-[#10B981]/25'
                              : 'bg-[#EF4444]/10 text-[#B91C1C] border border-[#EF4444]/25'
                          }`}
                        >
                          {row.alignment || (row.aligned ? 'Aligned' : 'Misaligned')}
                        </span>
                      </td>
                      <td className="py-2 px-3 align-top text-[#111827] text-[11px] max-w-[140px]">
                        <span className="line-clamp-2" title={row.Application_Of_Voice || row.Voice_Of_Attribute || ''}>
                          {row.Application_Of_Voice || row.Voice_Of_Attribute || '—'}
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
          { label: 'Retailer', value: selectedCreative?.Retailer || 'Unknown' },
          {
            label: 'Objective',
            value: selectedCreative?.Objective || 'Conversion/Sales',
            badge: true,
            badgeColor: '#BE123C',
          },
          {
            label: 'Alignment',
            value: selectedCreative?.alignment || (selectedCreative?.aligned ? 'Aligned' : 'Misaligned'),
            badge: true,
            badgeColor: selectedCreative?.aligned ? '#047857' : '#B91C1C',
          },
          { label: 'CTA Text', value: selectedCreative?.CTA_Text || 'None' },
          {
            label: 'CTA Type',
            value: selectedCreative?.cta_bucket || 'Missing CTA',
            badge: true,
            badgeColor: BUCKET_COLORS[selectedCreative?.cta_bucket || 'Missing CTA'] || '#F97316',
          },
          { label: 'Intel Voice of Application', value: selectedCreative?.Application_Of_Voice || selectedCreative?.Voice_Of_Attribute || '—' },
          { label: 'Country', value: selectedCreative?.Country || 'Unknown' },
          { label: 'Region', value: selectedCreative?.Region || 'Unknown' },
        ]}
      />
    </div>
  );
}

