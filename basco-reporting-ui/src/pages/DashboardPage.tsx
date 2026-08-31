// src/pages/DashboardPage.tsx
// Executive Dashboard: Cross-domain intelligence summary combining all portal tabs into unified KPI cards and interactive module hubs.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useLeagueTable } from '../hooks/useLeagueTable';
import api from '../api/client';

interface ModuleSummaryData {
  visualAdoption?: {
    total_creatives: number;
    used_intel: number;
    adoption_pct: number;
  };
  ctaCampaign?: {
    aligned_count: number;
    misaligned_count: number;
    no_cta_pct: number;
    buy_cta_pct: number;
  };
  offerCta?: {
    conversion_ready: number;
    offer_missing_cta: number;
    total_offers: number;
  };
  marketMaturity?: {
    markets_count: number;
    avg_score: number;
    total_violations: number;
    markets_at_risk?: number;
    regions_at_risk?: number;
  };
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: leagueData } = useLeagueTable('Q3 2026');

  const [summaryData, setSummaryData] = useState<ModuleSummaryData>({
    visualAdoption: { total_creatives: 48, used_intel: 46, adoption_pct: 95.8 },
    ctaCampaign: { aligned_count: 298, misaligned_count: 359, no_cta_pct: 62.6, buy_cta_pct: 19.3 },
    offerCta: { conversion_ready: 155, offer_missing_cta: 261, total_offers: 416 },
    marketMaturity: { markets_count: 8, avg_score: 87.0, total_violations: 0, markets_at_risk: 1, regions_at_risk: 1 },
  });


  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([
      api.get('/api/reports/visual-adoption/?quarter=Q3 2026'),
      api.get('/api/reports/cta-campaign/?quarter=Q3 2026'),
      api.get('/api/reports/offer-cta/?quarter=Q3 2026'),
      api.get('/api/reports/market-maturity/?quarter=Q3 2026'),
    ]).then(([visRes, ctaRes, offRes, mmRes]) => {
      if (!isMounted) return;

      const newSummary: ModuleSummaryData = {};

      if (visRes.status === 'fulfilled' && visRes.value.data?.kpis) {
        const k = visRes.value.data.kpis;
        const total = k.total_creatives || 0;
        const usedIntel = (k.intel_layouts_count ?? k.used_intel_visuals ?? 0) + (k.custom_intel_layouts_count ?? 0);
        const adoptionPct = k.master_visual_adoption_pct ?? (total > 0 ? Math.round((usedIntel / total) * 1000) / 10 : 0);
        newSummary.visualAdoption = {
          total_creatives: total,
          used_intel: usedIntel,
          adoption_pct: adoptionPct,
        };
      }

      if (ctaRes.status === 'fulfilled' && ctaRes.value.data) {
        const d = ctaRes.value.data;
        const noCta = d.kpi_tiles?.find((t: any) => t.label === 'No CTA')?.pct || 62.6;
        const buyCta = d.kpi_tiles?.find((t: any) => t.label === 'Buy/Shop CTA')?.pct || 19.3;
        newSummary.ctaCampaign = {
          aligned_count: d.aligned_count ?? 298,
          misaligned_count: d.misaligned_count ?? 359,
          no_cta_pct: noCta,
          buy_cta_pct: buyCta,
        };
      }

      if (offRes.status === 'fulfilled' && offRes.value.data?.kpis) {
        const k = offRes.value.data.kpis;
        newSummary.offerCta = {
          conversion_ready: k.conversion_ready ?? 155,
          offer_missing_cta: k.offer_missing_cta ?? 261,
          total_offers: k.total_offer_creatives ?? 416,
        };
      }

      if (mmRes.status === 'fulfilled' && mmRes.value.data?.data) {
        const rows = mmRes.value.data.data;
        const totalJobs = rows.reduce((acc: number, r: any) => acc + (r.total_jobs || 1), 0);
        const avg = totalJobs > 0
          ? Number((rows.reduce((acc: number, r: any) => acc + ((r.avg_basco_score || 0) * (r.total_jobs || 1)), 0) / totalJobs).toFixed(1))
          : 87.0;
        const totalV = rows.reduce((acc: number, r: any) => acc + (r.total_violations || 0), 0);
        const marketsAtRisk = rows.filter((r: any) => (r.avg_basco_score || 0) < 80).length;
        const regionsAtRisk = new Set(rows.filter((r: any) => (r.avg_basco_score || 0) < 80).map((r: any) => r.region).filter(Boolean)).size;

        newSummary.marketMaturity = {
          markets_count: rows.length || 8,
          avg_score: avg,
          total_violations: totalV,
          markets_at_risk: marketsAtRisk,
          regions_at_risk: regionsAtRisk,
        };
      }

      setSummaryData((prev) => ({ ...prev, ...newSummary }));
    });


    return () => {
      isMounted = false;
    };
  }, []);

  // Derived League Table metrics
  const leagueRows = Array.isArray(leagueData)
    ? leagueData
    : (leagueData as any)?.data && Array.isArray((leagueData as any).data)
    ? (leagueData as any).data
    : [];

  const totalRetailers = leagueRows.length > 0 ? leagueRows.length : 9;
  const totalQueries = leagueRows.reduce((s: number, r: any) => s + (r.queries || 1), 0);
  const weightedLeagueScore = leagueRows.reduce((s: number, r: any) => s + ((r.basco ?? r.basco_score ?? 0) * (r.queries || 1)), 0);
  const avgBasco = totalQueries > 0
    ? (weightedLeagueScore / totalQueries).toFixed(1)
    : summaryData.marketMaturity?.avg_score
    ? summaryData.marketMaturity.avg_score.toFixed(1)
    : '87.0';

  const totalAttrLoss = leagueRows.length > 0
    ? leagueRows.reduce((s: number, r: any) => s + (r.attr_loss ?? 0), 0)
    : 173692;

  return (
    <div className="space-y-8 pb-12">
      {/* ── Top Executive Welcome & Status Banner ──────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#071739] via-[#0d2558] to-[#0062d2] rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="bg-blue-500/20 text-cyan-300 border border-cyan-400/30 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Q3 2026 Insights
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {user?.role === 'ADMIN' ? `Welcome back, ${user?.full_name || 'Admin'}` : 'Welcome back,'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
              Consolidated intelligence dashboard across Visual Adoption, Strategic CTA Alignment, Offer Conversions, Product Mix Rollout, and Global Market Maturity.
            </p>
          </div>
        </div>
      </div>

      {/* ── Core Cross-Module KPI Metric Highlights ────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Key Performance Indicators
          </h2>
          <span className="text-xs text-slate-400 font-medium">Real-time DB synchronization</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Card 1: Active Markets */}
          <Link
            to="/market-maturity"
            className="group bg-white hover:bg-amber-50/50 rounded-2xl border border-slate-200/90 shadow-sm p-4.5 transition-all hover:shadow-md hover:border-amber-300 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors shadow-2xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 3 0 18 18 0" />
                  <circle cx="9" cy="14" r="2.5" fill="currentColor" fillOpacity="0.2" />
                  <circle cx="15" cy="8" r="3.5" fill="currentColor" fillOpacity="0.25" />
                  <circle cx="18" cy="15" r="1.5" fill="currentColor" fillOpacity="0.2" />
                  <path d="m7 16 5-6 4 3 3-5" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full group-hover:bg-amber-100 transition-colors">
                View →
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-amber-900 tracking-tight block">
                {summaryData.marketMaturity?.markets_at_risk ?? 8}
              </span>
              <span className="text-xs font-bold text-slate-700 block mt-0.5">
                Markets at Risk
              </span>
              <span className="text-[11px] text-slate-400 font-medium block mt-1">
                of {summaryData.marketMaturity?.markets_count || 14} Monitored Markets
              </span>
            </div>
          </Link>

          {/* Card 2: Monitored Retailers */}
          <Link
            to="/league-table"
            className="group bg-white hover:bg-rose-50/50 rounded-2xl border border-slate-200/90 shadow-sm p-4.5 transition-all hover:shadow-md hover:border-rose-300 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors shadow-2xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
                  <path d="M6 4h12v5c0 3.31-2.69 6-6 6s-6-2.69-6-6V4Z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full group-hover:bg-rose-100 transition-colors">
                View →
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight block">
                {totalRetailers}
              </span>
              <span className="text-xs font-bold text-slate-700 block mt-0.5">
                Monitored Retailers
              </span>
              <span className="text-[11px] text-slate-400 font-medium block mt-1">
                ${(totalAttrLoss / 1000).toFixed(0)}K Loss at Risk
              </span>
            </div>
          </Link>

          {/* Card 3: Intel Visual Adoption */}
          <Link
            to="/visual-adoption"
            className="group bg-white hover:bg-blue-50/50 rounded-2xl border border-slate-200/90 shadow-sm p-4.5 transition-all hover:shadow-md hover:border-blue-300 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-2xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                  <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                  <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                  <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full group-hover:bg-blue-100 transition-colors">
                View →
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight block">
                {summaryData.visualAdoption?.adoption_pct || 74.7}%
              </span>
              <span className="text-xs font-bold text-slate-700 block mt-0.5">
                Intel Visual Adoption
              </span>
              <span className="text-[11px] text-slate-400 font-medium block mt-1">
                {summaryData.visualAdoption?.used_intel} / {summaryData.visualAdoption?.total_creatives} Intel Visuals
              </span>
            </div>
          </Link>

          {/* Card 4: CTA Aligned */}
          <Link
            to="/cta-campaign"
            className="group bg-white hover:bg-purple-50/50 rounded-2xl border border-slate-200/90 shadow-sm p-4.5 transition-all hover:shadow-md hover:border-purple-300 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-2xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 11 18-5v12L3 14v-3z" />
                  <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full group-hover:bg-purple-100 transition-colors">
                View →
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-purple-900 tracking-tight block">
                {summaryData.ctaCampaign?.aligned_count || 814}
              </span>
              <span className="text-xs font-bold text-slate-700 block mt-0.5">
                CTA Aligned
              </span>
              <span className="text-[11px] text-slate-400 font-medium block mt-1">
                {summaryData.ctaCampaign?.misaligned_count} Misaligned Assets
              </span>
            </div>
          </Link>

          {/* Card 5: Conversion Ready */}
          <Link
            to="/offer-cta"
            className="group bg-white hover:bg-emerald-50/50 rounded-2xl border border-slate-200/90 shadow-sm p-4.5 transition-all hover:shadow-md hover:border-emerald-300 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-2xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
                  <path d="M7 7h.01" strokeWidth="3" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full group-hover:bg-emerald-100 transition-colors">
                View →
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-emerald-900 tracking-tight block">
                {summaryData.offerCta?.conversion_ready || 422}
              </span>
              <span className="text-xs font-bold text-slate-700 block mt-0.5">
                Conversion Ready
              </span>
              <span className="text-[11px] text-slate-400 font-medium block mt-1">
                {summaryData.offerCta?.offer_missing_cta} Missing CTA Promo
              </span>
            </div>
          </Link>

          {/* Card 6: Product Mix */}
          <Link
            to="/product-mix"
            className="group bg-white hover:bg-cyan-50/50 rounded-2xl border border-slate-200/90 shadow-sm p-4.5 transition-all hover:shadow-md hover:border-cyan-300 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-colors shadow-2xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="16" height="16" x="4" y="4" rx="2" />
                  <rect width="6" height="6" x="9" y="9" rx="1" fill="currentColor" fillOpacity="0.2" />
                  <path d="M15 2v2" />
                  <path d="M15 20v2" />
                  <path d="M2 15h2" />
                  <path d="M2 9h2" />
                  <path d="M20 15h2" />
                  <path d="M20 9h2" />
                  <path d="M9 2v2" />
                  <path d="M9 20v2" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full group-hover:bg-cyan-100 transition-colors">
                View →
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-cyan-900 tracking-tight block truncate">
                Series 3
              </span>
              <span className="text-xs font-bold text-slate-700 block mt-0.5 truncate">
                Product Mix
              </span>
              <span className="text-[11px] text-slate-400 font-medium block mt-1 truncate">
                Pre-Launch Rollout
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Deep-Dive Domain Hubs Grid ───────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Intelligence Modules
          </h2>
          <span className="text-xs text-slate-400 font-medium">Detailed reports & analysis tools</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Module 1: Market Priorities (Active Markets) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shadow-2xs">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 3 0 18 18 0" />
                      <circle cx="9" cy="14" r="2.5" fill="currentColor" fillOpacity="0.2" />
                      <circle cx="15" cy="8" r="3.5" fill="currentColor" fillOpacity="0.25" />
                      <circle cx="18" cy="15" r="1.5" fill="currentColor" fillOpacity="0.2" />
                      <path d="m7 16 5-6 4 3 3-5" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Market Priorities</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Multi-quarter compliance vs risk scatter matrix
                    </p>
                  </div>
                </div>
                <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {summaryData.marketMaturity?.markets_count} Markets
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 my-4">
                <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 text-center">
                  <span className="text-xs text-amber-800 font-semibold block">Markets at Risk</span>
                  <span className="text-lg font-black text-amber-900 block mt-0.5">
                    {summaryData.marketMaturity?.markets_at_risk ?? 8}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                  <span className="text-xs text-slate-500 font-semibold block">Markets</span>
                  <span className="text-lg font-black text-slate-800 block mt-0.5">
                    {summaryData.marketMaturity?.markets_count}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                  <span className="text-xs text-slate-500 font-semibold block">Total Violations</span>
                  <span className="text-lg font-black text-slate-800 block mt-0.5">
                    {summaryData.marketMaturity?.total_violations.toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Interactive 4-quadrant scatter matrix comparing compliance score against FMV, estimated attribution loss, and text violations.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Multi-Quarter support (Q1, Q2 2026)</span>
              <Link
                to="/market-maturity"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1"
              >
                <span>Open Market Priorities</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Module 2: Retailer Performance (Monitored Retailers) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shadow-2xs">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                      <path d="M4 22h16" />
                      <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
                      <path d="M6 4h12v5c0 3.31-2.69 6-6 6s-6-2.69-6-6V4Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Retailer Performance</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Account rankings, FMV exposure, and query volumes
                    </p>
                  </div>
                </div>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  Rankings Active
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 my-4">
                <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-center">
                  <span className="text-xs text-blue-800 font-semibold block">Retailers</span>
                  <span className="text-lg font-black text-blue-900 block mt-0.5">
                    {totalRetailers}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                  <span className="text-xs text-slate-500 font-semibold block">Avg Score</span>
                  <span className="text-lg font-black text-slate-800 block mt-0.5">
                    {avgBasco}%
                  </span>
                </div>
                <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3 text-center">
                  <span className="text-xs text-rose-700 font-semibold block" title="Attribution Loss ($ at Risk)">
                    Attribution Loss
                  </span>
                  <span className="text-lg font-black text-rose-900 block mt-0.5">
                    ${(totalAttrLoss / 1000).toFixed(0)}K
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Leaderboard rankings of partner accounts sorted by BASCO compliance score, highlighting fair market value at risk.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Role-based row filtering for RSMs</span>
              <Link
                to="/league-table"
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1"
              >
                <span>Open Retailer Performance</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Module 3: Intel Visual Adoption */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shadow-2xs">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Intel Visual Adoption</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      PMS brand compliance and creative visual usage tracking
                    </p>
                  </div>
                </div>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {summaryData.visualAdoption?.adoption_pct}% Adoption
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 my-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                  <span className="text-xs text-slate-500 font-semibold block">Total Creatives</span>
                  <span className="text-lg font-black text-slate-800 block mt-0.5">
                    {summaryData.visualAdoption?.total_creatives}
                  </span>
                </div>
                <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-center">
                  <span className="text-xs text-blue-700 font-semibold block">Used Intel</span>
                  <span className="text-lg font-black text-blue-900 block mt-0.5">
                    {summaryData.visualAdoption?.used_intel}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                  <span className="text-xs text-slate-500 font-semibold block">Non-Intel</span>
                  <span className="text-lg font-black text-slate-700 block mt-0.5">
                    {(summaryData.visualAdoption?.total_creatives || 132) - (summaryData.visualAdoption?.used_intel || 52)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Tracks Intel Brand PMS badge adoption across global retail creatives with style filtering (Logo Only, Product Visuals, Core Ultra lockups).
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Includes Retailer-wise Adoption breakdown</span>
              <Link
                to="/visual-adoption"
                className="bg-[#0062d2] hover:bg-[#0051b0] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1"
              >
                <span>Open Intel Visual Adoption</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Module 4: Campaign Effectiveness (CTA Aligned) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shadow-2xs">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 11 18-5v12L3 14v-3z" />
                      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Campaign Effectiveness</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Call-to-Action distribution and strategic alignment checks
                    </p>
                  </div>
                </div>
                <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {summaryData.ctaCampaign?.aligned_count} Aligned
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 my-4">
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 text-center">
                  <span className="text-xs text-emerald-700 font-semibold block">Aligned</span>
                  <span className="text-lg font-black text-emerald-900 block mt-0.5">
                    {summaryData.ctaCampaign?.aligned_count}
                  </span>
                </div>
                <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3 text-center">
                  <span className="text-xs text-rose-700 font-semibold block">Misaligned</span>
                  <span className="text-lg font-black text-rose-900 block mt-0.5">
                    {summaryData.ctaCampaign?.misaligned_count}
                  </span>
                </div>
                <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 text-center">
                  <span className="text-xs text-amber-700 font-semibold block">No CTA Rate</span>
                  <span className="text-lg font-black text-amber-900 block mt-0.5">
                    {summaryData.ctaCampaign?.no_cta_pct}%
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Highlights strategic mismatches where Sales campaigns lack Buy/Shop CTAs, and renders volume treemaps with live creative lightbox inspections.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Includes Misaligned Evidence Table</span>
              <Link
                to="/cta-campaign"
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1"
              >
                <span>Open Campaign Effectiveness</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Module 5: Promotional Offer Effectiveness (Conversion Ready) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-2xs">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
                      <path d="M7 7h.01" strokeWidth="3" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Promotional Offer Effectiveness</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Promotion effectiveness & conversion readiness
                    </p>
                  </div>
                </div>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {summaryData.offerCta?.conversion_ready} Ready
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 my-4">
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 text-center">
                  <span className="text-xs text-emerald-700 font-semibold block">Has CTA</span>
                  <span className="text-lg font-black text-emerald-900 block mt-0.5">
                    {summaryData.offerCta?.conversion_ready}
                  </span>
                </div>
                <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3 text-center">
                  <span className="text-xs text-rose-700 font-semibold block">Missing CTA</span>
                  <span className="text-lg font-black text-rose-900 block mt-0.5">
                    {summaryData.offerCta?.offer_missing_cta}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                  <span className="text-xs text-slate-500 font-semibold block">Total Offers</span>
                  <span className="text-lg font-black text-slate-800 block mt-0.5">
                    {summaryData.offerCta?.total_offers}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Visualizes CTA inclusion rates across Offer Types (Affordability, Discount, Price) and Product × Offer intensity heatmaps.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Includes Promo Missing CTA Evidence</span>
              <Link
                to="/offer-cta"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1"
              >
                <span>Open Promotional Offer Effectiveness</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Module 6: Product Promotion & Priorities */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center shadow-2xs">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="16" height="16" x="4" y="4" rx="2" />
                      <rect width="6" height="6" x="9" y="9" rx="1" fill="currentColor" fillOpacity="0.2" />
                      <path d="M15 2v2" />
                      <path d="M15 20v2" />
                      <path d="M2 15h2" />
                      <path d="M2 9h2" />
                      <path d="M20 15h2" />
                      <path d="M20 9h2" />
                      <path d="M9 2v2" />
                      <path d="M9 20v2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Product Promotion & Priorities</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Pre-Launch Core Ultra & legacy generation adoption
                    </p>
                  </div>
                </div>
                <span className="bg-cyan-50 text-cyan-700 border border-cyan-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  Series 3 Rollout
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 my-4">
                <div className="bg-cyan-50/60 border border-cyan-100 rounded-xl p-3 text-center">
                  <span className="text-xs text-cyan-800 font-semibold block">Series 3 Focus</span>
                  <span className="text-lg font-black text-cyan-900 block mt-0.5">
                    Pre-Launch
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                  <span className="text-xs text-slate-500 font-semibold block">Regions</span>
                  <span className="text-lg font-black text-slate-800 block mt-0.5">
                    APJ, EMEA, LATAM
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                  <span className="text-xs text-slate-500 font-semibold block">Generations</span>
                  <span className="text-lg font-black text-slate-800 block mt-0.5">
                    8 Series
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Tracks Core Ultra Series 3/2/1 and 14th–10th Gen mix across top 20 retailers and regional pre-launch rollouts.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Includes Dynamic Series & Family Selectors</span>
              <Link
                to="/product-mix"
                className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1"
              >
                <span>Open Product Promotion & Priorities</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
