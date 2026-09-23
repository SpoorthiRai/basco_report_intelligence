// src/pages/ProductMixPage.tsx
// Product Mix — Helpdesk Assets (Pre Launch)
// 3-Panel Layout: Region Series Adoption, Retailer Product Proportion, Generation/Series Mix

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import api from '../api/client';

function isSkippedRetailer(value?: string | null): boolean {
  const t = (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return !t || ['unknown', 'unmapped', 'none', 'na', 'n a', 'null', 'intel creative', 'red baron'].includes(t);
}

interface RegionAdoption {
  region: string;
  total: number;
  series_count: number;
  other: number;
  series_pct: number;
  series3?: number;
  series3_pct?: number;
}

interface RetailerProductMix {
  retailer: string;
  total: number;
  [family: string]: any;
}

interface GenSeriesBreakdown {
  label: string;
  count: number;
}

interface ProductMixResponse {
  series3_by_region: RegionAdoption[];
  retailer_product_mix: RetailerProductMix[];
  all_families: string[];
  gen_series_breakdown: GenSeriesBreakdown[];
  active_family: string;
  family_options: string[];
  target_series: string;
  series_options: string[];
  retailer_queries?: { retailer: string; queries: number }[];
  compliance_guidance?: { label: string; weight?: number; count?: number; pct: number }[];
  compliance_guidance_by_element?: Record<string, { label: string; count: number; pct: number }[]>;
  brand_elements?: string[];
  filter_options: {
    quarters: string[];
    regions?: string[];
    countries: string[];
    retailers?: string[];
    years?: string[];
    top_accounts?: string[];
  };
}

// Distinct, harmonious color palette ensuring every product family has a unique, distinguishable color
const FAMILY_COLORS: Record<string, string> = {
  'Core Processor': '#0284C7',
  'Core Ultra': '#1E429F',
  'Gaming': '#4338CA',
  'Gaming Core Ultra': '#7C3AED',
  'Evo Edition': '#D97706',
  'Other': '#94A3B8',
  'Intel Core Ultra': '#1E429F',
  'Intel Core Processors': '#0284C7',
  'Intel Processors': '#0D9488',
  'Intel Evo Edition': '#D97706',
  'Intel Evo': '#EA580C',
  'Intel Arc Graphics': '#DB2777',
  'Intel Iris Graphics': '#06B6D4',
};

const DEFAULT_FAMILY_COLOR = '#64748B';

function GenerationXAxisTick({ x, y, payload }: { x?: number; y?: number; payload?: { value?: string } }) {
  const label = String(payload?.value || '');
  const isUnspecified = label === 'Series/Gen not specified';
  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text textAnchor="middle" fill="#111827" fontSize={10} fontWeight={600}>
        {isUnspecified ? (
          <>
            <tspan x={0} dy={10}>Series/</tspan>
            <tspan x={0} dy={12}>Gen not specified</tspan>
          </>
        ) : (
          <tspan x={0} dy={12}>{label}</tspan>
        )}
      </text>
    </g>
  );
}

const GUIDANCE_SLICE_COLORS = ['#1E429F', '#0284C7', '#4338CA', '#7C3AED', '#0D9488', '#D97706', '#DB2777', '#64748B'];

const BRAND_ELEMENT_BUTTONS = ['Text', 'Visual', 'Badge', 'Logo'];

function getCodenameSubtitle(series: string): string {
  const s = series.toLowerCase();
  if (s.includes('series 3') || s.includes('series3')) return 'Panther Lake (Till Date)';
  if (s.includes('series 2') || s.includes('series2')) return 'Lunar Lake / Arrow Lake';
  if (s.includes('series 1') || s.includes('series1')) return 'Meteor Lake';
  if (s.includes('14th')) return 'Raptor Lake Refresh';
  if (s.includes('13th')) return 'Raptor Lake';
  if (s.includes('12th')) return 'Alder Lake';
  if (s.includes('11th')) return 'Tiger Lake';
  if (s.includes('10th')) return 'Comet Lake / Ice Lake';
  return 'Region Proportion vs Other';
}

export default function ProductMixPage() {
  const [data, setData] = useState<ProductMixResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [quarterFilter, setQuarterFilter] = useState<string>('All Quarters');
  const [regionFilter, setRegionFilter] = useState<string>('All Regions');
  const [countryFilter, setCountryFilter] = useState<string>('All Countries');
  const [retailerFilter, setRetailerFilter] = useState<string>('All Retailers');
  const [yearFilter, setYearFilter] = useState<string>('All Years');
  const [topAccountFilter, setTopAccountFilter] = useState<string>('All');
  const [familyFilter, setFamilyFilter] = useState<string>('Intel Core Ultra');
  const [targetSeriesFilter, setTargetSeriesFilter] = useState<string>('Core Ultra Series 3');
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [brandElement, setBrandElement] = useState<string>('');

  const toggleFamilySelection = (fam: string) => {
    setSelectedFamilies((prev) =>
      prev.includes(fam) ? prev.filter((f) => f !== fam) : [...prev, fam]
    );
  };

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
    if (yearFilter && yearFilter !== 'All' && yearFilter !== 'All Years') {
      params.append('year', yearFilter);
    }
    if (topAccountFilter && topAccountFilter !== 'All') {
      params.append('top_account', topAccountFilter);
    }
    if (familyFilter) {
      params.append('family', familyFilter);
    }
    if (targetSeriesFilter) {
      params.append('target_series', targetSeriesFilter);
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';

    api
      .get<ProductMixResponse>(`/api/reports/product-mix/${queryString}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.data) {
          setData(res.data);
          if (res.data.active_family && !familyFilter) {
            setFamilyFilter(res.data.active_family);
          }
          if (res.data.target_series && !targetSeriesFilter) {
            setTargetSeriesFilter(res.data.target_series);
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        const msg = err.response?.data?.error || err.message || 'Failed to load product mix data.';
        setError(msg);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [quarterFilter, regionFilter, countryFilter, retailerFilter, yearFilter, topAccountFilter, familyFilter, targetSeriesFilter]);

  const families = data?.all_families || [];
  const retailerMix = (data?.retailer_product_mix || []).filter((row) => !isSkippedRetailer(row.retailer));
  const retailerQueries = (data?.retailer_queries || []).filter((row) => !isSkippedRetailer(row.retailer));
  const retailerOptions = (data?.filter_options?.retailers || ['All Retailers']).filter(
    (r) => r === 'All Retailers' || !isSkippedRetailer(r)
  );
  const regionData = data?.series3_by_region || [];
  const genData = (data?.gen_series_breakdown || []).map((item) => ({
    ...item,
    label:
      item.label === 'Unspecified Series' ||
      item.label === 'Unspecified Generation' ||
      item.label === 'Unspecified'
        ? 'Series/Gen not specified'
        : item.label,
  }));
  const seriesOptions = data?.series_options || [
    'Core Ultra Series 3',
    'Core Ultra Series 2',
    'Core Ultra Series 1',
    'Core 14th Gen',
    'Core 13th Gen',
    'Core 12th Gen',
    'Core 11th Gen',
    'Core 10th Gen',
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#111827]">
              Product{" "}
              <span className="bg-gradient-to-r from-[#1E429F] via-[#0D9488] to-[#6366F1] bg-clip-text text-transparent inline-block">
                Momentum
              </span>
            </h1>
          </div>
          <p className="text-xs md:text-sm text-[#6B7280] mt-1">
            See which Intel products are gaining visibility across retailers and markets – and where priority products have room to grow.
          </p>
        </div>

        {/* Filters: row 1 geo/retailer, row 2 year/quarter/top account */}
        <div className="w-full lg:w-[min(100%,540px)] flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-1.5 min-w-0 h-9 bg-white/95 border border-[#E5E7EB] shadow-2xs px-2.5 rounded-xl text-xs font-bold text-[#111827]">
              <span className="text-[#6B7280] font-medium shrink-0">Region:</span>
              <select
                value={regionFilter}
                onChange={(e) => {
                  setRegionFilter(e.target.value);
                  setCountryFilter('All Countries');
                }}
                className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer min-w-0 flex-1"
              >
                {(data?.filter_options?.regions || ['All Regions']).map((r) => (
                  <option key={r} value={r} className="bg-white text-[#111827]">
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 min-w-0 h-9 bg-white/95 border border-[#E5E7EB] shadow-2xs px-2.5 rounded-xl text-xs font-bold text-[#111827]">
              <span className="text-[#6B7280] font-medium shrink-0">Country:</span>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer min-w-0 flex-1"
              >
                {(data?.filter_options?.countries || ['All Countries']).map((c) => (
                  <option key={c} value={c} className="bg-white text-[#111827]">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 min-w-0 h-9 bg-white/95 border border-[#E5E7EB] shadow-2xs px-2.5 rounded-xl text-xs font-bold text-[#111827]">
              <span className="text-[#6B7280] font-medium shrink-0">Retailer:</span>
              <select
                value={retailerFilter}
                onChange={(e) => setRetailerFilter(e.target.value)}
                className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer min-w-0 flex-1"
              >
                {retailerOptions.map((r) => (
                  <option key={r} value={r} className="bg-white text-[#111827]">
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-1.5 min-w-0 h-9 bg-white/95 border border-[#E5E7EB] shadow-2xs px-2.5 rounded-xl text-xs font-bold text-[#111827]">
              <span className="text-[#6B7280] font-medium shrink-0">Year:</span>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer min-w-0 flex-1"
              >
                {(data?.filter_options?.years || ['All Years']).map((y) => (
                  <option key={y} value={y} className="bg-white text-[#111827]">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 min-w-0 h-9 bg-white/95 border border-[#E5E7EB] shadow-2xs px-2.5 rounded-xl text-xs font-bold text-[#111827]">
              <span className="text-[#6B7280] font-medium shrink-0">Quarter:</span>
              <select
                value={quarterFilter}
                onChange={(e) => setQuarterFilter(e.target.value)}
                className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer min-w-0 flex-1"
              >
                {(data?.filter_options?.quarters || ['All Quarters']).map((q) => (
                  <option key={q} value={q} className="bg-white text-[#111827]">
                    {q}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 min-w-0 h-9 bg-white/95 border border-[#E5E7EB] shadow-2xs px-2.5 rounded-xl text-xs font-bold text-[#111827]">
              <span className="text-[#6B7280] font-medium shrink-0">Top Account:</span>
              <select
                value={topAccountFilter}
                onChange={(e) => setTopAccountFilter(e.target.value)}
                className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer min-w-0 flex-1"
              >
                {(data?.filter_options?.top_accounts || ['All', 'Yes', 'No']).map((t) => (
                  <option key={t} value={t} className="bg-white text-[#111827]">
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>


      {/* ── Error Banner ────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs md:text-sm font-semibold flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            onClick={() => setFamilyFilter((prev) => prev)}
            className="text-xs underline hover:text-rose-900 cursor-pointer font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Retailer queries + compliance guidance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col min-h-[420px]">
          <div className="pb-3 border-b border-[#E5E7EB]">
            <h3 className="text-sm font-bold text-[#111827] tracking-tight">
              Retailer-wise Queries
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Helpdesk query count by retailer (child account) for the selected filters.
            </p>
          </div>
          <div className="w-full flex-1 min-h-[320px] mt-3">
            {loading && !data ? (
              <div className="w-full h-full bg-[#F8FAFC] rounded-xl animate-pulse flex items-center justify-center">
                <span className="text-xs font-semibold text-[#6B7280]">Loading query counts...</span>
              </div>
            ) : retailerQueries.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[#6B7280]">
                No Helpdesk queries found for the selected filters.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={retailerQueries}
                  margin={{ top: 8, right: 36, left: 10, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis
                    dataKey="retailer"
                    type="category"
                    width={110}
                    tick={{ fontSize: 10, fill: '#111827', fontWeight: 600 }}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val} queries`, 'Helpdesk Queries']}
                    contentStyle={{ borderRadius: '0.5rem', fontSize: '12px', borderColor: '#E5E7EB' }}
                  />
                  <Bar dataKey="queries" fill="#1E429F" radius={[0, 4, 4, 0]} barSize={14}>
                    <LabelList dataKey="queries" position="right" fill="#111827" fontSize={11} fontWeight={700} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col min-h-[420px]">
          <div className="pb-3 border-b border-[#E5E7EB]">
            <h3 className="text-sm font-bold text-[#111827] tracking-tight">
              Creative Compliance Guidance
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Explore creative compliance guidance via BASCO Helpdesk by selecting a brand element.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {(data?.brand_elements || BRAND_ELEMENT_BUTTONS).map((item) => {
                const selected = brandElement === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setBrandElement((prev) => (prev === item ? '' : item))}
                    aria-pressed={selected}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selected
                        ? 'bg-[#1E429F] text-white shadow-xs'
                        : 'bg-[#F8FAFC] text-[#6B7280] border border-[#E5E7EB] hover:text-[#111827] hover:bg-slate-100'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="w-full flex-1 min-h-[280px] mt-3">
            {loading && !data ? (
              <div className="w-full h-full bg-[#F8FAFC] rounded-xl animate-pulse flex items-center justify-center">
                <span className="text-xs font-semibold text-[#6B7280]">Loading compliance mix...</span>
              </div>
            ) : !brandElement ? (
              <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[#6B7280] text-center px-4">
                Select Text, Visual, Badge, or Logo to view category counts.
              </div>
            ) : (data?.compliance_guidance_by_element?.[brandElement] || []).length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[#6B7280]">
                No {brandElement.toLowerCase()} feedback found for the selected filters.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.compliance_guidance_by_element?.[brandElement] || []}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="46%"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={2}
                  >
                    {(data?.compliance_guidance_by_element?.[brandElement] || []).map((g, idx) => (
                      <Cell key={g.label} fill={GUIDANCE_SLICE_COLORS[idx % GUIDANCE_SLICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val}`, name]}
                    contentStyle={{ borderRadius: '0.5rem', fontSize: '12px', borderColor: '#E5E7EB' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                    formatter={(value: string) => {
                      const item = (data?.compliance_guidance_by_element?.[brandElement] || []).find((g) => g.label === value);
                      return (
                        <span className="text-[10px] font-medium text-[#111827] leading-tight">
                          {`${value} (${item?.count ?? 0})`}
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── 3-Panel Grid Layout ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ══════════════════════════════════════════════════════════ */}
        {/* LEFT PANEL: 27% Width (lg:col-span-3)                      */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col justify-between min-h-[600px]">
          <div>
            <div className="flex flex-col gap-2 pb-3 border-b border-[#E5E7EB]">
              <h3 className="text-sm font-bold text-[#111827] tracking-tight">
                {targetSeriesFilter.includes('Series 3')
                  ? 'Core Ultra Series 3 Market Adoption'
                  : `${targetSeriesFilter} Market Adoption`}
              </h3>
              
              {/* Target Series Dropdown Selector */}
              <div className="flex items-center gap-1.5 bg-[#1E429F]/10 border border-[#1E429F]/20 px-2.5 py-1.5 rounded-lg">
                <span className="text-[11px] font-bold text-[#1E429F] whitespace-nowrap">Series:</span>
                <select
                  value={targetSeriesFilter}
                  onChange={(e) => setTargetSeriesFilter(e.target.value)}
                  className="bg-transparent text-[#1E429F] text-xs font-extrabold focus:outline-none cursor-pointer w-full"
                >
                  {seriesOptions.map((s) => (
                    <option key={s} value={s} className="text-[#111827] bg-white">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-[#1E429F] font-semibold mt-1.5">
              {getCodenameSubtitle(targetSeriesFilter)}
            </p>
          </div>


          <div className="w-full h-[360px] mt-3 flex items-center justify-center">
            {loading && !data ? (
              <div className="w-full h-full bg-[#F8FAFC] rounded-xl animate-pulse flex items-center justify-center">
                <span className="text-xs font-semibold text-[#6B7280]">Loading region data...</span>
              </div>
            ) : regionData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[#6B7280] text-center p-4">
                No regional adoption data found for {targetSeriesFilter}.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  data={regionData}
                  margin={{ top: 25, right: 10, left: 10, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="region"
                    tick={{ fontSize: 12, fill: '#111827', fontWeight: 600 }}
                  />
                  <YAxis hide domain={[0, 'dataMax + 60']} />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      val,
                      name === 'series_count' || name === 'series3'
                        ? `${targetSeriesFilter} Creatives`
                        : 'Other Creatives',
                    ]}
                    labelFormatter={(label: any) => `Region: ${label}`}
                    contentStyle={{
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                      borderColor: '#E5E7EB',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  {/* Bottom: selected series (Blue #1E429F) */}
                  <Bar
                    dataKey="series_count"
                    stackId="adoptionStack"
                    fill="#1E429F"
                    radius={[0, 0, 4, 4]}
                    barSize={38}
                  />
                  {/* Top: other (Grey #CBD5E1) */}
                  <Bar
                    dataKey="other"
                    stackId="adoptionStack"
                    fill="#CBD5E1"
                    radius={[4, 4, 0, 0]}
                    barSize={38}
                  >
                    <LabelList
                      dataKey="series_pct"
                      position="top"
                      fill="#1E429F"
                      fontSize={11}
                      fontWeight={800}
                      formatter={(v: any) => (Number(v) > 0 ? `${v}%` : '')}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* CENTRE PANEL: 45% Width (lg:col-span-5)                    */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col justify-between min-h-[620px] h-full">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#111827] tracking-tight">
                Product Visibility Across Retailers
              </h3>
              {selectedFamilies.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedFamilies([])}
                  className="text-[11px] font-bold text-[#1E429F] hover:text-[#162E6E] bg-[#1E429F]/10 hover:bg-[#1E429F]/20 px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>Reset selection ({selectedFamilies.length})</span>
                  <span>✕</span>
                </button>
              )}
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              See which Intel product families are showing up across retailer marketing.
            </p>
          </div>

          <div className="w-full flex-1 min-h-[460px] mt-3 flex items-center justify-center">
            {loading && !data ? (
              <div className="w-full h-full bg-[#F8FAFC] rounded-xl animate-pulse flex items-center justify-center">
                <span className="text-xs font-semibold text-[#6B7280]">Loading retailer mix...</span>
              </div>
            ) : retailerMix.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[#6B7280] text-center p-4">
                No retailer product mix found.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={retailerMix}
                  margin={{ top: 10, right: 20, left: 25, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                  />
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
                  {families.map((fam) => {
                    const isSelected = selectedFamilies.includes(fam);
                    const isAnySelected = selectedFamilies.length > 0;
                    const baseColor = FAMILY_COLORS[fam] || DEFAULT_FAMILY_COLOR;

                    return (
                      <Bar
                        key={fam}
                        dataKey={fam}
                        name={fam}
                        stackId="retailerStack"
                        fill={isAnySelected && !isSelected ? '#CBD5E1' : baseColor}
                        opacity={isAnySelected && !isSelected ? 0.22 : 1}
                        barSize={16}
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Interactive Multi-Select Legend Below Chart */}
          <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                {selectedFamilies.length > 0
                  ? `Highlighting (${selectedFamilies.length} selected):`
                  : 'Click product families to multi-select & highlight:'}
              </span>
              {selectedFamilies.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedFamilies([])}
                  className="text-[10px] text-[#1E429F] font-bold hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {families.map((fam) => {
                const isSelected = selectedFamilies.includes(fam);
                const isDimmed = selectedFamilies.length > 0 && !isSelected;
                const color = FAMILY_COLORS[fam] || DEFAULT_FAMILY_COLOR;

                return (
                  <button
                    key={fam}
                    type="button"
                    onClick={() => toggleFamilySelection(fam)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-[#1E429F]/40'
                        : isDimmed
                        ? 'bg-slate-50 text-slate-400 border-slate-200 opacity-60 hover:opacity-100'
                        : 'bg-[#F8FAFC] text-[#111827] border-[#E5E7EB] hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate max-w-[150px]">{fam}</span>
                    {isSelected && (
                      <span className="text-[10px] ml-0.5 font-bold text-emerald-400">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* RIGHT PANEL: 28% Width (lg:col-span-4)                     */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col justify-between min-h-[620px] h-full">
          <div>
            {/* Family Dropdown Selector */}
            <div>
              <label
                htmlFor="family-select"
                className="text-xs font-bold uppercase tracking-wider text-[#111827] block mb-1.5"
              >
                Explore Product Family
              </label>
              <select
                id="family-select"
                value={familyFilter}
                onChange={(e) => setFamilyFilter(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827] text-xs font-semibold rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-[#1E429F] focus:outline-none cursor-pointer transition-all"
              >
                {(data?.family_options || ['Intel Core Ultra']).map((fam) => (
                  <option key={fam} value={fam}>
                    {fam}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                Product Generation Adoption
              </h4>
              <p className="text-[11px] text-[#6B7280] mt-0.5">
                Generation mix across reviewed creatives.
              </p>
            </div>
          </div>

          <div className="w-full flex-1 min-h-[400px] mt-3 flex items-center justify-center">
            {loading && !data ? (
              <div className="w-full h-full bg-[#F8FAFC] rounded-xl animate-pulse flex items-center justify-center">
                <span className="text-xs font-semibold text-[#6B7280]">Loading generation mix...</span>
              </div>
            ) : genData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[#6B7280] text-center p-4">
                No generation breakdown found for {familyFilter}.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={genData}
                  margin={{ top: 25, right: 15, left: 15, bottom: 28 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="label"
                    interval={0}
                    height={42}
                    tick={<GenerationXAxisTick />}
                  />
                  <YAxis
                    width={35}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(val: any) => [val, 'Creatives Count']}
                    labelFormatter={(label: any) => `Generation/Series: ${label}`}
                    contentStyle={{
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                      borderColor: '#E5E7EB',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#1E429F"
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                  >
                    <LabelList
                      dataKey="count"
                      position="top"
                      fill="#6B7280"
                      fontSize={11}
                      fontWeight="bold"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
