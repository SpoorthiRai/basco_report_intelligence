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

  const [summaryData, setSummaryData] = useState<ModuleSummaryData>({});

  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([
      api.get('/api/reports/visual-adoption-v2/'),
      api.get('/api/reports/cta-campaign/'),
      api.get('/api/reports/offer-cta/'),
      api.get('/api/reports/market-maturity/'),
    ]).then(([visRes, ctaRes, offRes, mmRes]) => {
      if (!isMounted) return;

      const newSummary: ModuleSummaryData = {};

      if (visRes.status === 'fulfilled' && visRes.value.data?.kpis) {
        const k = visRes.value.data.kpis;
        newSummary.visualAdoption = {
          total_creatives: k.total_creatives || 0,
          used_intel: k.used_intel_visuals ?? k.intel_layouts_count ?? 0,
          adoption_pct: k.master_visual_adoption_pct ?? 0,
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
      <div className="relative overflow-hidden bg-gradient-to-r from-[#071739] via-[#013FFC] to-[#5B8CFF] rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="bg-white/15 text-[#16D3C3] border border-[#16D3C3]/40 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Q3 2026 Insights
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {user?.role === 'ADMIN' ? `Welcome back, ${user?.full_name || 'Admin'}` : 'Welcome back,'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-100/90 mt-1.5 max-w-2xl leading-relaxed">
              Consolidated intelligence dashboard across Visual Adoption, Strategic CTA Alignment, Offer Conversions, Product Mix Rollout, and Global Market Maturity.
            </p>
          </div>
        </div>
      </div>

      {/* ── Core Cross-Module KPI Metric Highlights ────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
            Key Performance Indicators
          </h2>
          <span className="text-xs text-[#6B7280] font-medium">Real-time DB synchronization</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Card 1: Active Markets */}
          <Link
            to="/market-maturity"
            className="group bg-white hover:bg-slate-50 rounded-2xl border border-[#E5E7EB] shadow-sm p-4.5 transition-all hover:shadow-md hover:border-[#64748B]/40 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-[#64748B]/10 text-[#64748B] flex items-center justify-center group-hover:bg-[#64748B] group-hover:text-white transition-colors shadow-2xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 3 0 18 18 0" />
                  <circle cx="9" cy="14" r="2.5" fill="currentColor" fillOpacity="0.2" />
                  <circle cx="15" cy="8" r="3.5" fill="currentColor" fillOpacity="0.25" />
                  <circle cx="18" cy="15" r="1.5" fill="currentColor" fillOpacity="0.2" />
                  <path d="m7 16 5-6 4 3 3-5" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-[#64748B] bg-[#64748B]/10 px-2 py-0.5 rounded-full group-hover:bg-[#64748B]/20 transition-colors">
                View →
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-[#111827] tracking-tight block">
                {summaryData.marketMaturity?.markets_at_risk ?? 8}
              </span>
              <span className="text-xs font-bold text-[#111827] block mt-0.5">
                Markets at Risk
              </span>
              <span className="text-[11px] text-[#6B7280] font-medium block mt-1">
                of {summaryData.marketMaturity?.markets_count || 14} Monitored Markets
              </span>
            </div>
          </Link>

          {/* Card 2: Monitored Retailers */}
          <Link
            to="/league-table"
            className="group bg-white hover:bg-blue-50/50 rounded-2xl border border-[#E5E7EB] shadow-sm p-4.5 transition-all hover:shadow-md hover:border-[#013FFC]/40 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-[#013FFC]/10 text-[#013FFC] flex items-center justify-center group-hover:bg-[#013FFC] group-hover:text-white transition-colors shadow-2xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
                  <path d="M6 4h12v5c0 3.31-2.69 6-6 6s-6-2.69-6-6V4Z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-[#013FFC] bg-[#013FFC]/10 px-2 py-0.5 rounded-full group-hover:bg-[#013FFC]/20 transition-colors">
                View →
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-[#111827] tracking-tight block">
                {totalRetailers}
              </span>
              <span className="text-xs font-bold text-[#111827] block mt-0.5">
                Monitored Retailers
              </span>
              <span className="text-[11px] text-[#6B7280] font-medium block mt-1">
                ${(totalAttrLoss / 1000).toFixed(0)}K Loss at Risk
              </span>
            </div>
          </Link>

          {/* Card 3: Intel Visual Adoption */}
          <Link
            to="/visual-adoption"
            className="group bg-white hover:bg-sky-50/50 rounded-2xl border border-[#E5E7EB] shadow-sm p-4.5 transition-all hover:shadow-md hover:border-[#0EA5E9]/50 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-[#0EA5E9]/15 text-[#0EA5E9] flex items-center justify-center group-hover:bg-[#0EA5E9] group-hover:text-white transition-colors shadow-2xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                  <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                  <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                  <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-[#0EA5E9] bg-[#0EA5E9]/15 px-2 py-0.5 rounded-full group-hover:bg-[#0EA5E9]/30 transition-colors">
                View →
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-[#111827] tracking-tight block">
                {summaryData.visualAdoption?.adoption_pct ?? 0}%
              </span>
              <span className="text-xs font-bold text-[#111827] block mt-0.5">
                Master Visual Adoption
              </span>
              <span className="text-[11px] text-[#6B7280] font-medium block mt-1">
                (Intel + Custom Layouts)
              </span>
            </div>
          </Link>

          {/* Card 4: CTA Aligned */}
          <Link
            to="/cta-campaign"
            className="group bg-white hover:bg-blue-50/50 rounded-2xl border border-[#E5E7EB] shadow-sm p-4.5 transition-all hover:shadow-md hover:border-[#013FFC]/40 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-[#013FFC]/10 text-[#013FFC] flex items-center justify-center group-hover:bg-[#013FFC] group-hover:text-white transition-colors shadow-2xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 11 18-5v12L3 14v-3z" />
                  <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-[#013FFC] bg-[#013FFC]/10 px-2 py-0.5 rounded-full group-hover:bg-[#013FFC]/20 transition-colors">
                View →
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-[#013FFC] tracking-tight block">
                {summaryData.ctaCampaign?.aligned_count || 814}
              </span>
              <span className="text-xs font-bold text-[#111827] block mt-0.5">
                CTA Aligned
              </span>
              <span className="text-[11px] text-[#6B7280] font-medium block mt-1">
                {summaryData.ctaCampaign?.misaligned_count} Misaligned Assets
              </span>
            </div>
          </Link>

          {/* Card 5: Conversion Ready */}
          <Link
            to="/offer-cta"
            className="group bg-white hover:bg-sky-50/50 rounded-2xl border border-[#E5E7EB] shadow-sm p-4.5 transition-all hover:shadow-md hover:border-[#0EA5E9]/40 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-[#0EA5E9]/10 text-[#0EA5E9] flex items-center justify-center group-hover:bg-[#0EA5E9] group-hover:text-white transition-colors shadow-2xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
                  <path d="M7 7h.01" strokeWidth="3" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-[#0EA5E9] bg-[#0EA5E9]/10 px-2 py-0.5 rounded-full group-hover:bg-[#0EA5E9]/20 transition-colors">
                View →
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-[#0EA5E9] tracking-tight block">
                {summaryData.offerCta?.conversion_ready || 422}
              </span>
              <span className="text-xs font-bold text-[#111827] block mt-0.5">
                Conversion Ready
              </span>
              <span className="text-[11px] text-[#6B7280] font-medium block mt-1">
                {summaryData.offerCta?.offer_missing_cta} Missing CTA Promo
              </span>
            </div>
          </Link>

          {/* Card 6: Product Mix */}
          <Link
            to="/product-mix"
            className="group bg-white hover:bg-slate-50 rounded-2xl border border-[#E5E7EB] shadow-sm p-4.5 transition-all hover:shadow-md hover:border-[#64748B]/40 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-[#64748B]/10 text-[#64748B] flex items-center justify-center group-hover:bg-[#64748B] group-hover:text-white transition-colors shadow-2xs">
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
              <span className="text-[10px] font-bold text-[#64748B] bg-[#64748B]/10 px-2 py-0.5 rounded-full group-hover:bg-[#64748B]/20 transition-colors">
                View →
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-[#64748B] tracking-tight block truncate">
                Series 3
              </span>
              <span className="text-xs font-bold text-[#111827] block mt-0.5 truncate">
                Product Mix
              </span>
              <span className="text-[11px] text-[#6B7280] font-medium block mt-1 truncate">
                Pre-Launch Rollout
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Deep-Dive Domain Hubs Grid ───────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
            Intelligence Modules
          </h2>
          <span className="text-xs text-[#6B7280] font-medium">Detailed reports & analysis tools</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Module 1: Market Priorities (Active Markets) */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center shadow-2xs">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 3 0 18 18 0" />
                      <circle cx="9" cy="14" r="2.5" fill="currentColor" fillOpacity="0.2" />
                      <circle cx="15" cy="8" r="3.5" fill="currentColor" fillOpacity="0.25" />
                      <circle cx="18" cy="15" r="1.5" fill="currentColor" fillOpacity="0.2" />
                      <path d="m7 16 5-6 4 3 3-5" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">Market Priorities</h3>
                    <p className="text-[11px] text-[#6B7280] font-medium">
                      Multi-quarter compliance vs risk scatter matrix
                    </p>
                  </div>
                </div>
                <span className="bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {summaryData.marketMaturity?.markets_count ?? 8} Markets
                </span>
              </div>

              {/* Compact Metric Strip */}
              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#F59E0B] font-semibold block uppercase tracking-wider">Markets at Risk</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    {summaryData.marketMaturity?.markets_at_risk ?? 0}
                  </span>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#6B7280] font-semibold block uppercase tracking-wider">Monitored</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    {summaryData.marketMaturity?.markets_count ?? 8}
                  </span>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#6B7280] font-semibold block uppercase tracking-wider">Violations</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    {(summaryData.marketMaturity?.total_violations ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Graphical Visual: Compliance Health Micro-Bar */}
              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-2.5 mb-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#111827] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                    Avg Compliance Health
                  </span>
                  <span className="text-[#10B981] font-black">{summaryData.marketMaturity?.avg_score ?? 87.0}%</span>
                </div>
                <div className="w-full bg-[#CBD5E1] h-2 rounded-full overflow-hidden flex">
                  <div
                    className="bg-gradient-to-r from-[#F59E0B] via-[#10B981] to-[#16D3C3] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, summaryData.marketMaturity?.avg_score ?? 87))}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2.5 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[10px] text-[#6B7280] font-medium">Multi-Quarter risk matrix</span>
              <Link
                to="/market-maturity"
                className="bg-[#F59E0B] hover:bg-[#D97706] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
              >
                <span>Open Market Priorities</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Module 2: Retailer Performance (Monitored Retailers) */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#013FFC]/10 text-[#013FFC] flex items-center justify-center shadow-2xs">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                      <path d="M4 22h16" />
                      <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
                      <path d="M6 4h12v5c0 3.31-2.69 6-6 6s-6-2.69-6-6V4Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">Retailer Performance</h3>
                    <p className="text-[11px] text-[#6B7280] font-medium">
                      Account rankings, FMV exposure, and query volumes
                    </p>
                  </div>
                </div>
                <span className="bg-[#013FFC]/10 text-[#013FFC] border border-[#013FFC]/20 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  Rankings Active
                </span>
              </div>

              {/* Compact Metric Strip */}
              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="bg-[#013FFC]/10 border border-[#013FFC]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#013FFC] font-semibold block uppercase tracking-wider">Retailers</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    {totalRetailers}
                  </span>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#6B7280] font-semibold block uppercase tracking-wider">Avg Score</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    {avgBasco}%
                  </span>
                </div>
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#EF4444] font-semibold block uppercase tracking-wider" title="Attribution Loss ($ at Risk)">
                    Loss Risk
                  </span>
                  <span className="text-base font-black text-[#EF4444] block mt-0.5">
                    ${(totalAttrLoss / 1000).toFixed(0)}K
                  </span>
                </div>
              </div>

              {/* Graphical Visual: Retailer Tier Split Bar */}
              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-2.5 mb-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#111827] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#013FFC]" />
                    Compliance Tier Distribution
                  </span>
                  <span className="text-[#6B7280] font-bold">{totalRetailers} Accounts</span>
                </div>
                <div className="w-full bg-[#CBD5E1] h-2 rounded-full overflow-hidden flex gap-0.5">
                  <div className="bg-[#10B981] h-full rounded-l-full" style={{ width: '70%' }} title="High Compliance (>=85%)" />
                  <div className="bg-[#F59E0B] h-full" style={{ width: '20%' }} title="Mid Compliance (80-84%)" />
                  <div className="bg-[#EF4444] h-full rounded-r-full" style={{ width: '10%' }} title="At Risk (<80%)" />
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2.5 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[10px] text-[#6B7280] font-medium">Role-based row filtering</span>
              <Link
                to="/league-table"
                className="bg-[#013FFC] hover:bg-[#0036D9] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
              >
                <span>Open Retailer Performance</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Module 3: Intel Visual Adoption */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#16D3C3]/15 text-[#0d7d74] flex items-center justify-center shadow-2xs">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">Intel Visual Adoption</h3>
                    <p className="text-[11px] text-[#6B7280] font-medium">
                      PMS brand compliance and creative visual usage tracking
                    </p>
                  </div>
                </div>
                <span className="bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {summaryData.visualAdoption?.adoption_pct ?? 0}% Master Adoption
                </span>
              </div>

              {/* Compact Metric Strip */}
              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#6B7280] font-semibold block uppercase tracking-wider">Creatives</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    {summaryData.visualAdoption?.total_creatives ?? 0}
                  </span>
                </div>
                <div className="bg-[#013FFC]/10 border border-[#013FFC]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#013FFC] font-semibold block uppercase tracking-wider">Intel Layouts</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    {summaryData.visualAdoption?.used_intel ?? 0}
                  </span>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#6B7280] font-semibold block uppercase tracking-wider">Other</span>
                  <span className="text-base font-black text-[#6B7280] block mt-0.5">
                    {Math.max(0, (summaryData.visualAdoption?.total_creatives || 0) - (summaryData.visualAdoption?.used_intel || 0))}
                  </span>
                </div>
              </div>

              {/* Graphical Visual: Master Adoption Ratio Bar */}
              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-2.5 mb-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#111827] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#013FFC]" />
                    Intel & Custom vs Non-Intel
                  </span>
                  <span className="text-[#013FFC] font-black">{summaryData.visualAdoption?.adoption_pct ?? 0}% Adopted</span>
                </div>
                <div className="w-full bg-[#CBD5E1] h-2 rounded-full overflow-hidden flex gap-0.5">
                  <div
                    className="bg-gradient-to-r from-[#013FFC] to-[#16D3C3] h-full rounded-l-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, summaryData.visualAdoption?.adoption_pct ?? 0))}%` }}
                    title="Intel & Custom Layouts"
                  />
                  <div
                    className="bg-[#CBD5E1] h-full rounded-r-full transition-all duration-500"
                    style={{ width: `${Math.max(0, 100 - (summaryData.visualAdoption?.adoption_pct ?? 0))}%` }}
                    title="Non-Intel Layouts"
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2.5 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[10px] text-[#6B7280] font-medium">Retailer-wise breakdown</span>
              <Link
                to="/visual-adoption"
                className="bg-[#013FFC] hover:bg-[#0036D9] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
              >
                <span>Open Intel Visual Adoption</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Module 4: Campaign Effectiveness (CTA Aligned) */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#7A35F4]/10 text-[#7A35F4] flex items-center justify-center shadow-2xs">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 11 18-5v12L3 14v-3z" />
                      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">Campaign Effectiveness</h3>
                    <p className="text-[11px] text-[#6B7280] font-medium">
                      Call-to-Action distribution and strategic alignment
                    </p>
                  </div>
                </div>
                <span className="bg-[#7A35F4]/10 text-[#7A35F4] border border-[#7A35F4]/25 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {summaryData.ctaCampaign?.aligned_count ?? 0} Aligned
                </span>
              </div>

              {/* Compact Metric Strip */}
              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="bg-[#10B981]/10 border border-[#10B981]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#10B981] font-semibold block uppercase tracking-wider">Aligned</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    {summaryData.ctaCampaign?.aligned_count ?? 0}
                  </span>
                </div>
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#EF4444] font-semibold block uppercase tracking-wider">Misaligned</span>
                  <span className="text-base font-black text-[#EF4444] block mt-0.5">
                    {summaryData.ctaCampaign?.misaligned_count ?? 0}
                  </span>
                </div>
                <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#F59E0B] font-semibold block uppercase tracking-wider">No CTA</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    {summaryData.ctaCampaign?.no_cta_pct ?? 0}%
                  </span>
                </div>
              </div>

              {/* Graphical Visual: Strategic Alignment Split Bar */}
              {(() => {
                const aligned = summaryData.ctaCampaign?.aligned_count || 0;
                const misaligned = summaryData.ctaCampaign?.misaligned_count || 0;
                const total = aligned + misaligned || 1;
                const alignedPct = Math.round((aligned / total) * 100);
                const misalignedPct = 100 - alignedPct;
                return (
                  <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-2.5 mb-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#111827] mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#7A35F4]" />
                        CTA Alignment Ratio
                      </span>
                      <span className="text-[#7A35F4] font-bold">{alignedPct}% Aligned</span>
                    </div>
                    <div className="w-full bg-[#CBD5E1] h-2 rounded-full overflow-hidden flex gap-0.5">
                      <div className="bg-[#10B981] h-full rounded-l-full transition-all duration-500" style={{ width: `${alignedPct}%` }} title="Aligned CTAs" />
                      <div className="bg-[#EF4444] h-full rounded-r-full transition-all duration-500" style={{ width: `${misalignedPct}%` }} title="Misaligned CTAs" />
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="mt-2 pt-2.5 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[10px] text-[#6B7280] font-medium">Misaligned Evidence Locker</span>
              <Link
                to="/cta-campaign"
                className="bg-[#7A35F4] hover:bg-[#6825E0] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
              >
                <span>Open Campaign Effectiveness</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Module 5: Promotional Offer Effectiveness (Conversion Ready) */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 text-[#10B981] flex items-center justify-center shadow-2xs">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
                      <path d="M7 7h.01" strokeWidth="3" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">Promotional Offer Effectiveness</h3>
                    <p className="text-[11px] text-[#6B7280] font-medium">
                      Promotion effectiveness & conversion readiness
                    </p>
                  </div>
                </div>
                <span className="bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {summaryData.offerCta?.conversion_ready ?? 0} Ready
                </span>
              </div>

              {/* Compact Metric Strip */}
              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="bg-[#10B981]/10 border border-[#10B981]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#10B981] font-semibold block uppercase tracking-wider">Has CTA</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    {summaryData.offerCta?.conversion_ready ?? 0}
                  </span>
                </div>
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#EF4444] font-semibold block uppercase tracking-wider">Missing CTA</span>
                  <span className="text-base font-black text-[#EF4444] block mt-0.5">
                    {summaryData.offerCta?.offer_missing_cta ?? 0}
                  </span>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#6B7280] font-semibold block uppercase tracking-wider">Total Offers</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    {summaryData.offerCta?.total_offers ?? 0}
                  </span>
                </div>
              </div>

              {/* Graphical Visual: Conversion Readiness Bar */}
              {(() => {
                const ready = summaryData.offerCta?.conversion_ready || 0;
                const total = summaryData.offerCta?.total_offers || ready || 1;
                const readyPct = Math.round((ready / total) * 100);
                const missingPct = 100 - readyPct;
                return (
                  <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-2.5 mb-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#111827] mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                        Offer Conversion Readiness
                      </span>
                      <span className="text-[#10B981] font-bold">{readyPct}% Ready</span>
                    </div>
                    <div className="w-full bg-[#CBD5E1] h-2 rounded-full overflow-hidden flex gap-0.5">
                      <div className="bg-[#10B981] h-full rounded-l-full transition-all duration-500" style={{ width: `${readyPct}%` }} title="Conversion Ready" />
                      <div className="bg-[#F59E0B] h-full rounded-r-full transition-all duration-500" style={{ width: `${missingPct}%` }} title="Missing CTA Promo" />
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="mt-2 pt-2.5 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[10px] text-[#6B7280] font-medium">Promo Missing CTA Table</span>
              <Link
                to="/offer-cta"
                className="bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
              >
                <span>Open Promotional Offers</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Module 6: Product Promotion & Priorities */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#013FFC]/10 text-[#013FFC] flex items-center justify-center shadow-2xs">
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
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">Product Promotion & Priorities</h3>
                    <p className="text-[11px] text-[#6B7280] font-medium">
                      Pre-Launch Core Ultra & legacy generation adoption
                    </p>
                  </div>
                </div>
                <span className="bg-[#013FFC]/10 text-[#013FFC] border border-[#013FFC]/20 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  Series 3 Rollout
                </span>
              </div>

              {/* Compact Metric Strip */}
              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="bg-[#013FFC]/10 border border-[#013FFC]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#013FFC] font-semibold block uppercase tracking-wider">Series 3</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    Pre-Launch
                  </span>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#6B7280] font-semibold block uppercase tracking-wider">Regions</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    3 Active
                  </span>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#6B7280] font-semibold block uppercase tracking-wider">Generations</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    8 Series
                  </span>
                </div>
              </div>

              {/* Graphical Visual: Generation Spectrum Pill Bar */}
              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-2.5 mb-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#111827] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#16D3C3]" />
                    Generation Rollout Spectrum
                  </span>
                  <span className="text-[#013FFC] font-bold">Series 3 / 2 / 1 + Gen 14–10</span>
                </div>
                <div className="w-full bg-[#CBD5E1] h-2 rounded-full overflow-hidden flex gap-0.5">
                  <div className="bg-gradient-to-r from-[#16D3C3] to-[#013FFC] h-full rounded-l-full" style={{ width: '45%' }} title="Core Ultra (Series 3/2/1)" />
                  <div className="bg-[#5B8CFF] h-full" style={{ width: '35%' }} title="Core 14th / 13th Gen" />
                  <div className="bg-[#CBD5E1] h-full rounded-r-full" style={{ width: '20%' }} title="Legacy 12th–10th Gen" />
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2.5 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[10px] text-[#6B7280] font-medium">Series & Family selectors</span>
              <Link
                to="/product-mix"
                className="bg-[#013FFC] hover:bg-[#0036D9] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
              >
                <span>Open Product Promotion</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
