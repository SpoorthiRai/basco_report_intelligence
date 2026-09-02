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

// Heatmap cell color based on percentage intensity (3-color modern data scale)
function getHeatmapBgAndText(pct: number): { bg: string; text: string } {
  if (!pct || pct === 0) return { bg: 'transparent', text: 'text-transparent' };
  if (pct <= 15) return { bg: 'rgba(14, 165, 233, 0.15)', text: 'text-[#0EA5E9] font-bold' };
  if (pct <= 30) return { bg: 'rgba(14, 165, 233, 0.35)', text: 'text-[#1E429F] font-bold' };
  if (pct <= 50) return { bg: 'rgba(30, 66, 159, 0.70)', text: 'text-white font-black' };
  return { bg: '#1E429F', text: 'text-white font-black' };
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
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#111827]">
              Promotional Offer{" "}
              <span className="bg-gradient-to-r from-[#1E429F] via-[#0D9488] to-[#6366F1] bg-clip-text text-transparent inline-block">
                Effectiveness
              </span>
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 shadow-2xs">
              Promotional Health
            </span>
          </div>
          <p className="text-xs md:text-sm text-[#6B7280] mt-1">
            Analysis of promotional offer types, call-to-action inclusion rates, and product distribution.
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
          <div className="flex items-center gap-2 bg-white/95 border border-[#E5E7EB] shadow-2xs px-3.5 py-2 rounded-xl text-xs font-bold text-[#111827]">
            <span className="text-[#6B7280] font-medium">Retailer:</span>
            <select
              value={retailerFilter}
              onChange={(e) => setRetailerFilter(e.target.value)}
              className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer pr-1"
            >
              {(data?.filter_options?.retailers || ['All']).map((r) => (
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

      {/* ── Main 2-Column Grid Layout ────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════════ */}
      {/* ROW 1: CTA PRESENCE (LEFT 58%) & PROMO MISSING (RIGHT 42%)   */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ── LEFT (58% / lg:col-span-7): CTA Presence Across Offer Types */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col justify-between min-h-[580px] h-full">
          <div>
            <div className="pb-3 border-b border-[#E5E7EB]">
              <h3 className="text-sm font-bold text-[#111827] tracking-tight">
                CTA Presence Across Offer Types
              </h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Breakdown of promotional creatives with and without CTA
              </p>
            </div>

            {/* Stacked Bar Chart */}
            <div className="w-full h-[280px] mt-3 flex items-center justify-center">
              {loading && !data ? (
                <div className="w-full h-full bg-[#F8FAFC] rounded-xl animate-pulse flex items-center justify-center">
                  <span className="text-xs font-semibold text-[#6B7280]">Loading offer CTA data...</span>
                </div>
              ) : offerBars.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[#6B7280]">
                  No offer CTA data found.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={offerBars}
                    margin={{ top: 25, right: 10, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="offer_type"
                      tick={{ fontSize: 11, fill: '#111827', fontWeight: 700 }}
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
                        borderColor: '#E5E7EB',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    {/* Bottom Stack: Has CTA (Blue #1E429F) */}
                    <Bar
                      dataKey="has_cta"
                      stackId="offerStack"
                      fill="#1E429F"
                      radius={[0, 0, 4, 4]}
                      barSize={36}
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
                    {/* Top Stack: No CTA (Grey #CBD5E1) */}
                    <Bar
                      dataKey="no_cta"
                      stackId="offerStack"
                      fill="#CBD5E1"
                      radius={[4, 4, 0, 0]}
                      barSize={36}
                    >
                      <LabelList
                        dataKey="cta_pct"
                        position="top"
                        fill="#1E429F"
                        fontSize={11}
                        fontWeight="900"
                        formatter={(v: any) => `${v}%`}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Offer Type Breakdown Grid */}
            <div className="mt-2 pt-2.5 border-t border-[#E5E7EB]">
              <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1.5">
                Offer Type CTA Inclusion Breakdown:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {offerBars.map((b) => (
                  <div
                    key={b.offer_type}
                    className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg p-1.5 flex flex-col justify-between"
                  >
                    <span className="text-[10px] font-bold text-[#111827] truncate" title={b.offer_type}>
                      {b.offer_type}
                    </span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[9px] text-[#6B7280] font-medium">
                        {b.has_cta}/{b.total}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-1 py-0.2 rounded ${
                          b.cta_pct >= 60
                            ? 'bg-[#10B981]/10 text-[#10B981]'
                            : b.cta_pct >= 35
                            ? 'bg-[#1E429F]/10 text-[#1E429F]'
                            : 'bg-[#EF4444]/10 text-[#EF4444]'
                        }`}
                      >
                        {b.cta_pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2 KPI Chips Below Chart */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-[#E5E7EB]">
            <div className="bg-[#10B981]/10 border border-[#10B981]/25 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-xl font-black text-[#10B981] tracking-tight block">
                  {kpis.conversion_ready.toLocaleString()}
                </span>
                <span className="text-[11px] font-bold text-[#10B981] mt-0.5 block">
                  Conversion-ready Creatives
                </span>
              </div>
              <span
                className="w-5 h-5 rounded-full bg-[#10B981]/20 text-[#10B981] text-[10px] font-bold flex items-center justify-center cursor-help"
                title="Has offer + has CTA"
              >
                ℹ
              </span>
            </div>

            <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/25 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-xl font-black text-[#F59E0B] tracking-tight block">
                  {kpis.offer_missing_cta.toLocaleString()}
                </span>
                <span className="text-[11px] font-bold text-[#F59E0B] mt-0.5 block">
                  Offer-led Missing CTA
                </span>
              </div>
              <span
                className="w-5 h-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] text-[10px] font-bold flex items-center justify-center cursor-help"
                title="Has offer but no CTA"
              >
                ℹ
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT (42% / lg:col-span-5): Promo Creatives with Missing CTA */}
        <div
          ref={promoEvidenceRef}
          id="promo-missing-cta-table"
          className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col justify-between min-h-[580px] h-full"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E5E7EB] flex-wrap shrink-0">
            <div>
              <h3 className="text-sm font-bold text-[#111827] tracking-tight">
                Promo Creatives with Missing CTA
              </h3>
              <p className="text-xs text-[#6B7280] font-medium mt-0.5">
                Promotional creatives featuring offers but lacking a CTA
              </p>
            </div>
            <span className="text-[11px] font-bold text-[#EF4444] bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg shrink-0">
              {promoMissingList.length} Creatives
            </span>
          </div>

          <div className="flex-1 min-h-0 w-full mt-3 overflow-y-auto max-h-[490px] border border-[#E5E7EB] rounded-xl">
            {loading && !data ? (
              <div className="p-8 text-center text-xs font-semibold text-[#6B7280] animate-pulse">
                Loading promo evidence...
              </div>
            ) : promoMissingList.length === 0 ? (
              <div className="p-8 text-center text-xs font-medium text-[#6B7280]">
                No promo creatives with missing CTA found.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-[#6B7280] font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Creative</th>
                    <th className="py-2.5 px-3">Parent Account</th>
                    <th className="py-2.5 px-3">Offer Type</th>
                    <th className="py-2.5 px-3">CTA Status</th>
                    <th className="py-2.5 px-3">Product</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {promoMissingList.map((row, idx) => (
                    <tr
                      key={`${row.Asset_URL}-${idx}`}
                      className={idx % 2 === 0 ? 'bg-[#FFFBEB] hover:bg-[#FEF3C7]' : 'bg-white hover:bg-[#FEF3C7]/60'}
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
                      <td className="py-2 px-3 align-middle font-semibold text-[#111827]">
                        {row.Retailer}
                      </td>
                      <td className="py-2 px-3 align-middle text-[#6B7280] font-medium">
                        {row.Offer_Type}
                      </td>
                      <td className="py-2 px-3 align-middle">
                        <span className="bg-[#EF4444]/10 text-[#EF4444] text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                          No CTA
                        </span>
                      </td>
                      <td className="py-2 px-3 align-middle text-[#6B7280] font-mono text-[10px]">
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

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ROW 2: PRODUCT HEATMAP (LEFT 58%) & ALL OFFER (RIGHT 42%)    */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ── LEFT (58% / lg:col-span-7): Product x Offer Type Heatmap */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col justify-between min-h-[480px] h-full">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#E5E7EB]">
              <div>
                <h3 className="text-sm font-bold text-[#111827] tracking-tight">
                  How Offers Are Displayed Across Products (Creatives %)
                </h3>
                <p className="text-xs text-[#6B7280] font-medium mt-0.5">
                  Percentage intensity distribution of offer types per product family
                </p>
              </div>
            </div>

            {/* Heatmap Table */}
            <div className="mt-3 overflow-x-auto border border-[#E5E7EB] rounded-xl max-h-[360px] overflow-y-auto">
              {loading && !data ? (
                <div className="p-8 text-center text-xs font-semibold text-[#6B7280] animate-pulse">
                  Loading product offer heatmap...
                </div>
              ) : productHeatmap.length === 0 ? (
                <div className="p-8 text-center text-xs font-medium text-[#6B7280]">
                  No product heatmap data found.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse min-w-[540px]">
                  <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-[#6B7280] font-bold sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 border-r border-[#E5E7EB] uppercase tracking-wider text-[10px]">
                        PRODUCT
                      </th>
                      {heatmapOfferTypes.map((ot) => (
                        <th
                          key={ot}
                          className="py-2.5 px-2 text-center border-r border-[#E5E7EB] text-[10px] font-bold whitespace-nowrap"
                        >
                          {ot}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {productHeatmap.map((row) => (
                      <tr key={row.product} className="hover:bg-[#1E429F]/5 transition-colors">
                        <td className="py-2 px-3 font-bold text-[#111827] border-r border-[#E5E7EB] whitespace-nowrap">
                          {row.product}
                        </td>
                        {heatmapOfferTypes.map((ot) => {
                          const pct = row[`${ot}_pct`] || 0;
                          const { bg, text } = getHeatmapBgAndText(pct);
                          return (
                            <td
                              key={ot}
                              className="py-2 px-2 text-center border-r border-[#E5E7EB] text-[11px]"
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
          </div>

          {/* Heatmap Legend */}
          <div className="mt-3 pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-3 text-[10px]">
            <span className="font-semibold text-[#6B7280]">Intensity:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: 'rgba(14, 165, 233, 0.15)' }} />
              <span className="text-[#6B7280]">1-15%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: 'rgba(14, 165, 233, 0.35)' }} />
              <span className="text-[#6B7280]">16-30%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: 'rgba(26, 86, 219, 0.70)' }} />
              <span className="text-[#6B7280]">31-50%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: '#1E429F' }} />
              <span className="text-[#6B7280]">51%+</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT (42% / lg:col-span-5): Different Offer Types Including No Offer */}
        <div
          ref={allEvidenceRef}
          id="all-offer-evidence-table"
          className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col justify-between min-h-[480px] h-full"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E5E7EB] flex-wrap shrink-0">
            <div>
              <h3 className="text-sm font-bold text-[#111827] tracking-tight">
                Different Offer Types Including No Offer
              </h3>
              <p className="text-xs text-[#6B7280] font-medium mt-0.5">
                All creatives across all offer types.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-xs text-[#111827]">
                <span className="text-[11px] font-medium text-[#6B7280]">Product:</span>
                <select
                  value={offerProductFilter}
                  onChange={(e) => setOfferProductFilter(e.target.value)}
                  className="bg-transparent text-[#111827] text-xs font-bold focus:outline-none cursor-pointer"
                >
                  {productOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-[11px] font-bold text-[#64748B] bg-[#F8FAFC] border border-[#E5E7EB] px-2.5 py-1 rounded-lg shrink-0">
                {filteredAllOfferList.length} Creatives
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full mt-3 overflow-y-auto max-h-[380px] border border-[#E5E7EB] rounded-xl">
            {loading && !data ? (
              <div className="p-8 text-center text-xs font-semibold text-[#6B7280] animate-pulse">
                Loading offer evidence...
              </div>
            ) : filteredAllOfferList.length === 0 ? (
              <div className="p-8 text-center text-xs font-medium text-[#6B7280]">
                No offer evidence found for the selected product.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-[#6B7280] font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Creative</th>
                    <th className="py-2.5 px-3">Parent Account</th>
                    <th className="py-2.5 px-3">Offer Type</th>
                    <th className="py-2.5 px-3">Product</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredAllOfferList.map((row, idx) => (
                    <tr
                      key={`${row.Asset_URL}-${idx}`}
                      className={idx % 2 === 0 ? 'bg-white hover:bg-[#F8FAFC]' : 'bg-[#F8FAFC]/50 hover:bg-[#F8FAFC]'}
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
                      <td className="py-2 px-3 align-middle font-semibold text-[#111827]">
                        {row.Retailer}
                      </td>
                      <td className="py-2 px-3 align-middle text-[#6B7280] font-medium">
                        {row.Offer_Type}
                      </td>
                      <td className="py-2 px-3 align-middle text-[#6B7280] font-mono text-[10px]">
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
            badgeColor: '#F59E0B',
          },
          {
            label: 'CTA Status',
            value: selectedCreative?.cta_status || (selectedCreative?.CTA_Flag === 'Yes' ? 'Has CTA' : 'No CTA'),
            badge: true,
            badgeColor: (selectedCreative?.cta_status === 'Has CTA' || selectedCreative?.CTA_Flag === 'Yes') ? '#10B981' : '#EF4444',
          },
          { label: 'Product', value: selectedCreative?.product || selectedCreative?.Content || 'Unknown' },
          { label: 'Country', value: selectedCreative?.Country || 'Unknown' },
          { label: 'Quarter', value: selectedCreative?.quarter_label || 'N/A' },
        ]}
      />
    </div>
  );
}

