// src/pages/VisualAdoptionPage.tsx
// Visual Adoption Page — Intel Master Visual usage across retailers

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
  Cell,
  ReferenceLine,
} from 'recharts';
import api from '../api/client';
import ImageModal from '../components/common/ImageModal';

interface PMSVisual {
  PMSVisual_ID: number | string;
  PMSVisual_Name: string;
  PMSVisual_Label?: string;
  PMSVisual_URL: string;
  Content?: string;
}

interface RetailerAdoption {
  retailer: string;
  total_creatives: number;
  intel_visual_creatives: number;
  adoption_pct: number;
}

interface SelectedVisualStats {
  visual_name: string;
  thumbnail_url: string;
  creative_count: number;
  adoption_pct: number;
}

interface RetailerVisualBreakdown {
  retailer: string;
  count: number;
}

interface UsageTableRow {
  master_visual_url: string;
  master_visual_name: string;
  actual_creative_url: string;
  retailer: string;
  campaign: string;
  products: string;
  offer: string;
  cta: string;
  usage: string;
  quarter_label?: string;
  Region?: string;
  Country?: string;
}

interface VisualAdoptionResponse {
  kpis: {
    total_creatives: number;
    used_intel_visuals: number;
    master_visual_adoption_pct: number;
  };
  source?: string;
  retailer_adoption: RetailerAdoption[];
  pms_visuals: PMSVisual[];
  default_visual?: string;
  selected_visual_stats: SelectedVisualStats | null;
  retailer_visual_breakdown: RetailerVisualBreakdown[];
  usage_table?: UsageTableRow[];
  filter_options: {
    quarters: string[];
    regions?: string[];
    countries: string[];
    retailers?: string[];
    visual_styles: string[];
  };
}

function visualLabel(pv: PMSVisual): string {
  return pv.PMSVisual_Label || pv.PMSVisual_Name;
}

export default function VisualAdoptionPage() {
  const [data, setData] = useState<VisualAdoptionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [quarterFilter, setQuarterFilter] = useState<string>('All');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [countryFilter, setCountryFilter] = useState<string>('All');
  const [visualStyleFilter, setVisualStyleFilter] = useState<string>('All');
  const [selectedVisual, setSelectedVisual] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<'pop' | 'helpdesk'>('helpdesk');
  const [tableRetailerFilter, setTableRetailerFilter] = useState<string>('All');
  const [usageFilter, setUsageFilter] = useState<string>('All');
  const [selectedPreview, setSelectedPreview] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  const [imgError, setImgError] = useState<boolean>(false);

  // Fetch data whenever filters or selected visual changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setImgError(false);

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
    if (visualStyleFilter && visualStyleFilter !== 'All') {
      params.append('visual_style', visualStyleFilter);
    }
    if (sourceFilter) {
      params.append('source', sourceFilter);
    }
    if (selectedVisual) {
      params.append('visual_name', selectedVisual);
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';

    api
      .get<VisualAdoptionResponse>(`/api/reports/visual-adoption/${queryString}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.data) {
          setData(res.data);
          // By default, select the latest visual returned by the backend
          if (!selectedVisual) {
            const defaultName = res.data.default_visual || res.data.pms_visuals?.[0]?.PMSVisual_Name;
            if (defaultName) {
              setSelectedVisual(defaultName);
            }
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        const msg = err.response?.data?.error || err.message || 'Failed to load visual adoption data.';
        setError(msg);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [quarterFilter, regionFilter, countryFilter, visualStyleFilter, selectedVisual, sourceFilter]);

  // Top 15 retailers for left chart
  const topRetailersAdoption = (data?.retailer_adoption || []).slice(0, 15);

  // Top 15 retailers for selected visual (right chart)
  const topRetailersVisualBreakdown = (data?.retailer_visual_breakdown || []).slice(0, 15);

  // Get active thumbnail URL
  const activePmsVisual = data?.pms_visuals?.find((p) => p.PMSVisual_Name === selectedVisual);
  const currentThumbnail =
    data?.selected_visual_stats?.thumbnail_url || activePmsVisual?.PMSVisual_URL || '';
  const selectedVisualLabel =
    (activePmsVisual && visualLabel(activePmsVisual)) || selectedVisual;

  const usageRows = (data?.usage_table || []).filter((row) => {
    const retailerOk =
      tableRetailerFilter === 'All' ||
      tableRetailerFilter === 'All Retailers' ||
      row.retailer === tableRetailerFilter;
    const usageOk =
      usageFilter === 'All' ||
      usageFilter === 'All Usage' ||
      row.usage === usageFilter;
    return retailerOk && usageOk;
  });

  const tableRetailerOptions = data?.filter_options?.retailers?.length
    ? data.filter_options.retailers
    : ['All'];

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#111827]">
              <span className="bg-gradient-to-r from-[#1E429F] via-[#0D9488] to-[#6366F1] bg-clip-text text-transparent inline-block">
                Brand &amp; Visual Adoption
              </span>
            </h1>
          </div>
          <p className="text-xs md:text-sm text-[#6B7280] mt-1">
            See how Intel-approved campaign visuals are being activated across retailers – and where adoption can grow.
          </p>
        </div>

        {/* Source + Quarter, Region, Country */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          <div className="inline-flex rounded-xl border border-[#E5E7EB] overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => setSourceFilter('pop')}
              className={`px-3 py-2 text-[11px] font-bold transition-colors ${
                sourceFilter === 'pop'
                  ? 'bg-[#1E429F] text-white'
                  : 'bg-white text-[#6B7280] hover:bg-[#F8FAFC]'
              }`}
            >
              POP creatives
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('helpdesk')}
              className={`px-3 py-2 text-[11px] font-bold transition-colors border-l border-[#E5E7EB] ${
                sourceFilter === 'helpdesk'
                  ? 'bg-[#0D9488] text-white'
                  : 'bg-white text-[#6B7280] hover:bg-[#F8FAFC]'
              }`}
            >
              Helpdesk creatives
            </button>
          </div>

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
              onChange={(e) => {
                setRegionFilter(e.target.value);
                setCountryFilter('All');
              }}
              className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer pr-1"
            >
              {(data?.filter_options?.regions || ['All']).map((r) => (
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
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs md:text-sm font-semibold flex items-center justify-between shadow-2xs">
          <span>⚠️ {error}</span>
          <button
            onClick={() => setSelectedVisual((prev) => prev)}
            className="text-xs underline hover:text-rose-900 cursor-pointer font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── KPI Cards: 3 Metric Tiles ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Creatives Reviewed */}
        <div className="bg-white rounded-2xl p-4.5 shadow-sm border border-[#E5E7EB] flex flex-col justify-between min-h-[104px]">
          <span className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">
            Creatives Reviewed
          </span>
          {loading && !data ? (
            <div className="h-8 bg-slate-100 rounded animate-pulse w-1/2 mt-2" />
          ) : (
            <div className="text-2xl md:text-3xl font-black text-[#111827] tracking-tight mt-1">
              {data?.kpis?.total_creatives?.toLocaleString() ?? 0}
            </div>
          )}
        </div>

        {/* Card 2: Intel Visuals in Use */}
        <div className="bg-gradient-to-br from-[#0B1325] to-[#1C3668] rounded-2xl p-4.5 shadow-md border border-[#1C3668]/30 flex flex-col justify-between min-h-[104px] text-white">
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-200">
            Intel Visuals in Use
          </span>
          {loading && !data ? (
            <div className="h-8 bg-slate-700/60 rounded animate-pulse w-1/2 mt-2" />
          ) : (
            <div className="flex items-baseline justify-between mt-1">
              <div className="text-2xl md:text-3xl font-black text-[#0EA5E9] tracking-tight">
                {data?.kpis?.used_intel_visuals?.toLocaleString() ?? 0}
              </div>
              <span className="text-[10px] text-slate-300 font-medium">
                (Intel Layouts)
              </span>
            </div>
          )}
        </div>

        {/* Card 3: Intel Visual Adoption */}
        <div className="bg-gradient-to-br from-[#1C3668] to-[#0EA5E9] rounded-2xl p-4.5 shadow-md border border-[#0EA5E9]/40 flex flex-col justify-between min-h-[104px] text-white">
          <span className="text-[10px] font-bold tracking-wider uppercase text-white/90">
            Intel Visual Adoption
          </span>
          {loading && !data ? (
            <div className="h-8 bg-blue-800/60 rounded animate-pulse w-1/2 mt-2" />
          ) : (
            <div className="flex items-baseline justify-between mt-1">
              <div className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {data?.kpis?.master_visual_adoption_pct ?? 0}%
              </div>
              <span className="text-[10px] text-white/80 font-medium">
                (Intel + Custom Layouts)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── 2-Column Main Section (60% / 40% Desktop Split) ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ══════════════════════════════════════════════════════════ */}
        {/* LEFT COLUMN: 60% Width (lg:col-span-7)                     */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 flex flex-col">
          {/* Left Chart Card: Visual Adoption Across Retailers */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col justify-between h-full">
            <div>
              {/* Header + Visual Style Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-[#E5E7EB]">
                <h3 className="text-sm font-bold text-[#111827] tracking-tight">
                  Visual Adoption Across Retailers
                </h3>

                {/* Visual Style Filter Dropdown */}
                <div className="flex items-center gap-1.5 bg-[#1E429F] hover:bg-[#162E6E] transition-colors text-white px-3 py-1.5 rounded-lg shadow-xs self-start sm:self-auto">
                  <span className="text-xs font-semibold">Visual Style:</span>
                  <select
                    value={visualStyleFilter}
                    onChange={(e) => setVisualStyleFilter(e.target.value)}
                    className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
                  >
                    {(data?.filter_options?.visual_styles || ['All']).map((vs) => (
                      <option key={vs} value={vs} className="bg-slate-900 text-white">
                        {vs}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-xs text-[#6B7280] mb-2">
                Share of retailer creatives using approved Intel campaign visuals.
              </p>
              
              <div className="flex flex-wrap items-center gap-3 text-[10px] mb-2 font-bold">
                <span className="text-[#6B7280] uppercase tracking-wider">Adoption Tiers:</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#1E429F]"></span>
                  <span className="text-[#1E429F]">On Track (≥90%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#0EA5E9]"></span>
                  <span className="text-[#0EA5E9]">Watch (80-89%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#94A3B8]"></span>
                  <span className="text-[#64748B]">Action Required (&lt;80%)</span>
                </div>
              </div>
            </div>

            {/* Horizontal Bar Chart — Stretches cleanly to fill available height */}
            <div className="w-full flex-1 min-h-[540px] mt-2">
              {loading && !data ? (
                <div className="w-full h-full bg-[#F8FAFC] rounded-xl animate-pulse flex items-center justify-center">
                  <span className="text-xs font-semibold text-[#6B7280]">Loading chart data...</span>
                </div>
              ) : topRetailersAdoption.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[#6B7280]">
                  No retailer adoption data found for the selected filters.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={topRetailersAdoption}
                    margin={{ top: 10, right: 48, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      unit="%"
                      tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }}
                    />
                    <YAxis
                      dataKey="retailer"
                      type="category"
                      width={140}
                      interval={0}
                      tick={{ fontSize: 11, fill: '#111827', fontWeight: 600 }}
                    />
                    <Tooltip
                      formatter={(val: any, _name: any, item: any) => [
                        `${val}% (${item.payload.intel_visual_creatives} / ${item.payload.total_creatives} creatives)`,
                        'Adoption Rate',
                      ]}
                      labelFormatter={(label: any) => `Retailer: ${label}`}
                      contentStyle={{
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        borderColor: '#E5E7EB',
                        backgroundColor: '#071739',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.25)',
                      }}
                      itemStyle={{ color: '#0EA5E9', fontWeight: 600 }}
                      labelStyle={{ color: '#ffffff', fontWeight: 700, marginBottom: '4px' }}
                    />
                    <ReferenceLine x={90} stroke="#64748B" strokeDasharray="3 3" strokeWidth={1} />
                    <Bar
                      dataKey="adoption_pct"
                      radius={[0, 5, 5, 0]}
                      barSize={18}
                    >
                      {topRetailersAdoption.map((entry, index) => {
                        let color = '#1E429F'; // >= 90%
                        if (entry.adoption_pct < 80) color = '#94A3B8';
                        else if (entry.adoption_pct < 90) color = '#0EA5E9';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                      <LabelList
                        dataKey="adoption_pct"
                        position="right"
                        formatter={(val: any) => `${val}%`}
                        fill="#111827"
                        fontSize={11}
                        fontWeight={700}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Dynamic Observation */}
            {(() => {
              const actionRequiredCount = (data?.retailer_adoption || []).filter(r => r.adoption_pct < 80).length;
              if (actionRequiredCount > 0) {
                return (
                  <div className="mt-3 pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                    <span className="text-[11px] text-[#6B7280] font-medium">
                      <strong className="text-[#111827]">{actionRequiredCount} retailer{actionRequiredCount !== 1 ? 's' : ''}</strong> {actionRequiredCount === 1 ? 'has' : 'have'} visual adoption below 80%, representing an immediate opportunity for alignment.
                    </span>
                  </div>
                );
              }
              if (data && data.retailer_adoption && data.retailer_adoption.length > 0) {
                return (
                  <div className="mt-3 pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                    <span className="text-[11px] text-[#1E429F] font-bold">
                      All monitored retailers have visual adoption of 80% or higher. Great alignment!
                    </span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* RIGHT COLUMN: 40% Width (lg:col-span-5)                    */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 flex flex-col gap-6 justify-between">
          {/* Master Visual Selector Card */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col gap-4">
            <div>
              <label
                htmlFor="visual-select"
                className="text-xs font-bold uppercase tracking-wider text-[#111827] block mb-1.5"
              >
                Explore Intel Campaign Visuals
              </label>
              <select
                id="visual-select"
                value={selectedVisual}
                onChange={(e) => {
                  setSelectedVisual(e.target.value);
                  setImgError(false);
                }}
                className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827] text-xs font-semibold rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-[#1E429F] focus:outline-none cursor-pointer transition-all"
              >
                {(data?.pms_visuals || []).map((pv) => (
                  <option key={pv.PMSVisual_ID} value={pv.PMSVisual_Name}>
                    {visualLabel(pv)}
                  </option>
                ))}
              </select>
            </div>

            {/* Thumbnail Image Banner */}
            <div className="w-full h-[180px] rounded-xl overflow-hidden bg-slate-900 relative flex items-center justify-center border border-slate-800 shadow-inner">
              {currentThumbnail && !imgError ? (
                <img
                  src={currentThumbnail}
                  alt={selectedVisualLabel || 'Master Visual'}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="p-4 text-center">
                  <span className="text-2xl block mb-1">🖼️</span>
                  <span className="text-xs font-bold text-slate-300">
                    {selectedVisualLabel || 'No Visual Selected'}
                  </span>
                  <span className="text-[10px] text-[#6B7280] block mt-0.5">
                    {imgError ? 'Image not reachable' : 'Preview placeholder'}
                  </span>
                </div>
              )}
              {selectedVisual && (
                <span className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  {selectedVisualLabel}
                </span>
              )}
            </div>
          </div>

          {/* Right Chart Card: Retailer Usage of Selected Visual */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col justify-between flex-1">
            <div className="mb-4 pb-3 border-b border-[#E5E7EB]">
              <h3 className="text-sm font-bold text-[#111827] tracking-tight">
                Retailer Usage of Selected Visual
              </h3>
              <p className="text-[11px] text-[#6B7280] mt-0.5">
                Distribution of the selected Intel visual across retail partners.
              </p>
            </div>

            {/* Horizontal Bar Chart */}
            <div className="w-full flex-1 min-h-[220px]">
              {loading && !data ? (
                <div className="w-full h-full bg-[#F8FAFC] rounded-xl animate-pulse flex items-center justify-center">
                  <span className="text-xs font-semibold text-[#6B7280]">Loading breakdown...</span>
                </div>
              ) : topRetailersVisualBreakdown.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[#6B7280]">
                  No creatives found using {selectedVisual || 'this visual'}.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={topRetailersVisualBreakdown}
                    margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }}
                      allowDecimals={false}
                    />
                    <YAxis
                      dataKey="retailer"
                      type="category"
                      width={130}
                      interval={0}
                      tick={{ fontSize: 11, fill: '#111827', fontWeight: 600 }}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${val} creatives`, 'Usage Count']}
                      labelFormatter={(label: any) => `Retailer: ${label}`}
                      contentStyle={{
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        borderColor: '#E5E7EB',
                        backgroundColor: '#071739',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.25)',
                      }}
                      itemStyle={{ color: '#0EA5E9', fontWeight: 600 }}
                      labelStyle={{ color: '#ffffff', fontWeight: 700, marginBottom: '4px' }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#0EA5E9"
                      radius={[0, 5, 5, 0]}
                      barSize={16}
                    >
                      <LabelList
                        dataKey="count"
                        position="right"
                        formatter={(val: any) => `${val}`}
                        fill="#111827"
                        fontSize={11}
                        fontWeight={700}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Visual usage table (replaces share / count cards) ── */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
          <div>
            <h3 className="text-sm font-bold text-[#111827] tracking-tight">
              Campaign Visual Usage
            </h3>
            <p className="text-xs text-[#6B7280] font-medium mt-0.5">
              Master visual vs live retailer creatives for {selectedVisualLabel || 'the selected visual'}.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-xs">
              <span className="text-[11px] font-medium text-[#6B7280]">Quarter:</span>
              <select
                value={quarterFilter}
                onChange={(e) => setQuarterFilter(e.target.value)}
                className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer"
              >
                {(data?.filter_options?.quarters || ['All']).map((q) => (
                  <option key={`t-q-${q}`} value={q}>{q}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-xs">
              <span className="text-[11px] font-medium text-[#6B7280]">Region:</span>
              <select
                value={regionFilter}
                onChange={(e) => {
                  setRegionFilter(e.target.value);
                  setCountryFilter('All');
                }}
                className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer"
              >
                {(data?.filter_options?.regions || ['All']).map((r) => (
                  <option key={`t-r-${r}`} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-xs">
              <span className="text-[11px] font-medium text-[#6B7280]">Country:</span>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer"
              >
                {(data?.filter_options?.countries || ['All']).map((c) => (
                  <option key={`t-c-${c}`} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-xs">
              <span className="text-[11px] font-medium text-[#6B7280]">Retailer:</span>
              <select
                value={tableRetailerFilter}
                onChange={(e) => setTableRetailerFilter(e.target.value)}
                className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer max-w-[140px]"
              >
                {tableRetailerOptions.map((r) => (
                  <option key={`t-ret-${r}`} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-xs">
              <span className="text-[11px] font-medium text-[#6B7280]">Usage:</span>
              <select
                value={usageFilter}
                onChange={(e) => setUsageFilter(e.target.value)}
                className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="All">All</option>
                <option value="Partial">Partial</option>
                <option value="Completely">Completely</option>
              </select>
            </div>
            <span className="text-[11px] font-bold text-[#64748B] bg-[#F8FAFC] border border-[#E5E7EB] px-2.5 py-1 rounded-lg">
              {usageRows.length} Creatives
            </span>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto border border-[#E5E7EB] rounded-xl max-h-[460px] overflow-y-auto">
          {loading && !data ? (
            <div className="p-8 text-center text-xs font-semibold text-[#6B7280] animate-pulse">
              Loading visual usage...
            </div>
          ) : usageRows.length === 0 ? (
            <div className="p-8 text-center text-xs font-medium text-[#6B7280]">
              No creatives found for this visual and filter set.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse min-w-[860px]">
              <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-[#6B7280] font-bold sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Master Visual</th>
                  <th className="py-2.5 px-3">Actual Creative</th>
                  <th className="py-2.5 px-3">Retailer</th>
                  <th className="py-2.5 px-3">Campaign</th>
                  <th className="py-2.5 px-3">Products</th>
                  <th className="py-2.5 px-3">Offer (Y/N)</th>
                  <th className="py-2.5 px-3">CTA (Y/N)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {usageRows.map((row, idx) => (
                  <tr
                    key={`${row.actual_creative_url}-${idx}`}
                    className={idx % 2 === 0 ? 'bg-white hover:bg-[#F8FAFC]' : 'bg-[#F8FAFC]/50 hover:bg-[#F8FAFC]'}
                  >
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPreview({
                            url: row.master_visual_url,
                            title: row.master_visual_name,
                            subtitle: 'Master visual',
                          })
                        }
                        className="group relative w-20 h-14 bg-slate-900 rounded-md overflow-hidden border border-[#E5E7EB]"
                        title="View master visual"
                      >
                        {row.master_visual_url ? (
                          <img
                            src={row.master_visual_url}
                            alt={row.master_visual_name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400">{row.master_visual_name}</span>
                        )}
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPreview({
                            url: row.actual_creative_url,
                            title: row.retailer,
                            subtitle: row.campaign,
                          })
                        }
                        className="group relative w-20 h-14 bg-slate-900 rounded-md overflow-hidden border border-[#E5E7EB]"
                        title="View actual creative"
                      >
                        <img
                          src={row.actual_creative_url}
                          alt={`${row.retailer} creative`}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    </td>
                    <td className="py-2 px-3 align-middle font-semibold text-[#111827]">{row.retailer}</td>
                    <td className="py-2 px-3 align-middle text-[#6B7280] font-medium">{row.campaign}</td>
                    <td className="py-2 px-3 align-middle text-[#6B7280] font-mono text-[10px]">{row.products}</td>
                    <td className="py-2 px-3 align-middle">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          row.offer === 'Y' ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#EF4444]/10 text-[#EF4444]'
                        }`}
                      >
                        {row.offer}
                      </span>
                    </td>
                    <td className="py-2 px-3 align-middle">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          row.cta === 'Y' ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#EF4444]/10 text-[#EF4444]'
                        }`}
                      >
                        {row.cta}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ImageModal
        isOpen={!!selectedPreview}
        onClose={() => setSelectedPreview(null)}
        imageUrl={selectedPreview?.url || ''}
        title={selectedPreview?.title || 'Creative'}
        subtitle={selectedPreview?.subtitle}
      />
    </div>
  );
}
