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

// Distinct, harmonious color palette ensuring every product family has a unique, distinguishable color
const FAMILY_COLORS: Record<string, string> = {
  'Intel Core Ultra': '#1E429F',       // 1. Deep Sapphire Blue (Flagship Hero)
  'Gaming Core Ultra': '#7C3AED',      // 2. Vibrant Purple / Violet
  'Intel Core Processors': '#0284C7',  // 3. Electric Ocean Blue
  'Intel Processors': '#0D9488',       // 4. Rich Teal / Sea Green
  'Intel Evo Edition': '#D97706',      // 5. Warm Amber / Gold
  'Intel Evo': '#EA580C',              // 6. Tangerine Orange
  'Gaming': '#4338CA',                 // 7. Midnight Indigo
  'Intel Arc Graphics': '#DB2777',     // 8. Arc Magenta / Rose
  'Intel Iris Graphics': '#06B6D4',    // 9. Bright Cyan
  'Other': '#94A3B8',                  // 10. Cool Slate Grey
};

const DEFAULT_FAMILY_COLOR = '#94A3B8';

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
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);

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

        {/* Quarter & Country Dropdowns */}
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
                      fontWeight="800"
                      formatter={(v: any) => `${v}%`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Regional Adoption Summary Cards below Chart */}
          <div className="mt-3 pt-3 border-t border-[#E5E7EB] flex flex-col gap-2">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
              Regional Adoption:
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {regionData.map((r) => (
                <div
                  key={r.region}
                  className="flex items-center justify-between bg-[#F8FAFC] border border-[#E5E7EB] px-2.5 py-1.5 rounded-lg text-xs"
                >
                  <span className="font-bold text-[#111827]">{r.region}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#6B7280] font-medium text-[11px]">
                      {r.series_count ?? r.series3 ?? 0} / {r.total}
                    </span>
                    <span className="bg-[#1E429F]/10 text-[#1E429F] text-[11px] font-extrabold px-1.5 py-0.5 rounded">
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
                  margin={{ top: 25, right: 15, left: 15, bottom: 45 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10.5, fill: '#111827', fontWeight: 600 }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={55}
                    dx={-2}
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
