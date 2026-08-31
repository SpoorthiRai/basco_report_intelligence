// src/pages/OfferCTAPage.tsx
// Offer-led Creatives X CTA
// 4-Panel layout: Offer Type x CTA stacked bar + KPI chips, Product x Offer heatmap, Promo missing CTA evidence table, All offer types evidence table

import { useState, useEffect, useRef } from 'react';
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
import ImageModal from '../components/common/ImageModal';


interface OfferCTABar {
  offer_type: string;
  has_cta: number;
  no_cta: number;
  total: number;
  cta_pct: number;
}

interface ProductHeatmapRow {
  product: string;
  total: number;
  [key: string]: any;
}

interface OfferEvidence {
  Asset_URL: string;
  Offer_Type: string;
  CTA_Flag: string;
  Content: string;
  Retailer: string;
  Region: string;
  Country: string;
  quarter_label: string;
  product?: string;
  cta_status?: string;
}

interface OfferCTAResponse {
  kpis: {
    total_offer_creatives: number;
    conversion_ready: number;
    offer_missing_cta: number;
    no_offer_creatives: number;
  };
  offer_cta_bars: OfferCTABar[];
  heatmap_offer_types: string[];
  product_heatmap: ProductHeatmapRow[];
  promo_missing_cta: OfferEvidence[];
  all_offer_evidence: OfferEvidence[];
  filter_options: {
    quarters: string[];
    countries: string[];
    retailers: string[];
  };
}

// Heatmap cell color based on percentage intensity
function getHeatmapBgAndText(pct: number): { bg: string; text: string } {
  if (!pct || pct === 0) return { bg: 'transparent', text: 'text-transparent' };
  if (pct <= 15) return { bg: '#FED7AA', text: 'text-amber-950 font-bold' }; // light orange
  if (pct <= 30) return { bg: '#FB923C', text: 'text-amber-950 font-bold' }; // medium orange
  if (pct <= 50) return { bg: '#EA580C', text: 'text-white font-black' };     // dark orange
  return { bg: '#9A3412', text: 'text-white font-black' };                    // deep orange
}

export default function OfferCTAPage() {
  const [data, setData] = useState<OfferCTAResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [quarterFilter, setQuarterFilter] = useState<string>('All Quarters');
  const [countryFilter, setCountryFilter] = useState<string>('All Countries');
  const [retailerFilter, setRetailerFilter] = useState<string>('All Retailers');
  const [offerProductFilter, setOfferProductFilter] = useState<string>('All Products');
  const [selectedCreative, setSelectedCreative] = useState<OfferEvidence | null>(null);

  const promoEvidenceRef = useRef<HTMLDivElement>(null);

  const allEvidenceRef = useRef<HTMLDivElement>(null);

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
      .get<OfferCTAResponse>(`/api/reports/offer-cta/${queryString}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.data) {
          setData(res.data);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        const msg = err.response?.data?.error || err.message || 'Failed to load Offer CTA data.';
        setError(msg);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [quarterFilter, countryFilter, retailerFilter]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const kpis = data?.kpis || {
    total_offer_creatives: 0,
    conversion_ready: 0,
    offer_missing_cta: 0,
    no_offer_creatives: 0,
  };
  const offerBars = data?.offer_cta_bars || [];
  const heatmapOfferTypes = data?.heatmap_offer_types || [];
  const productHeatmap = data?.product_heatmap || [];
  const promoMissingList = data?.promo_missing_cta || [];
  const allOfferList = data?.all_offer_evidence || [];

  const productOptions = [
    'All Products',
    ...Array.from(
      new Set(
        allOfferList
          .map((r) => r.product)
          .filter((p): p is string => Boolean(p && p !== 'Unknown'))
      )
    ),
  ];

  const filteredAllOfferList =
    offerProductFilter === 'All Products'
      ? allOfferList
      : allOfferList.filter(
          (r) =>
            (r.product && r.product.toLowerCase().includes(offerProductFilter.toLowerCase())) ||
            (r.Content && r.Content.toLowerCase().includes(offerProductFilter.toLowerCase()))
        );

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#071739]">
              Promotional{" "}
              <span className="bg-gradient-to-r from-[#0062d2] via-[#0284c7] to-[#6366f1] bg-clip-text text-transparent inline-block">
                Offer Effectiveness
              </span>
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
              Promotional Health
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Analysis of promotional offer types, call-to-action inclusion rates, and product distribution.
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
          <div className="flex items-center gap-2 bg-white/95 border border-slate-200/90 shadow-2xs px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700">
            <span className="text-slate-400 font-medium">Retailer:</span>
            <select
              value={retailerFilter}
              onChange={(e) => setRetailerFilter(e.target.value)}
              className="bg-transparent text-slate-900 text-xs font-bold focus:outline-none cursor-pointer pr-1"
            >
              {(data?.filter_options?.retailers || ['All']).map((r) => (
                <option key={r} value={r} className="bg-white text-slate-900">
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

      {/* ── Main 2-Column Grid Layout ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ══════════════════════════════════════════════════════════ */}
        {/* LEFT COLUMN (55% / lg:col-span-7)                          */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 space-y-6">
          {/* TOP PANEL: Offer Type x CTA Stacked Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between">
            {/* Header: Dark Navy */}
            <div className="bg-[#071739] text-white p-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  CTA Presence Across Offer Types
                </h3>
                <p className="text-[11px] text-slate-300 font-medium">
                  Breakdown of promotional creatives with and without CTA
                </p>
              </div>
            </div>

            {/* Stacked Bar Chart */}
            <div className="p-5">
              <div className="w-full h-[350px] flex items-center justify-center">
                {loading && !data ? (
                  <div className="w-full h-full bg-slate-50 rounded-xl animate-pulse flex items-center justify-center">
                    <span className="text-xs font-semibold text-slate-400">Loading offer CTA data...</span>
                  </div>
                ) : offerBars.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-xs font-medium text-slate-400">
                    No offer CTA data found.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart
                      data={offerBars}
                      margin={{ top: 30, right: 10, left: 10, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="offer_type"
                        tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 700 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis hide domain={[0, 'dataMax + 50']} />
                      <Tooltip
                        formatter={(val: any, name: any, item: any) => {
                          const isHasCta = name === 'has_cta';
                          const pct = isHasCta
                            ? item?.payload?.cta_pct
                            : Math.round((100 - (item?.payload?.cta_pct || 0)) * 10) / 10;
                          return [
                            `${val} creatives (${pct}%)`,
                            isHasCta ? '✓ Has CTA' : '✗ No CTA',
                          ];
                        }}
                        labelFormatter={(label: any) => `Offer Type: ${label}`}
                        contentStyle={{
                          borderRadius: '0.5rem',
                          fontSize: '12px',
                          borderColor: '#e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                      />
                      {/* Bottom Stack: Has CTA (Blue #2563EB) */}
                      <Bar
                        dataKey="has_cta"
                        stackId="offerStack"
                        fill="#2563EB"
                        radius={[0, 0, 4, 4]}
                        barSize={40}
                      >
                        <LabelList
                          dataKey="has_cta"
                          position="center"
                          fill="#ffffff"
                          fontSize={11}
                          fontWeight="bold"
                          formatter={(v: any) => (v > 15 ? `${v}` : '')}
                        />
                      </Bar>
                      {/* Top Stack: No CTA (Grey #64748B) */}
                      <Bar
                        dataKey="no_cta"
                        stackId="offerStack"
                        fill="#94A3B8"
                        radius={[4, 4, 0, 0]}
                        barSize={40}
                      >
                        <LabelList
                          dataKey="cta_pct"
                          position="top"
                          fill="#1E40AF"
                          fontSize={12}
                          fontWeight="900"
                          formatter={(v: any) => `${v}%`}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Offer Type Breakdown Grid */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Offer Type CTA Inclusion Breakdown:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {offerBars.map((b) => (
                    <div
                      key={b.offer_type}
                      className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 flex flex-col justify-between"
                    >
                      <span className="text-[11px] font-bold text-slate-700 truncate" title={b.offer_type}>
                        {b.offer_type}
                      </span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-slate-500 font-medium">
                          {b.has_cta}/{b.total}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                            b.cta_pct >= 60
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.cta_pct >= 35
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {b.cta_pct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2 KPI Chips Below Chart */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4 pt-4 border-t border-slate-100">
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-black text-emerald-900 tracking-tight block">
                      {kpis.conversion_ready.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                      Conversion-ready Creatives
                    </span>
                  </div>
                  <span
                    className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center cursor-help"
                    title="Has offer + has CTA"
                  >
                    ℹ
                  </span>
                </div>

                <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-black text-rose-900 tracking-tight block">
                      {kpis.offer_missing_cta.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-rose-700 mt-0.5 block">
                      Offer-led but Missing CTA Creatives
                    </span>
                  </div>
                  <span
                    className="w-6 h-6 rounded-full bg-rose-200 text-rose-800 text-xs font-bold flex items-center justify-center cursor-help"
                    title="Has offer but no CTA"
                  >
                    ℹ
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* BOTTOM PANEL: Product x Offer Type Heatmap */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                  How Offers Are Displayed Across Products (Creatives %)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Percentage intensity distribution of offer types per product family
                </p>
              </div>
            </div>

            {/* Heatmap Table */}
            <div className="mt-4 overflow-x-auto border border-slate-200 rounded-xl">
              {loading && !data ? (
                <div className="p-8 text-center text-xs font-semibold text-slate-400 animate-pulse">
                  Loading product offer heatmap...
                </div>
              ) : productHeatmap.length === 0 ? (
                <div className="p-8 text-center text-xs font-medium text-slate-400">
                  No product heatmap data found.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 border-r border-slate-200 uppercase tracking-wider text-[10px]">
                        PRODUCT
                      </th>
                      {heatmapOfferTypes.map((ot) => (
                        <th
                          key={ot}
                          className="py-2.5 px-2 text-center border-r border-slate-200 text-[10px] font-bold whitespace-nowrap"
                        >
                          {ot}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productHeatmap.map((row) => (
                      <tr key={row.product} className="hover:bg-blue-50/50 transition-colors">
                        <td className="py-2 px-3 font-bold text-slate-800 border-r border-slate-100 whitespace-nowrap">
                          {row.product}
                        </td>
                        {heatmapOfferTypes.map((ot) => {
                          const pct = row[`${ot}_pct`] || 0;
                          const { bg, text } = getHeatmapBgAndText(pct);
                          return (
                            <td
                              key={ot}
                              className="py-2 px-2 text-center border-r border-slate-100 text-[11px]"
                              style={{ backgroundColor: bg }}
                            >
                              <span className={text}>{pct > 0 ? `${pct}%` : ''}</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Heatmap Legend */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-3 text-[10px]">
              <span className="font-semibold text-slate-500">Intensity:</span>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#FED7AA' }} />
                <span className="text-slate-600">1-15%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#FB923C' }} />
                <span className="text-slate-600">16-30%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#EA580C' }} />
                <span className="text-slate-600">31-50%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#9A3412' }} />
                <span className="text-slate-600">51%+</span>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* RIGHT COLUMN (45% / lg:col-span-5)                         */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 space-y-6">
          {/* TOP EVIDENCE TABLE: Promo Creatives with Missing CTA */}
          <div
            ref={promoEvidenceRef}
            id="promo-missing-cta-table"
            className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                  Promo Creatives with Missing CTA
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Promotional creatives featuring offers but lacking a clear call-to-action.
                </p>
              </div>
              <button
                onClick={scrollToTop}
                className="text-slate-400 hover:text-slate-700 text-base font-bold p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                title="Scroll to Top"
              >
                ←
              </button>
            </div>

            <div className="mt-4 overflow-y-auto max-h-[420px] border border-slate-200 rounded-xl">
              {loading && !data ? (
                <div className="p-8 text-center text-xs font-semibold text-slate-400 animate-pulse">
                  Loading promo evidence...
                </div>
              ) : promoMissingList.length === 0 ? (
                <div className="p-8 text-center text-xs font-medium text-slate-400">
                  No promo creatives with missing CTA found.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Creative</th>
                      <th className="py-2.5 px-3">Parent Account</th>
                      <th className="py-2.5 px-3">Offer Type</th>
                      <th className="py-2.5 px-3">CTA Status</th>
                      <th className="py-2.5 px-3">Product</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {promoMissingList.slice(0, 15).map((row, idx) => (
                      <tr
                        key={`${row.Asset_URL}-${idx}`}
                        className={idx % 2 === 0 ? 'bg-[#FFFBEB] hover:bg-[#FEF3C7]' : 'bg-white hover:bg-[#FEF3C7]/60'}
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
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                              🔍
                            </span>
                          </button>
                        </td>
                        <td className="py-2 px-3 align-middle font-semibold text-slate-700">
                          {row.Retailer}
                        </td>
                        <td className="py-2 px-3 align-middle text-slate-600 font-medium">
                          {row.Offer_Type}
                        </td>
                        <td className="py-2 px-3 align-middle">
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                            No CTA
                          </span>
                        </td>
                        <td className="py-2 px-3 align-middle text-slate-500 font-mono text-[10px]">
                          {row.product || 'Unknown'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* BOTTOM EVIDENCE TABLE: Different Offer Types Including No Offer */}
          <div
            ref={allEvidenceRef}
            id="all-offer-evidence-table"
            className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                  Different Offer Types Including No Offer
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  All creatives across all offer types.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1 text-xs text-slate-700">
                  <span className="text-[11px] font-medium text-slate-400">Product:</span>
                  <select
                    value={offerProductFilter}
                    onChange={(e) => setOfferProductFilter(e.target.value)}
                    className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
                  >
                    {productOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={scrollToTop}
                  className="text-slate-400 hover:text-slate-700 text-base font-bold p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Scroll to Top"
                >
                  ←
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-y-auto max-h-[420px] border border-slate-200 rounded-xl">
              {loading && !data ? (
                <div className="p-8 text-center text-xs font-semibold text-slate-400 animate-pulse">
                  Loading offer evidence...
                </div>
              ) : filteredAllOfferList.length === 0 ? (
                <div className="p-8 text-center text-xs font-medium text-slate-400">
                  No offer evidence found for the selected product.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Creative</th>
                      <th className="py-2.5 px-3">Parent Account</th>
                      <th className="py-2.5 px-3">Offer Type</th>
                      <th className="py-2.5 px-3">Product</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAllOfferList.slice(0, 15).map((row, idx) => (
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
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                              🔍
                            </span>
                          </button>
                        </td>
                        <td className="py-2 px-3 align-middle font-semibold text-slate-700">
                          {row.Retailer}
                        </td>
                        <td className="py-2 px-3 align-middle text-slate-600 font-medium">
                          {row.Offer_Type}
                        </td>
                        <td className="py-2 px-3 align-middle text-slate-500 font-mono text-[10px]">
                          {row.product || 'Unknown'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
        subtitle={`Offer: ${selectedCreative?.Offer_Type} • Product: ${selectedCreative?.product || 'Unknown'}`}
        details={[
          { label: 'Parent Account', value: selectedCreative?.Retailer || 'Unknown' },
          {
            label: 'Offer Type',
            value: selectedCreative?.Offer_Type || 'No Offer',
            badge: true,
            badgeColor: '#D97706',
          },
          {
            label: 'CTA Status',
            value: selectedCreative?.cta_status || (selectedCreative?.CTA_Flag === 'Yes' ? 'Has CTA' : 'No CTA'),
            badge: true,
            badgeColor: (selectedCreative?.cta_status === 'Has CTA' || selectedCreative?.CTA_Flag === 'Yes') ? '#059669' : '#DC2626',
          },
          { label: 'Product', value: selectedCreative?.product || selectedCreative?.Content || 'Unknown' },
          { label: 'Country', value: selectedCreative?.Country || 'Unknown' },
          { label: 'Quarter', value: selectedCreative?.quarter_label || 'N/A' },
        ]}
      />
    </div>
  );
}

