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
} from 'recharts';
import api from '../api/client';

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
  filter_options: {
    quarters: string[];
    countries: string[];
  };
}

// Fixed color palette for product families
const FAMILY_COLORS: Record<string, string> = {
  'Gaming Core Ultra': '#7C3AED',
  'Gaming': '#DC2626',
  'Intel Core Ultra': '#2563EB',
  'Intel Core Processors': '#059669',
  'Intel Processors': '#0891B2',
  'Intel Evo Edition': '#D97706',
  'Intel Evo': '#EA580C',
  'Intel Arc Graphics': '#BE185D',
  'Intel Iris Graphics': '#4F46E5',
  'Other': '#6B7280',
};

const DEFAULT_FAMILY_COLOR = '#6B7280';

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
  const [countryFilter, setCountryFilter] = useState<string>('All Countries');
  const [familyFilter, setFamilyFilter] = useState<string>('Intel Core Ultra');
  const [targetSeriesFilter, setTargetSeriesFilter] = useState<string>('Core Ultra Series 3');

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
  }, [quarterFilter, countryFilter, familyFilter, targetSeriesFilter]);

  const families = data?.all_families || [];
  const retailerMix = data?.retailer_product_mix || [];
  const regionData = data?.series3_by_region || [];
  const genData = data?.gen_series_breakdown || [];
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
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#071739]">
              Product{" "}
              <span className="bg-gradient-to-r from-[#0062d2] via-[#0284c7] to-[#6366f1] bg-clip-text text-transparent inline-block">
                Promotion & Priorities
              </span>
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-50 text-cyan-700 border border-cyan-200/80 shadow-2xs">
              Pre Launch
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Regional Generation adoption, retailer-wise product family proportion, and generation breakdown.
          </p>
        </div>

        {/* Quarter & Country Dropdowns */}
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

      {/* ── 3-Panel Grid Layout ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ══════════════════════════════════════════════════════════ */}
        {/* LEFT PANEL: 27% Width (lg:col-span-3)                      */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between min-h-[600px]">
          <div>
            <div className="flex flex-col gap-2 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                {targetSeriesFilter.includes('Series 3')
                  ? 'Core Ultra Series 3 Market Adoption'
                  : `${targetSeriesFilter} Market Adoption`}
              </h3>
              
              {/* Target Series Dropdown Selector */}
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg">
                <span className="text-[11px] font-bold text-blue-900 whitespace-nowrap">Series:</span>
                <select
                  value={targetSeriesFilter}
                  onChange={(e) => setTargetSeriesFilter(e.target.value)}
                  className="bg-transparent text-blue-950 text-xs font-extrabold focus:outline-none cursor-pointer w-full"
                >
                  {seriesOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-blue-600 font-semibold mt-1.5">
              {getCodenameSubtitle(targetSeriesFilter)}
            </p>
          </div>


          <div className="w-full h-[360px] mt-3 flex items-center justify-center">
            {loading && !data ? (
              <div className="w-full h-full bg-slate-50 rounded-xl animate-pulse flex items-center justify-center">
                <span className="text-xs font-semibold text-slate-400">Loading region data...</span>
              </div>
            ) : regionData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs font-medium text-slate-400 text-center p-4">
                No regional adoption data found for {targetSeriesFilter}.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  data={regionData}
                  margin={{ top: 25, right: 10, left: 10, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="region"
                    tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }}
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
                      borderColor: '#e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  {/* Bottom: selected series (Blue #2563EB) */}
                  <Bar
                    dataKey="series_count"
                    stackId="adoptionStack"
                    fill="#2563EB"
                    radius={[0, 0, 4, 4]}
                    barSize={38}
                  >
                    <LabelList
                      dataKey="series_pct"
                      position="center"
                      fill="#ffffff"
                      fontSize={11}
                      fontWeight="bold"
                      formatter={(v: any) => (v >= 10 ? `${v}%` : '')}
                    />
                  </Bar>
                  {/* Top: other (Grey #374151) */}
                  <Bar
                    dataKey="other"
                    stackId="adoptionStack"
                    fill="#374151"
                    radius={[4, 4, 0, 0]}
                    barSize={38}
                  >
                    <LabelList
                      dataKey="series_pct"
                      position="top"
                      fill="#1e40af"
                      fontSize={11}
                      fontWeight="800"
                      formatter={(v: any) => `${v}%`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Regional Adoption Summary Cards below Chart */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Regional Breakdown:
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {regionData.map((r) => (
                <div
                  key={r.region}
                  className="flex items-center justify-between bg-slate-50 border border-slate-150 px-2.5 py-1.5 rounded-lg text-xs"
                >
                  <span className="font-bold text-slate-700">{r.region}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium text-[11px]">
                      {r.series_count ?? r.series3 ?? 0} / {r.total}
                    </span>
                    <span className="bg-blue-100 text-blue-800 text-[11px] font-extrabold px-1.5 py-0.5 rounded">
                      {r.series_pct ?? r.series3_pct ?? 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* CENTRE PANEL: 45% Width (lg:col-span-5)                    */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between min-h-[600px]">
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">
              Product Promotion by Retailer
            </h3>
          </div>

          <div className="w-full h-[450px] mt-4 flex items-center justify-center">
            {loading && !data ? (
              <div className="w-full h-full bg-slate-50 rounded-xl animate-pulse flex items-center justify-center">
                <span className="text-xs font-semibold text-slate-400">Loading retailer mix...</span>
              </div>
            ) : retailerMix.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs font-medium text-slate-400 text-center p-4">
                No retailer product mix found.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={440}>
                <BarChart
                  layout="vertical"
                  data={retailerMix}
                  margin={{ top: 10, right: 20, left: 25, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
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
                  {families.map((fam) => (
                    <Bar
                      key={fam}
                      dataKey={fam}
                      name={fam}
                      stackId="retailerStack"
                      fill={FAMILY_COLORS[fam] || DEFAULT_FAMILY_COLOR}
                      barSize={14}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend Below Chart */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-x-3 gap-y-1.5 justify-center text-[10px]">
            {families.map((fam) => (
              <div key={fam} className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: FAMILY_COLORS[fam] || DEFAULT_FAMILY_COLOR }}
                />
                <span className="text-slate-600 font-medium">{fam}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* RIGHT PANEL: 28% Width (lg:col-span-4)                     */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between min-h-[600px]">
          <div>
            {/* Family Dropdown Selector */}
            <div>
              <label
                htmlFor="family-select"
                className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5"
              >
                Explore Product Family
              </label>
              <select
                id="family-select"
                value={familyFilter}
                onChange={(e) => setFamilyFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer transition-all"
              >
                {(data?.family_options || ['Intel Core Ultra']).map((fam) => (
                  <option key={fam} value={fam}>
                    {fam}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Product Generation Adoption
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Breakdown for {familyFilter}
              </p>
            </div>
          </div>

          <div className="w-full h-[420px] mt-4 flex items-center justify-center">
            {loading && !data ? (
              <div className="w-full h-full bg-slate-50 rounded-xl animate-pulse flex items-center justify-center">
                <span className="text-xs font-semibold text-slate-400">Loading generation mix...</span>
              </div>
            ) : genData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs font-medium text-slate-400 text-center p-4">
                No generation breakdown found for {familyFilter}.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={genData}
                  margin={{ top: 25, right: 15, left: 10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(val: any) => [val, 'Creatives Count']}
                    labelFormatter={(label: any) => `Generation/Series: ${label}`}
                    contentStyle={{
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                      borderColor: '#e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#2563EB"
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                  >
                    <LabelList
                      dataKey="count"
                      position="top"
                      fill="#64748b"
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
