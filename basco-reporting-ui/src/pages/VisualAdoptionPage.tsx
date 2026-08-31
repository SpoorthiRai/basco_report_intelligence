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
} from 'recharts';
import api from '../api/client';

interface PMSVisual {
  PMSVisual_ID: number | string;
  PMSVisual_Name: string;
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

interface VisualAdoptionResponse {
  kpis: {
    total_creatives: number;
    used_intel_visuals: number;
    master_visual_adoption_pct: number;
  };
  retailer_adoption: RetailerAdoption[];
  pms_visuals: PMSVisual[];
  selected_visual_stats: SelectedVisualStats | null;
  retailer_visual_breakdown: RetailerVisualBreakdown[];
  filter_options: {
    quarters: string[];
    countries: string[];
    visual_styles: string[];
  };
}

export default function VisualAdoptionPage() {
  const [data, setData] = useState<VisualAdoptionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [quarterFilter, setQuarterFilter] = useState<string>('All');
  const [countryFilter, setCountryFilter] = useState<string>('All');
  const [visualStyleFilter, setVisualStyleFilter] = useState<string>('All');
  const [selectedVisual, setSelectedVisual] = useState<string>('');

  const [imgError, setImgError] = useState<boolean>(false);

  // Fetch data whenever filters or selected visual changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setImgError(false);

    const params = new URLSearchParams();
    if (quarterFilter && quarterFilter !== 'All') {
      params.append('quarter', quarterFilter);
    }
    if (countryFilter && countryFilter !== 'All') {
      params.append('country', countryFilter);
    }
    if (visualStyleFilter && visualStyleFilter !== 'All') {
      params.append('visual_style', visualStyleFilter);
    }
    if (selectedVisual) {
      params.append('visual_name', selectedVisual);
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';

    api
      .get<VisualAdoptionResponse>(`/api/reports/visual-adoption-v2/${queryString}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.data) {
          setData(res.data);
          // If no visual currently selected and pms_visuals returned, default to the first one
          if (!selectedVisual && res.data.pms_visuals && res.data.pms_visuals.length > 0) {
            setSelectedVisual(res.data.pms_visuals[0].PMSVisual_Name);
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
  }, [quarterFilter, countryFilter, visualStyleFilter, selectedVisual]);

  // Top 15 retailers for left chart
  const topRetailersAdoption = (data?.retailer_adoption || []).slice(0, 15);

  // Top 15 retailers for selected visual (right chart)
  const topRetailersVisualBreakdown = (data?.retailer_visual_breakdown || []).slice(0, 15);

  // Get active thumbnail URL
  const activePmsVisual = data?.pms_visuals?.find((p) => p.PMSVisual_Name === selectedVisual);
  const currentThumbnail =
    data?.selected_visual_stats?.thumbnail_url || activePmsVisual?.PMSVisual_URL || '';

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#071739]">
              Intel{" "}
              <span className="bg-gradient-to-r from-[#0062d2] via-[#0284c7] to-[#6366f1] bg-clip-text text-transparent inline-block">
                Visual Adoption
              </span>
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-[#0062d2] border border-blue-200/80 shadow-2xs">
              Pre Launch
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Track Intel Master Visual adoption and usage distribution across retail partners.
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
        {/* Card 1: Total Creatives */}
        <div className="bg-white rounded-2xl p-4.5 shadow-sm border border-slate-200/90 flex flex-col justify-between min-h-[104px]">
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
            Total Creatives
          </span>
          {loading && !data ? (
            <div className="h-8 bg-slate-100 rounded animate-pulse w-1/2 mt-2" />
          ) : (
            <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">
              {data?.kpis?.total_creatives?.toLocaleString() ?? 0}
            </div>
          )}
        </div>

        {/* Card 2: Intel Visuals Used */}
        <div className="bg-gradient-to-br from-[#071739] to-[#0b224f] rounded-2xl p-4.5 shadow-md border border-slate-800 flex flex-col justify-between min-h-[104px] text-white">
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-300">
            Intel Visuals Used
          </span>
          {loading && !data ? (
            <div className="h-8 bg-slate-700/60 rounded animate-pulse w-1/2 mt-2" />
          ) : (
            <div className="text-2xl md:text-3xl font-black text-cyan-300 tracking-tight mt-1">
              {data?.kpis?.used_intel_visuals?.toLocaleString() ?? 0}
            </div>
          )}
        </div>

        {/* Card 3: Master Intel Visual Adoption % */}
        <div className="bg-gradient-to-br from-[#0062d2] via-[#0284c7] to-[#06b6d4] rounded-2xl p-4.5 shadow-md border border-blue-400/40 flex flex-col justify-between min-h-[104px] text-white">
          <span className="text-[10px] font-bold tracking-wider uppercase text-blue-100">
            Master Intel Visual Adoption %
          </span>
          {loading && !data ? (
            <div className="h-8 bg-blue-800/60 rounded animate-pulse w-1/2 mt-2" />
          ) : (
            <div className="flex items-baseline justify-between mt-1">
              <div className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {data?.kpis?.master_visual_adoption_pct ?? 0}%
              </div>
              <span className="text-[10px] text-blue-100 font-medium">
                (Intel + Custom Layouts)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── 2-Column Main Section (60% / 40% Desktop Split) ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ══════════════════════════════════════════════════════════ */}
        {/* LEFT COLUMN: 60% Width (lg:col-span-7)                     */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Left Chart Card: Intel Visual Adoption by Retailer */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col">
            {/* Header + Visual Style Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                Intel Visual Adoption by Retailer
              </h3>

              {/* Amber/Orange Visual Style Filter Dropdown */}
              <div className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 transition-colors text-white px-3 py-1.5 rounded-lg shadow-xs self-start sm:self-auto">
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

            {/* Horizontal Bar Chart */}
            <div className="w-full h-[420px]">
              {loading && !data ? (
                <div className="w-full h-full bg-slate-50 rounded-xl animate-pulse flex items-center justify-center">
                  <span className="text-xs font-semibold text-slate-400">Loading chart data...</span>
                </div>
              ) : topRetailersAdoption.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs font-medium text-slate-400">
                  No retailer adoption data found for the selected filters.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={topRetailersAdoption}
                    margin={{ top: 10, right: 48, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      unit="%"
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    />
                    <YAxis
                      dataKey="retailer"
                      type="category"
                      width={140}
                      interval={0}
                      tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 600 }}
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
                        borderColor: '#334155',
                        backgroundColor: '#0f172a',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.25)',
                      }}
                      itemStyle={{ color: '#38bdf8', fontWeight: 600 }}
                      labelStyle={{ color: '#ffffff', fontWeight: 700, marginBottom: '4px' }}
                    />
                    <Bar
                      dataKey="adoption_pct"
                      fill="#0284c7"
                      radius={[0, 5, 5, 0]}
                      barSize={16}
                    >
                      <LabelList
                        dataKey="adoption_pct"
                        position="right"
                        formatter={(val: any) => `${val}%`}
                        fill="#334155"
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

        {/* ══════════════════════════════════════════════════════════ */}
        {/* RIGHT COLUMN: 40% Width (lg:col-span-5)                    */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Master Visual Selector Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col gap-4">
            <div>
              <label
                htmlFor="visual-select"
                className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5"
              >
                Explore Intel Visuals
              </label>
              <select
                id="visual-select"
                value={selectedVisual}
                onChange={(e) => setSelectedVisual(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer transition-all"
              >
                {(data?.pms_visuals || []).map((pv) => (
                  <option key={pv.PMSVisual_ID} value={pv.PMSVisual_Name}>
                    {pv.PMSVisual_Name}
                  </option>
                ))}
              </select>
            </div>

            {/* Thumbnail Image Banner */}
            <div className="w-full h-[180px] rounded-xl overflow-hidden bg-slate-900 relative flex items-center justify-center border border-slate-800 shadow-inner">
              {currentThumbnail && !imgError ? (
                <img
                  src={currentThumbnail}
                  alt={selectedVisual || 'Master Visual'}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="p-4 text-center">
                  <span className="text-2xl block mb-1">🖼️</span>
                  <span className="text-xs font-bold text-slate-300">
                    {selectedVisual || 'No Visual Selected'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {imgError ? 'Image not reachable' : 'Preview placeholder'}
                  </span>
                </div>
              )}
              {selectedVisual && (
                <span className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  {selectedVisual}
                </span>
              )}
            </div>

            {/* Selected Visual Performance Stats Card */}
            {data?.selected_visual_stats && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Creatives Count
                  </span>
                  <span className="text-xl font-black text-slate-800 mt-1">
                    {data.selected_visual_stats.creative_count.toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Overall Intel Visual Adoption
                  </span>
                  <span className="text-xl font-black text-cyan-600 mt-1">
                    {data.selected_visual_stats.adoption_pct}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Chart Card: Intel Visual Usage by Retailer */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-4 pb-3 border-b border-slate-100">
              Intel Visual Usage by Retailer
            </h3>

            {/* Horizontal Bar Chart */}
            <div className="w-full h-[340px]">
              {loading && !data ? (
                <div className="w-full h-full bg-slate-50 rounded-xl animate-pulse flex items-center justify-center">
                  <span className="text-xs font-semibold text-slate-400">Loading breakdown...</span>
                </div>
              ) : topRetailersVisualBreakdown.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs font-medium text-slate-400">
                  No creatives found using {selectedVisual || 'this visual'}.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={topRetailersVisualBreakdown}
                    margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                      allowDecimals={false}
                    />
                    <YAxis
                      dataKey="retailer"
                      type="category"
                      width={130}
                      interval={0}
                      tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 600 }}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${val} creatives`, 'Usage Count']}
                      labelFormatter={(label: any) => `Retailer: ${label}`}
                      contentStyle={{
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        borderColor: '#334155',
                        backgroundColor: '#0f172a',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.25)',
                      }}
                      itemStyle={{ color: '#38bdf8', fontWeight: 600 }}
                      labelStyle={{ color: '#ffffff', fontWeight: 700, marginBottom: '4px' }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#38bdf8"
                      radius={[0, 5, 5, 0]}
                      barSize={16}
                    >
                      <LabelList
                        dataKey="count"
                        position="right"
                        formatter={(val: any) => `${val}`}
                        fill="#334155"
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
    </div>
  );
}
