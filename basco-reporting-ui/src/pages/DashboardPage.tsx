// src/pages/DashboardPage.tsx
// Overview UI only. KPI math is computed by GET /api/reports/overview/.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useOverviewFilters } from '../store/overviewFiltersStore';

function fmtCompactUsd(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '$0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const millions = abs / 1_000_000;
    const formatted = millions >= 10 ? String(Math.round(millions)) : millions.toFixed(1).replace(/\.0$/, '');
    return `${sign}$${formatted}M`;
  }
  if (abs >= 1000) {
    return `${sign}$${Math.round(abs / 1000)}K`;
  }
  return `${sign}$${Math.round(abs)}`;
}

const EMPTY_CARDS = {
  basco_score: { value: 0, delta_pts: null as number | null },
  creatives_at_risk: { count: 0, total: 0 },
  retailers_below_target: { count: 0, top_accounts: 0 },
  top_compliance_issue: { label: '—', creatives: 0, rate: 0, retailer_count: 0 },
  fmv_loss: { value: 0, retailer_count: 0 },
  fmv_protected: { value: 0, retailer_count: 0 },
};

const EMPTY_HEALTH = {
  good_performer: 0,
  bad_performer: 0,
  good_performer_pct: 0,
  bad_performer_pct: 0,
  healthy: 0,
  strong: 0,
  watch: 0,
  critical: 0,
  need_attention: 0,
  healthy_pct: 0,
  strong_pct: 0,
  watch_pct: 0,
  critical_pct: 0,
  need_attention_pct: 0,
};

const EMPTY_MODULES = {
  market_maturity: { markets_count: 0, markets_at_risk: 0, markets_on_track: 0, avg_score: 0 },
  market_coverage: {
    retailers_monitored: 0,
    basco_score: 0,
    creatives_evaluated: 0,
    fmv_loss: 0,
    retailer_health: { ...EMPTY_HEALTH },
  },
  retailer: {
    total_retailers: 0,
    avg_basco: 0,
    fmv_loss: 0,
    retailer_health: { ...EMPTY_HEALTH },
  },
  execution_gaps: {
    creatives_at_risk_pct: 0,
    missing_brand_elements: 0,
    promo_without_cta: 0,
    largest_gap: {
      size_pct: 0,
      placement_pct: 0,
      missing_pct: 0,
      usage_pct: 0,
      outdated_pct: 0,
      recommended_pct: 0,
      dominant: 'Missing',
      insight: 'Most execution gaps come from missing required elements',
    },
  },
  visual_adoption: {
    total_creatives: 0,
    used_intel: 0,
    adoption_pct: 0,
    creatives_at_risk: 0,
    cobranded_pct: 0,
    retail_custom: 0,
    retail_custom_total: 0,
    pms_mix: { partial: 0, partial_pct: 0, complete: 0, complete_pct: 0 },
    insight: 'PMS asset adoption during POP-submission is 0% lower than Helpdesk submitted creatives',
  },
  helpdesk: {
    queries_received: 0,
    final_approval_pct: 0,
    intel_specific_creatives: 0,
    campaign_mix: {
      intel_days: 0,
      intel_days_pct: 0,
      intel_gamer_days: 0,
      intel_gamer_days_pct: 0,
      igd: 0,
      igd_pct: 0,
      back_to_school: 0,
      back_to_school_pct: 0,
      other: 0,
      other_pct: 0,
    },
    retailers_outside_loop: 0,
    insight: 'Helpdesk adoption is growing, but 0 retailers are still outside the support loop',
  },
  creative_effectiveness: {
    low_intel_voice_pct: 0,
    objective_aligned_pct: 0,
    missing_cta: 0,
    missing_cta_total: 0,
    product_mix: {
      gaming: 0,
      gaming_pct: 0,
      core_ultra: 0,
      core_ultra_pct: 0,
      core_processor: 0,
      core_processor_pct: 0,
    },
    misaligned_gaming: 0,
    insight: 'Intel voice of application is critical — 0% of creatives are Light or Neutral, and 0 gaming creatives are misaligned',
  },
  promotion_led: {
    promo_without_cta_pct: 0,
    price_discount: 0,
    price_discount_total: 0,
    without_offer: 0,
    without_offer_total: 0,
    cta_mix: {
      buy_shop: 0,
      buy_shop_pct: 0,
      urgency: 0,
      urgency_pct: 0,
      no_cta: 0,
      no_cta_pct: 0,
      learn: 0,
      learn_pct: 0,
      other: 0,
      other_pct: 0,
    },
    weak_promo_count: 0,
    weak_retailer_count: 0,
    insight: '0 of promotion-led creatives of 0 retailers are not fully equipped to convert shopper interest into action',
  },
};

export default function DashboardPage() {
  const [cards, setCards] = useState(EMPTY_CARDS);
  const [modules, setModules] = useState(EMPTY_MODULES);
  const quarter = useOverviewFilters((s) => s.quarter);
  const region = useOverviewFilters((s) => s.region);
  const setOptions = useOverviewFilters((s) => s.setOptions);

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams();
    if (quarter) params.set('quarter', quarter);
    if (region) params.set('region', region);
    const qs = params.toString();

    api.get(`/api/reports/overview/${qs ? `?${qs}` : ''}`).then((res) => {
      if (!isMounted) return;
      if (res.data?.filter_options) {
        setOptions({
          quarters: res.data.filter_options.quarters,
          regions: res.data.filter_options.regions,
          defaultQuarter: res.data.filter_options.default_quarter,
        });
      }
      if (res.data?.cards) setCards({ ...EMPTY_CARDS, ...res.data.cards });
      if (res.data?.modules) {
        setModules({
          market_maturity: { ...EMPTY_MODULES.market_maturity, ...res.data.modules.market_maturity },
          market_coverage: {
            ...EMPTY_MODULES.market_coverage,
            ...res.data.modules.market_coverage,
            retailer_health: {
              ...EMPTY_HEALTH,
              ...res.data.modules.market_coverage?.retailer_health,
            },
          },
          retailer: {
            ...EMPTY_MODULES.retailer,
            ...res.data.modules.retailer,
            retailer_health: {
              ...EMPTY_HEALTH,
              ...res.data.modules.retailer?.retailer_health,
            },
          },
          execution_gaps: {
            ...EMPTY_MODULES.execution_gaps,
            ...res.data.modules.execution_gaps,
            largest_gap: {
              ...EMPTY_MODULES.execution_gaps.largest_gap,
              ...res.data.modules.execution_gaps?.largest_gap,
            },
          },
          visual_adoption: {
            ...EMPTY_MODULES.visual_adoption,
            ...res.data.modules.visual_adoption,
            pms_mix: {
              ...EMPTY_MODULES.visual_adoption.pms_mix,
              ...res.data.modules.visual_adoption?.pms_mix,
            },
          },
          helpdesk: {
            ...EMPTY_MODULES.helpdesk,
            ...res.data.modules.helpdesk,
            campaign_mix: {
              ...EMPTY_MODULES.helpdesk.campaign_mix,
              ...res.data.modules.helpdesk?.campaign_mix,
            },
          },
          creative_effectiveness: {
            ...EMPTY_MODULES.creative_effectiveness,
            ...res.data.modules.creative_effectiveness,
            product_mix: {
              ...EMPTY_MODULES.creative_effectiveness.product_mix,
              ...res.data.modules.creative_effectiveness?.product_mix,
            },
          },
          promotion_led: {
            ...EMPTY_MODULES.promotion_led,
            ...res.data.modules.promotion_led,
            cta_mix: {
              ...EMPTY_MODULES.promotion_led.cta_mix,
              ...res.data.modules.promotion_led?.cta_mix,
            },
          },
        });
      }
    }).catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [quarter, region, setOptions]);

  const coverage = modules.market_coverage;
  const coverageHealth = coverage.retailer_health;
  const gaps = modules.execution_gaps;
  const helpdesk = modules.helpdesk;
  const creative = modules.creative_effectiveness;
  const promo = modules.promotion_led;
  const intelVisual = modules.visual_adoption;

  return (
    <div className="space-y-8 pb-12">
      {/* ── Top Executive Welcome & Status Banner ──────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0B1325] via-[#122449] to-[#1C3668] rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="bg-white/15 text-[#0D9488] border border-[#0D9488]/40 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                {quarter === 'All Quarters' ? 'ALL QUARTERS' : quarter}
                {region && region !== 'All' ? ` · ${region}` : ''}
                {' | RETAIL MARKETING INTELLIGENCE'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              BASCO Performance Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-100/90 mt-1.5 leading-relaxed">
              See where retail execution is performing, where brand value may be at risk, and which opportunities need attention.
            </p>
          </div>
        </div>
      </div>

      {/* ── Core Cross-Module KPI Metric Highlights ────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
            BASCO Performance Overview
          </h2>
          <span className="text-xs text-[#6B7280] font-medium">Real-time DB synchronization</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Card 1: BASCO Score */}
          <Link
            to="/league-table"
            className="group bg-white hover:bg-slate-50 rounded-2xl border border-[#E5E7EB] shadow-xs p-4.5 transition-all hover:shadow-md hover:border-[#64748B]/40 flex flex-col justify-between"
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
                {cards.basco_score.value}%
              </span>
              <span className="text-xs font-bold text-[#111827] block mt-0.5">
                BASCO Score
              </span>
              <span className="text-[11px] text-[#6B7280] font-medium block mt-1">
                {cards.basco_score.delta_pts == null
                  ? 'vs prior quarter'
                  : `${cards.basco_score.delta_pts >= 0 ? '↑' : '↓'} ${Math.abs(cards.basco_score.delta_pts).toFixed(1)} pts`}
              </span>
            </div>
          </Link>

          {/* Card 2: Creatives at Risk */}
          <Link
            to="/league-table"
            className="group bg-white hover:bg-blue-50/50 rounded-2xl border border-[#E5E7EB] shadow-xs p-4.5 transition-all hover:shadow-md hover:border-[#1E429F]/40 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-[#1E429F]/10 text-[#1E429F] flex items-center justify-center group-hover:bg-[#1E429F] group-hover:text-white transition-colors shadow-2xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
                  <path d="M6 4h12v5c0 3.31-2.69 6-6 6s-6-2.69-6-6V4Z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-[#1E429F] bg-[#1E429F]/10 px-2 py-0.5 rounded-full group-hover:bg-[#1E429F]/20 transition-colors">
                View →
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-[#111827] tracking-tight block">
                {cards.creatives_at_risk.count.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-[#111827] block mt-0.5">
                Creatives at Risk
              </span>
              <span className="text-[11px] text-[#6B7280] font-medium block mt-1">
                Out of {cards.creatives_at_risk.total.toLocaleString()}
              </span>
            </div>
          </Link>

          {/* Card 3: Retailers Below Target */}
          <Link
            to="/market-maturity"
            className="group bg-white hover:bg-sky-50/50 rounded-2xl border border-[#E5E7EB] shadow-xs p-4.5 transition-all hover:shadow-md hover:border-[#0EA5E9]/50 flex flex-col justify-between"
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
                {cards.retailers_below_target.count}
              </span>
              <span className="text-xs font-bold text-[#111827] block mt-0.5">
                Retailers Below Target
              </span>
              <span className="text-[11px] text-[#6B7280] font-medium block mt-1">
                {cards.retailers_below_target.top_accounts} Top Accounts
              </span>
            </div>
          </Link>

          {/* Card 4: Top Compliance Issue */}
          <Link
            to="/league-table"
            className="group bg-white hover:bg-blue-50/50 rounded-2xl border border-[#E5E7EB] shadow-xs p-4.5 transition-all hover:shadow-md hover:border-[#1E429F]/40 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-[#1E429F]/10 text-[#1E429F] flex items-center justify-center group-hover:bg-[#1E429F] group-hover:text-white transition-colors shadow-2xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 11 18-5v12L3 14v-3z" />
                  <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-[#1E429F] bg-[#1E429F]/10 px-2 py-0.5 rounded-full group-hover:bg-[#1E429F]/20 transition-colors">
                View →
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-[#1E429F] tracking-tight block leading-tight">
                {cards.top_compliance_issue.label}
              </span>
              <span className="text-xs font-bold text-[#111827] block mt-0.5">
                Top Compliance Issue
              </span>
              <span className="text-[11px] text-[#6B7280] font-medium block mt-1">
                {cards.top_compliance_issue.creatives.toLocaleString()} creatives · {cards.top_compliance_issue.retailer_count} retailers
              </span>
            </div>
          </Link>

          {/* Card 5: FMV Loss Identified */}
          <Link
            to="/league-table"
            className="group bg-white hover:bg-sky-50/50 rounded-2xl border border-[#E5E7EB] shadow-xs p-4.5 transition-all hover:shadow-md hover:border-[#0EA5E9]/40 flex flex-col justify-between"
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
                {fmtCompactUsd(cards.fmv_loss.value)}
              </span>
              <span className="text-xs font-bold text-[#111827] block mt-0.5">
                FMV Loss Identified
              </span>
              <span className="text-[11px] text-[#6B7280] font-medium block mt-1">
                {cards.fmv_loss.retailer_count} retailers
              </span>
            </div>
          </Link>

          {/* Card 6: FMV Value Protected */}
          <Link
            to="/league-table"
            className="group bg-white hover:bg-slate-50 rounded-2xl border border-[#E5E7EB] shadow-xs p-4.5 transition-all hover:shadow-md hover:border-[#64748B]/40 flex flex-col justify-between"
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
              <span className="text-2xl font-black text-[#64748B] tracking-tight block">
                {fmtCompactUsd(cards.fmv_protected.value)}
              </span>
              <span className="text-xs font-bold text-[#111827] block mt-0.5 truncate">
                FMV Value Protected
              </span>
              <span className="text-[11px] text-[#6B7280] font-medium block mt-1 truncate">
                {cards.fmv_protected.retailer_count} retailers
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Deep-Dive Domain Hubs Grid ───────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
            Explore Retail Marketing Performance
          </h2>
          <span className="text-xs text-[#6B7280] font-medium">Detailed reports & analysis tools</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Module 1: Market Coverage & Performance */}
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
                    <h3 className="text-sm font-bold text-[#111827]">Market Coverage & Performance</h3>
                    <p className="text-[11px] text-[#6B7280] font-medium">
                      How much of the retail ecosystem are we covering, and how well is it performing?
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#6B7280] font-semibold block uppercase tracking-wider">Retailers Monitored</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    {coverage.retailers_monitored}
                  </span>
                </div>
                <div className="bg-[#1E429F]/10 border border-[#1E429F]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#1E429F] font-semibold block uppercase tracking-wider">BASCO Score</span>
                  <span className="text-base font-black text-[#1E429F] block mt-0.5">
                    {coverage.basco_score}%
                  </span>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#6B7280] font-semibold block uppercase tracking-wider">Creatives Evaluated</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    {coverage.creatives_evaluated.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-2.5 mb-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#111827] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#1E429F]" />
                    Retailer Health
                  </span>
                  <span className="text-[10px] text-[#6B7280] font-bold">
                    <span className="text-[#10B981]">Good performer ({coverageHealth.good_performer ?? coverageHealth.healthy})</span>
                    {' · '}
                    <span className="text-[#EF4444]">Bad performer ({coverageHealth.bad_performer ?? coverageHealth.critical})</span>
                  </span>
                </div>
                <div className="w-full bg-[#CBD5E1] h-2 rounded-full overflow-hidden flex gap-0.5">
                  <div
                    className="bg-[#10B981] h-full rounded-l-full transition-all duration-500"
                    style={{ width: `${coverageHealth.good_performer_pct ?? coverageHealth.healthy_pct}%` }}
                    title={`Good performer (Score > 90%): ${coverageHealth.good_performer ?? coverageHealth.healthy} retailers`}
                  />
                  <div
                    className="bg-[#EF4444] h-full rounded-r-full transition-all duration-500"
                    style={{ width: `${coverageHealth.bad_performer_pct ?? coverageHealth.critical_pct}%` }}
                    title={`Bad performer (Score <= 90%): ${coverageHealth.bad_performer ?? coverageHealth.critical} retailers`}
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2.5 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[10px] text-[#6B7280] font-medium">
                {fmtCompactUsd(coverage.fmv_loss)} FMV is concentrated across bad performer accounts
              </span>
              <Link
                to="/market-maturity"
                className="bg-[#F59E0B] hover:bg-[#D97706] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
              >
                <span>View Market Performance</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Module 2: Retailer Execution Gaps */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#1E429F]/10 text-[#1E429F] flex items-center justify-center shadow-2xs">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                      <path d="M4 22h16" />
                      <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
                      <path d="M6 4h12v5c0 3.31-2.69 6-6 6s-6-2.69-6-6V4Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">Retailer Execution Gaps</h3>
                    <p className="text-[11px] text-[#6B7280] font-medium">
                      What went wrong during POP evaluation, and where should we intervene first?
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#6B7280] font-semibold block uppercase tracking-wider">Creatives at Risk</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    {gaps.creatives_at_risk_pct}%
                  </span>
                </div>
                <div className="bg-[#1E429F]/10 border border-[#1E429F]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#1E429F] font-semibold block uppercase tracking-wider">Missing Brand Elements</span>
                  <span className="text-base font-black text-[#1E429F] block mt-0.5">
                    {gaps.missing_brand_elements.toLocaleString()}
                  </span>
                </div>
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#EF4444] font-semibold block uppercase tracking-wider">Promo Creatives without CTA</span>
                  <span className="text-base font-black text-[#EF4444] block mt-0.5">
                    {gaps.promo_without_cta.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-2.5 mb-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#111827] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#1E429F]" />
                    Largest Gap
                  </span>
                  <span className="text-[10px] text-[#6B7280] font-bold flex flex-wrap justify-end gap-x-1.5 gap-y-0.5 max-w-[70%] text-right">
                    <span className="text-[#10B981]">Size ({gaps.largest_gap.size_pct}%)</span>
                    <span>·</span>
                    <span className="text-[#F59E0B]">Placement ({gaps.largest_gap.placement_pct}%)</span>
                    <span>·</span>
                    <span className="text-[#EF4444]">Missing ({gaps.largest_gap.missing_pct}%)</span>
                    <span>·</span>
                    <span className="text-[#1E429F]">Usage ({gaps.largest_gap.usage_pct ?? 0}%)</span>
                    <span>·</span>
                    <span className="text-[#64748B]">Outdated ({gaps.largest_gap.outdated_pct ?? 0}%)</span>
                    <span>·</span>
                    <span className="text-[#0D9488]">Recommended ({gaps.largest_gap.recommended_pct ?? 0}%)</span>
                  </span>
                </div>
                <div className="w-full bg-[#CBD5E1] h-2 rounded-full overflow-hidden flex gap-0.5">
                  <div className="bg-[#10B981] h-full rounded-l-full transition-all duration-500" style={{ width: `${gaps.largest_gap.size_pct}%` }} title={`Size: ${gaps.largest_gap.size_pct}%`} />
                  <div className="bg-[#F59E0B] h-full transition-all duration-500" style={{ width: `${gaps.largest_gap.placement_pct}%` }} title={`Placement: ${gaps.largest_gap.placement_pct}%`} />
                  <div className="bg-[#EF4444] h-full transition-all duration-500" style={{ width: `${gaps.largest_gap.missing_pct}%` }} title={`Missing: ${gaps.largest_gap.missing_pct}%`} />
                  <div className="bg-[#1E429F] h-full transition-all duration-500" style={{ width: `${gaps.largest_gap.usage_pct ?? 0}%` }} title={`Usage: ${gaps.largest_gap.usage_pct ?? 0}%`} />
                  <div className="bg-[#64748B] h-full transition-all duration-500" style={{ width: `${gaps.largest_gap.outdated_pct ?? 0}%` }} title={`Outdated: ${gaps.largest_gap.outdated_pct ?? 0}%`} />
                  <div className="bg-[#0D9488] h-full rounded-r-full transition-all duration-500" style={{ width: `${gaps.largest_gap.recommended_pct ?? 0}%` }} title={`Recommended: ${gaps.largest_gap.recommended_pct ?? 0}%`} />
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2.5 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[10px] text-[#6B7280] font-medium">
                {gaps.largest_gap.insight}
              </span>
              <Link
                to="/league-table#retailer-creative-performance"
                className="bg-[#1E429F] hover:bg-[#162E6E] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
              >
                <span>Find Root Causes</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Module 3: Helpdesk Usage & Responsiveness */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0D9488]/15 text-[#0F766E] flex items-center justify-center shadow-2xs">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">Helpdesk Usage & Responsiveness</h3>
                    <p className="text-[11px] text-[#6B7280] font-medium">
                      Are retailers using Helpdesk before creatives are going live?
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#6B7280] font-semibold block uppercase tracking-wider">Queries Received</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    {helpdesk.queries_received.toLocaleString()}
                  </span>
                </div>
                <div className="bg-[#1E429F]/10 border border-[#1E429F]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#1E429F] font-semibold block uppercase tracking-wider">Final Approval Rate</span>
                  <span className="text-base font-black text-[#1E429F] block mt-0.5">
                    {helpdesk.final_approval_pct}%
                  </span>
                </div>
                <div className="bg-[#0D9488]/10 border border-[#0D9488]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#0F766E] font-semibold block uppercase tracking-wider">Intel-specific Campaign Creatives</span>
                  <span className="text-base font-black text-[#0F766E] block mt-0.5">
                    {helpdesk.intel_specific_creatives.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-2.5 mb-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#111827] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
                    Intel-specific campaigns ratio
                  </span>
                  <span className="text-[10px] text-[#6B7280] font-bold text-right">
                    <span className="text-[#10B981]">Intel Gamer Days ({helpdesk.campaign_mix.intel_gamer_days_pct ?? helpdesk.campaign_mix.igd_pct}%)</span>
                    {' · '}
                    <span className="text-[#F59E0B]">Intel Days ({helpdesk.campaign_mix.intel_days_pct}%)</span>
                    {' · '}
                    <span className="text-[#3B82F6]">Back to School ({helpdesk.campaign_mix.back_to_school_pct ?? 0}%)</span>
                    {' · '}
                    <span className="text-[#6B7280]">Other ({helpdesk.campaign_mix.other_pct}%)</span>
                  </span>
                </div>
                <div className="w-full bg-[#CBD5E1] h-2 rounded-full overflow-hidden flex gap-0.5">
                  <div className="bg-[#10B981] h-full rounded-l-full transition-all duration-500" style={{ width: `${helpdesk.campaign_mix.intel_gamer_days_pct ?? helpdesk.campaign_mix.igd_pct}%` }} title={`Intel Gamer Days: ${helpdesk.campaign_mix.intel_gamer_days ?? helpdesk.campaign_mix.igd}`} />
                  <div className="bg-[#F59E0B] h-full transition-all duration-500" style={{ width: `${helpdesk.campaign_mix.intel_days_pct}%` }} title={`Intel Days: ${helpdesk.campaign_mix.intel_days}`} />
                  <div className="bg-[#3B82F6] h-full transition-all duration-500" style={{ width: `${helpdesk.campaign_mix.back_to_school_pct ?? 0}%` }} title={`Back to School: ${helpdesk.campaign_mix.back_to_school ?? 0}`} />
                  <div className="bg-[#64748B] h-full rounded-r-full transition-all duration-500" style={{ width: `${helpdesk.campaign_mix.other_pct}%` }} title={`Other: ${helpdesk.campaign_mix.other}`} />
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2.5 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[10px] text-[#6B7280] font-medium">
                {helpdesk.insight}
              </span>
              <Link
                to="/product-mix"
                className="bg-[#0D9488] hover:bg-[#0F766E] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
              >
                <span>Explore Helpdesk</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Module 4: Creative Effectiveness */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center shadow-2xs">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 11 18-5v12L3 14v-3z" />
                      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">Creative Effectiveness</h3>
                    <p className="text-[11px] text-[#6B7280] font-medium">
                      Are creatives submitted on Helpdesk actually aligned with the right objective?
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#6B7280] font-semibold block uppercase tracking-wider">Creatives with Low Intel Voice</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    {creative.low_intel_voice_pct}%
                  </span>
                </div>
                <div className="bg-[#1E429F]/10 border border-[#1E429F]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#1E429F] font-semibold block uppercase tracking-wider">Objective Aligned with CTA</span>
                  <span className="text-base font-black text-[#1E429F] block mt-0.5">
                    {creative.objective_aligned_pct}%
                  </span>
                </div>
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#EF4444] font-semibold block uppercase tracking-wider">Missing CTA</span>
                  <span className="text-base font-black text-[#EF4444] block mt-0.5">
                    {creative.missing_cta}/{creative.missing_cta_total || 0}
                  </span>
                </div>
              </div>

              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-2.5 mb-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#111827] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#6366F1]" />
                    Misaligned Creatives Proportion
                  </span>
                  <span className="text-[10px] text-[#6B7280] font-bold">
                    <span className="text-[#10B981]">Gaming ({creative.product_mix.gaming_pct}%)</span> · <span className="text-[#F59E0B]">Core Ultra ({creative.product_mix.core_ultra_pct}%)</span> · <span className="text-[#6366F1]">Core Processor ({creative.product_mix.core_processor_pct}%)</span>
                  </span>
                </div>
                <div className="w-full bg-[#CBD5E1] h-2 rounded-full overflow-hidden flex gap-0.5">
                  <div className="bg-[#10B981] h-full rounded-l-full transition-all duration-500" style={{ width: `${creative.product_mix.gaming_pct}%` }} title={`Gaming: ${creative.product_mix.gaming}`} />
                  <div className="bg-[#F59E0B] h-full transition-all duration-500" style={{ width: `${creative.product_mix.core_ultra_pct}%` }} title={`Core Ultra: ${creative.product_mix.core_ultra}`} />
                  <div className="bg-[#6366F1] h-full rounded-r-full transition-all duration-500" style={{ width: `${creative.product_mix.core_processor_pct}%` }} title={`Core Processor: ${creative.product_mix.core_processor}`} />
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2.5 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[10px] text-[#6B7280] font-medium">
                {creative.insight}
              </span>
              <Link
                to="/cta-campaign"
                className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
              >
                <span>Measure Creative Impact</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Module 5: Promotion-led Creatives */}
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
                    <h3 className="text-sm font-bold text-[#111827]">Promotion-led Creatives</h3>
                    <p className="text-[11px] text-[#6B7280] font-medium">
                      Are promotions/offers proportionately present in Helpdesk-submitted creatives?
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#6B7280] font-semibold block uppercase tracking-wider">Promo Creatives without CTA</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    {promo.promo_without_cta_pct}%
                  </span>
                </div>
                <div className="bg-[#1E429F]/10 border border-[#1E429F]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#1E429F] font-semibold block uppercase tracking-wider">Price/Discount-led Creatives</span>
                  <span className="text-base font-black text-[#1E429F] block mt-0.5">
                    {promo.price_discount}/{promo.price_discount_total || 0}
                  </span>
                </div>
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#EF4444] font-semibold block uppercase tracking-wider">Creatives without Offers</span>
                  <span className="text-base font-black text-[#EF4444] block mt-0.5">
                    {promo.without_offer}/{promo.without_offer_total || 0}
                  </span>
                </div>
              </div>

              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-2.5 mb-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#111827] mb-1.5 gap-2">
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                    Promotional Readiness
                  </span>
                  <span className="text-[10px] text-[#6B7280] font-bold text-right">
                    <span className="text-[#10B981]">Buy/Shop ({promo.cta_mix.buy_shop_pct}%)</span>
                    {' · '}
                    <span className="text-[#F59E0B]">Urgency ({promo.cta_mix.urgency_pct}%)</span>
                    {' · '}
                    <span className="text-[#6366F1]">Learn ({promo.cta_mix.learn_pct}%)</span>
                    {' · '}
                    <span className="text-[#64748B]">Others ({promo.cta_mix.other_pct ?? 0}%)</span>
                  </span>
                </div>
                <div className="w-full bg-[#CBD5E1] h-2 rounded-full overflow-hidden flex gap-0.5">
                  <div className="bg-[#10B981] h-full rounded-l-full transition-all duration-500" style={{ width: `${promo.cta_mix.buy_shop_pct}%` }} title={`Buy/Shop: ${promo.cta_mix.buy_shop}`} />
                  <div className="bg-[#F59E0B] h-full transition-all duration-500" style={{ width: `${promo.cta_mix.urgency_pct}%` }} title={`Urgency: ${promo.cta_mix.urgency}`} />
                  <div className="bg-[#6366F1] h-full transition-all duration-500" style={{ width: `${promo.cta_mix.learn_pct}%` }} title={`Learn: ${promo.cta_mix.learn}`} />
                  <div className="bg-[#64748B] h-full rounded-r-full transition-all duration-500" style={{ width: `${promo.cta_mix.other_pct ?? 0}%` }} title={`Others: ${promo.cta_mix.other ?? 0}`} />
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2.5 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[10px] text-[#6B7280] font-medium">
                {promo.insight}
              </span>
              <Link
                to="/offer-cta"
                className="bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
              >
                <span>Review Promotion Gaps</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Module 6: Intel Visual Adoption */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#1E429F]/10 text-[#1E429F] flex items-center justify-center shadow-2xs">
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
                    <h3 className="text-sm font-bold text-[#111827]">Intel Visual Adoption</h3>
                    <p className="text-[11px] text-[#6B7280] font-medium">
                      Are Intel visual assets actually being used across retail execution?
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#6B7280] font-semibold block uppercase tracking-wider">Intel Visual Adoption</span>
                  <span className="text-base font-black text-[#111827] block mt-0.5">
                    {intelVisual.adoption_pct}%
                  </span>
                </div>
                <div className="bg-[#1E429F]/10 border border-[#1E429F]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#1E429F] font-semibold block uppercase tracking-wider">Co-Branded Assets</span>
                  <span className="text-base font-black text-[#1E429F] block mt-0.5">
                    {intelVisual.cobranded_pct}%
                  </span>
                </div>
                <div className="bg-[#0D9488]/10 border border-[#0D9488]/20 rounded-lg py-2 px-2.5 text-center">
                  <span className="text-[10px] text-[#0D9488] font-semibold block uppercase tracking-wider">Retail-custom Assets</span>
                  <span className="text-base font-black text-[#0D9488] block mt-0.5">
                    {intelVisual.retail_custom}/{intelVisual.retail_custom_total || 0}
                  </span>
                </div>
              </div>

              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-2.5 mb-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#111827] mb-1.5 gap-2">
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-[#1E429F]" />
                    Intel Visual Usage
                  </span>
                  <span className="text-[10px] text-[#6B7280] font-bold text-right">
                    <span className="text-[#F59E0B]">Partially Used ({intelVisual.pms_mix.partial_pct}%)</span> · <span className="text-[#1E429F]">Completely Used ({intelVisual.pms_mix.complete_pct}%)</span>
                  </span>
                </div>
                <div className="w-full bg-[#CBD5E1] h-2 rounded-full overflow-hidden flex gap-0.5">
                  <div className="bg-[#F59E0B] h-full rounded-l-full transition-all duration-500" style={{ width: `${intelVisual.pms_mix.partial_pct}%` }} title={`Partially Used: ${intelVisual.pms_mix.partial}`} />
                  <div className="bg-[#1E429F] h-full rounded-r-full transition-all duration-500" style={{ width: `${intelVisual.pms_mix.complete_pct}%` }} title={`Completely Used: ${intelVisual.pms_mix.complete}`} />
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2.5 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[10px] text-[#6B7280] font-medium">
                {intelVisual.insight}
              </span>
              <Link
                to="/visual-adoption"
                className="bg-[#1E429F] hover:bg-[#162E6E] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
              >
                <span>Explore Asset Adoption</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
