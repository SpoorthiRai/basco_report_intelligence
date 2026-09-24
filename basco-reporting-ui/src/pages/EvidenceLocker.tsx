// src/pages/EvidenceLocker.tsx
// Creative Evidence Locker — POP Evaluation Compliant vs. Non-Compliant Gallery
// Persistent filter options, default 'All' quarter, lazy loading with grey placeholder.

import { useState, useEffect, useMemo, useCallback } from 'react';

import api from '../api/client';
import ClearFiltersButton from '../components/common/ClearFiltersButton';
import { filtersAreActive, pickValidOption } from '../utils/cascadingFilters';

interface CreativeItem {
  Analysis_ID: number | string
  Asset_URL: string
  Hist_Image_URL?: string
  Hosted_Image_URL?: string
  MD_Tag?: string
  compliance_status?: 'Compliant' | 'Non-Compliant'
  Country?: string
  Region?: string
  Retailer?: string
  Parent_Account?: string
  Child_Account?: string
  Campaign_Type?: string
  Campaign_Name?: string
  Layout?: string
  Content?: string
  Product?: string
  Subject?: string
  sender_email?: string
  Intel_Visual_Flag?: string
  Visual_Content_Name?: string
  Intel_Visual_Usage?: string
  AI_Messaging?: string
  Inside_Messaging?: string
  CTA_Flag?: string
  CTA?: string
  Objective?: string
  Offer_Flag?: string
  Offer_Type?: string
  Offer_Text?: string
  OEM_Flag?: string
  OEM_Values?: string
  quarter_label?: string
  product_families?: string[]
  Presence_Logo?: string
  Logo?: number | string
  Presence_Badge?: string
  Badge?: number | string
  Presence_Text?: string
  Text_Mention?: number | string
  Presence_Visual?: string
  Key_Visuals?: number | string
  BRAND_SCORE?: number | string | null
  brand_score?: number | null
  FeedbackType?: string
  Reason?: string
}

interface EvidenceLockerResponse {
  quarter: string;
  summary: {
    total: number;
    compliant?: number;
    non_compliant?: number;
  };
  filter_options: {
    quarters: string[];
    products: string[];
    generations?: string[];
    regions?: string[];
    countries: string[];
  };
  creatives: CreativeItem[];
}

// ── Normalize asset URLs for browser compatibility ────────────────────────────
function creativeImageUrl(item: CreativeItem, mode: 'compliance' | 'execution' = 'compliance'): string {
  if (mode === 'compliance') {
    return normalizeAssetUrl(item.Hist_Image_URL);
  }
  return normalizeAssetUrl(item.Asset_URL || item.Hosted_Image_URL);
}

function normalizeAssetUrl(url?: string | null): string {
  if (!url) return '';
  let clean = url.trim();
  if (clean.startsWith('gs://')) {
    clean = clean.replace('gs://', 'https://storage.googleapis.com/');
  } else if (clean.startsWith('https://storage.cloud.google.com/')) {
    clean = clean.replace('https://storage.cloud.google.com/', 'https://storage.googleapis.com/');
  }
  return clean;
}

type TriState = 'yes' | 'no' | 'na'
type StatusBucket = 'compliant' | 'non_compliant' | 'at_risk'

const EMPTY_TEXT = new Set(['', 'null', 'none', 'unknown', 'n/a', 'na'])

function isNullValue(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === 'string') return EMPTY_TEXT.has(value.trim().toLowerCase())
  return false
}

function displayValue(value?: string | null): string {
  if (isNullValue(value)) return 'NA'
  return String(value).trim()
}

function displayFeedbackType(value?: string | null): string {
  if (isNullValue(value)) return ''
  return String(value)
    .split('|')
    .map((part) => {
      const words = part.trim().replace(/_/g, ' ').split(/\s+/).filter(Boolean)
      return words
        .map((word) => {
          if (word.includes('/')) {
            return word
              .split('/')
              .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p))
              .join('/')
          }
          const lower = word.toLowerCase()
          if (['of', 'and', 'or', 'to', 'a', 'an'].includes(lower)) return lower
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        })
        .join(' ')
        .replace(/^./, (c) => c.toUpperCase())
    })
    .filter(Boolean)
    .join(' | ')
}

function isMandatePass(value?: string | null): boolean {
  if (isNullValue(value)) return false
  const v = String(value).trim().toLowerCase()
  return v === 'yes' || v === '1' || v === 'true' || !['no', '0', 'false'].includes(v)
}

function ynStatus(value?: string | null): TriState {
  if (isNullValue(value)) return 'na'
  return isMandatePass(value) ? 'yes' : 'no'
}

function triLabel(status: TriState): string {
  if (status === 'yes') return 'Yes'
  if (status === 'no') return 'No'
  return 'NA'
}

function presenceStatus(presence?: string | null, numeric?: number | string | null): TriState {
  const presenceMissing = isNullValue(presence)
  const numericMissing = isNullValue(numeric)
  if (presenceMissing && numericMissing) return 'na'
  if (!presenceMissing && isMandatePass(presence)) return 'yes'
  const n = Number(numeric)
  if (Number.isFinite(n) && n > 0) return 'yes'
  return presenceMissing && numericMissing ? 'na' : 'no'
}

const PRESENCE_FIELDS = [
  { label: 'Logo', presence: 'Presence_Logo', numeric: 'Logo' },
  { label: 'Badge', presence: 'Presence_Badge', numeric: 'Badge' },
  { label: 'Text', presence: 'Presence_Text', numeric: 'Text_Mention' },
  { label: 'Visual', presence: 'Presence_Visual', numeric: 'Key_Visuals' },
] as const

function complianceFlags(item: CreativeItem): Array<{ label: string; status: TriState }> {
  return PRESENCE_FIELDS.map(({ label, presence, numeric }) => ({
    label,
    status: presenceStatus(item[presence], item[numeric]),
  }))
}

function complianceScore(item: CreativeItem): number | null {
  if (item.brand_score != null && Number.isFinite(Number(item.brand_score))) {
    return Number(item.brand_score)
  }
  if (item.BRAND_SCORE == null || item.BRAND_SCORE === '') return null
  const n = Number(item.BRAND_SCORE)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 1000) / 10
}

function statusBucket(item: CreativeItem): StatusBucket | null {
  const score = complianceScore(item)
  if (score == null) return null
  if (score >= 90) return 'compliant'
  if (score >= 80) return 'non_compliant'
  return 'at_risk'
}

function scoreColorClass(score: number): string {
  if (score >= 90) return 'text-[#10B981]'
  if (score >= 80) return 'text-[#F59E0B]'
  return 'text-[#EF4444]'
}

function extractProductFamilies(content?: string | null): string[] {
  if (isNullValue(content)) return ['Other / General']
  const s = String(content).toLowerCase()
  const fams: string[] = []
  const hasGaming = s.includes('gaming') || s.includes('gamer')
  const hasCoreUltra = s.includes('core ultra')
  if (hasGaming && hasCoreUltra) fams.push('Gaming Core Ultra')
  else if (hasGaming) fams.push('Gaming')
  else if (hasCoreUltra) fams.push('Intel Core Ultra')
  if (s.includes('core processor') || s.includes('intel processor') || s.includes('processors')) {
    fams.push('Intel Core Processors')
  }
  if (s.includes('evo edition')) fams.push('Intel Evo Edition')
  else if (s.includes('evo')) fams.push('Intel Evo')
  if (s.includes('arc') || s.includes('iris') || s.includes('graphic')) fams.push('Intel Graphics')
  return fams.length ? fams : ['Other / General']
}

function hasOfferType(item: CreativeItem): boolean {
  const t = String(item.Offer_Type || '').trim().toLowerCase()
  return Boolean(t) && !['no offer', 'none', 'no', 'n/a', 'na', 'unknown'].includes(t)
}

function highlightMissingCta(item: CreativeItem): boolean {
  return hasOfferType(item) && ynStatus(item.CTA_Flag) === 'no'
}

function modalFields(item: CreativeItem, mode: 'compliance' | 'execution'): Array<{ dt: string; dd: string }> {
  if (mode === 'compliance') {
    return [
      { dt: 'Retailer', dd: displayValue(item.Child_Account || item.Retailer) },
      { dt: 'Country', dd: displayValue(item.Country) },
      { dt: 'Region', dd: displayValue(item.Region) },
      { dt: 'Quarter', dd: displayValue(item.quarter_label) },
    ]
  }
  const cta = ynStatus(item.CTA_Flag)
  return [
    { dt: 'Region', dd: displayValue(item.Region) },
    { dt: 'Country', dd: displayValue(item.Country) },
    { dt: 'Retailer', dd: displayValue(item.Child_Account || item.Retailer) },
    { dt: 'Campaign Type', dd: displayValue(item.Campaign_Type) },
    { dt: 'Layout', dd: displayValue(item.Layout) },
    { dt: 'Content', dd: displayValue(item.Content) },
    { dt: 'Offer Type', dd: displayValue(item.Offer_Type) },
    { dt: 'CTA', dd: triLabel(cta) },
    { dt: 'CTA Text', dd: cta === 'yes' ? displayValue(item.CTA) : 'NA' },
    { dt: 'Objective', dd: displayValue(item.Objective) },
  ]
}

function FlagMark({ status }: { status: TriState }) {
  const color = status === 'yes' ? 'text-[#10B981]' : status === 'no' ? 'text-[#EF4444]' : 'text-[#6B7280]'
  return <span className={`font-bold ${color}`}>{triLabel(status)}</span>
}

// ── Dynamic Creative Visual Banner Mockup ──────────────────────────────────────
function CreativeBannerVisual({ item, isCompliant }: { item: CreativeItem; isCompliant: boolean }) {
  const content = item.Content || 'Intel Core Ultra';
  const campaign = item.Campaign_Type || item.Campaign_Name || 'Next-Gen PC';
  const oem = item.OEM_Values || (item.OEM_Flag === 'Yes' ? 'OEM Partner' : '');

  const bgGradient = isCompliant
    ? 'linear-gradient(135deg, #0B1325 0%, #1E429F 50%, #0D9488 100%)'
    : 'linear-gradient(135deg, #181126 0%, #6366F1 50%, #0B1938 100%)';

  return (
    <div
      style={{ background: bgGradient }}
      className="w-full h-full p-4 flex flex-col justify-between relative overflow-hidden select-none"
    >
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#0D9488]/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-[#1E429F]/20 rounded-full blur-2xl pointer-events-none" />

      {/* Top Banner Row: OEM & Intel Core Badge */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black tracking-widest uppercase text-white/90 bg-white/10 px-2 py-0.5 rounded border border-white/15 backdrop-blur-xs">
            {oem || 'INTEL CERTIFIED'}
          </span>
        </div>
      </div>

      {/* Center Showcase Visual */}
      <div className="z-10 my-auto py-2 flex flex-col items-start">
        <div className="inline-flex items-center gap-1 bg-[#0D9488]/20 border border-[#0D9488]/30 px-2 py-0.5 rounded-full text-[9px] font-bold text-[#0D9488] uppercase tracking-wider mb-1">
          <span>⚡</span>
          <span>{campaign}</span>
        </div>
        <h4 className="text-sm font-extrabold text-white tracking-tight leading-tight line-clamp-1">
          {content}
        </h4>
        <p className="text-[10px] text-slate-300 font-medium line-clamp-1 mt-0.5">
          {item.Child_Account || item.Retailer || 'Built for Next-Gen Performance & AI'}
        </p>
      </div>

      {/* Bottom Row: Intel Logo & Feature Chips */}
      <div className="flex items-end justify-between z-10 pt-2 border-t border-white/10">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-white flex items-center justify-center p-0.5 shadow-xs">
            <span className="text-[#1E429F] font-black text-[9px] tracking-tighter">intel</span>
          </div>
          <span className="text-[10px] font-bold text-white tracking-wide">
            Core™ Ultra
          </span>
        </div>
        <span className="text-[9px] font-semibold text-slate-400 bg-black/30 px-1.5 py-0.5 rounded">
          {item.Layout || 'Digital POP'}
        </span>
      </div>
    </div>
  );
}

// ── Built-in Fallback Creatives Dataset ─────────────────────────────────────────
const FALLBACK_CREATIVES: CreativeItem[] = [
  {
    Analysis_ID: 101,
    Asset_URL: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=600&q=80',
    compliance_status: 'Compliant',
    sender_email: 'retail_aus@harveynorman.com.au',
    Country: 'Australia',
    Region: 'APJ',
    Parent_Account: 'Harvey Norman',
    Subject: 'Intel Core Ultra Gaming Laptop Promo',
    Campaign_Type: 'Consumer Campaign',
    Campaign_Name: 'Q1 AI PC Launch',
    Layout: 'Hero Banner',
    Content: 'Intel Core Ultra, Gaming',
    OEM_Flag: 'Yes',
    OEM_Values: 'ASUS ROG',
    Intel_Visual_Flag: 'Yes',
    Visual_Content_Name: 'Intel Core Badge',
    AI_Messaging: 'Yes',
    Inside_Messaging: 'Yes',
    Offer_Flag: 'Yes',
    CTA_Flag: 'Yes',
    Objective: 'Shop the newest Intel-powered ASUS gaming lineup with AI acceleration.',
    quarter_label: 'Q1 2025',
  },
  {
    Analysis_ID: 102,
    Asset_URL: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80',
    compliance_status: 'Compliant',
    sender_email: 'marketing@croma.com',
    Country: 'India',
    Region: 'APJ',
    Parent_Account: 'Croma',
    Subject: 'Supercharge Your Workday with Intel vPro',
    Campaign_Type: 'Commercial Campaign',
    Campaign_Name: 'Business Productivity',
    Layout: 'Category Page',
    Content: 'Intel vPro, Commercial',
    OEM_Flag: 'Yes',
    OEM_Values: 'Lenovo ThinkPad',
    Intel_Visual_Flag: 'Yes',
    Visual_Content_Name: 'vPro Security Badge',
    AI_Messaging: 'Yes',
    Inside_Messaging: 'Yes',
    Offer_Flag: 'No',
    CTA_Flag: 'Yes',
    Objective: 'Upgrade corporate fleet with hardware-level security and remote management.',
    quarter_label: 'Q1 2025',
  },
  {
    Analysis_ID: 103,
    Asset_URL: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80',
    compliance_status: 'Compliant',
    sender_email: 'promo@currys.co.uk',
    Country: 'UK',
    Region: 'EMEA',
    Parent_Account: 'Currys Group',
    Subject: 'Next-Gen Thin & Light Intel Evo Notebooks',
    Campaign_Type: 'Consumer Campaign',
    Campaign_Name: 'Back to School',
    Layout: 'Digital POP',
    Content: 'Intel Evo, Thin & Light',
    OEM_Flag: 'Yes',
    OEM_Values: 'Dell XPS',
    Intel_Visual_Flag: 'Yes',
    Visual_Content_Name: 'Intel Evo Badge',
    AI_Messaging: 'Yes',
    Inside_Messaging: 'Yes',
    Offer_Flag: 'Yes',
    CTA_Flag: 'Yes',
    Objective: 'All-day battery life and instant wake powered by Intel Evo platform.',
    quarter_label: 'Q1 2025',
  },
  {
    Analysis_ID: 104,
    Asset_URL: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=600&q=80',
    compliance_status: 'Non-Compliant',
    sender_email: 'offers@magazineluiza.com.br',
    Country: 'Brazil',
    Region: 'LATAM',
    Parent_Account: 'Magazine Luiza',
    Subject: 'Notebook Sale Promo - Missing Intel Badge',
    Campaign_Type: 'Retail Promo',
    Campaign_Name: 'Weekend Deals',
    Layout: 'Carousel Ad',
    Content: 'Intel Core, Consumer Laptops',
    OEM_Flag: 'No',
    OEM_Values: 'None',
    Intel_Visual_Flag: 'No',
    Visual_Content_Name: 'None',
    AI_Messaging: 'No',
    Inside_Messaging: 'No',
    Offer_Flag: 'Yes',
    CTA_Flag: 'Yes',
    Objective: 'Discounts on laptops without required Intel Core badge and brand disclaimer.',
    quarter_label: 'Q1 2025',
  },
  {
    Analysis_ID: 105,
    Asset_URL: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=600&q=80',
    compliance_status: 'Non-Compliant',
    sender_email: 'campaigns@fnac.fr',
    Country: 'France',
    Region: 'EMEA',
    Parent_Account: 'FNAC',
    Subject: 'French Tech Expo Banner - Distorted Logo',
    Campaign_Type: 'Digital POP',
    Campaign_Name: 'Autumn Electronics',
    Layout: 'Hero Banner',
    Content: 'Gaming, Desktop',
    OEM_Flag: 'Yes',
    OEM_Values: 'HP OMEN',
    Intel_Visual_Flag: 'No',
    Visual_Content_Name: 'Distorted Visual',
    AI_Messaging: 'No',
    Inside_Messaging: 'Yes',
    Offer_Flag: 'No',
    CTA_Flag: 'No',
    Objective: 'Intel logo aspect ratio distorted; missing mandatory CTA and AI messaging.',
    quarter_label: 'Q3 2024',
  },
  {
    Analysis_ID: 106,
    Asset_URL: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
    compliance_status: 'Non-Compliant',
    sender_email: 'ads@alkosto.com.co',
    Country: 'Colombia',
    Region: 'LATAM',
    Parent_Account: 'Alkosto',
    Subject: 'Alkosto Tech Days - Missing Brand Lockup',
    Campaign_Type: 'Promotional Banner',
    Campaign_Name: 'Cyber Days',
    Layout: 'Sidebar Ad',
    Content: 'All-in-One PC, Intel Core',
    OEM_Flag: 'No',
    OEM_Values: 'None',
    Intel_Visual_Flag: 'No',
    Visual_Content_Name: 'None',
    AI_Messaging: 'No',
    Inside_Messaging: 'No',
    Offer_Flag: 'Yes',
    CTA_Flag: 'No',
    Objective: 'Missing Intel Inside logo lockup and required product tier specification.',
    quarter_label: 'Q3 2024',
  },
];

const DEFAULT_PRODUCTS = [
  'All Products',
  'Gaming',
  'Gaming Core Ultra',
  'Intel Core Ultra',
  'Intel Core Processors',
  'Intel Evo',
  'Intel Evo Edition',
  'Intel Graphics',
  'Other / General',
];

const DEFAULT_QUARTERS = [
  'All Quarters',
];

const DEFAULT_REGIONS = ['All Regions'];
const DEFAULT_COUNTRIES = ['All Countries'];

// ── Creative Detail Modal ──────────────────────────────────────────────────────
function CreativeModal({
  item,
  onClose,
  mode = 'compliance',
}: {
  item: CreativeItem;
  onClose: () => void;
  mode?: 'compliance' | 'execution';
}) {
  const bucket = mode === 'compliance' ? statusBucket(item) : null;
  const isCompliant = bucket === 'compliant';
  const normUrl = creativeImageUrl(item, mode);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const flags = complianceFlags(item)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Dark backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-[#0B1325] to-[#1C3668] rounded-t-2xl">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              {item.Child_Account || item.Retailer || item.Campaign_Name || 'Creative Detail'}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {[item.Country, item.Region, item.quarter_label].filter(Boolean).join(' • ') || '—'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white text-sm font-bold transition-colors cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal body */}
        <div className="flex flex-col md:flex-row md:items-stretch">

          {/* Left: full creative image */}
          <div className="md:w-[48%] bg-[#F8FAFC] flex items-center justify-center p-5 relative min-h-[240px] border-b md:border-b-0 md:border-r border-[#E5E7EB]">
            {!imgError && normUrl ? (
              <>
                {!imgLoaded && (
                  <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
                    <span className="text-xs text-[#6B7280] font-semibold">Loading Asset...</span>
                  </div>
                )}
                <img
                  src={normUrl}
                  alt={item.Child_Account || item.Retailer || 'Creative Asset'}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgError(true)}
                  className={`w-full max-h-[360px] object-contain transition-opacity duration-300 ${
                    imgLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </>
            ) : (
              <CreativeBannerVisual item={item} isCompliant={isCompliant} />
            )}
            {mode === 'compliance' && bucket && (
            <span
              className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide shadow-md ${
                bucket === 'compliant'
                  ? 'bg-[#10B981] text-white'
                  : bucket === 'non_compliant'
                    ? 'bg-[#F59E0B] text-white'
                    : 'bg-[#EF4444] text-white'
              }`}
            >
              {bucket === 'compliant' ? '✅ Compliant' : bucket === 'non_compliant' ? '🔶 Non-Compliant' : '🔴 At Risk'}
            </span>
            )}
          </div>

          {/* Right: metadata */}
          <div className="md:w-[52%] p-6 flex flex-col gap-4">

            {mode === 'compliance' && (
            <div className="grid grid-cols-4 gap-2 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-3 text-center text-[11px] font-bold">
              {flags.map(({ label, status }) => (
                <div key={label}>
                  <span className="text-[#6B7280] block text-[10px] font-semibold mb-0.5">{label}</span>
                  <span className="text-base"><FlagMark status={status} /></span>
                </div>
              ))}
            </div>
            )}

            <dl className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-xl overflow-hidden">
              {modalFields(item, mode).map(({ dt, dd }) => (
                  <div key={dt} className="grid grid-cols-[118px_1fr] gap-3 px-3.5 py-2.5 items-start bg-white">
                    <dt className="text-[#6B7280] font-bold text-[10px] uppercase tracking-wide pt-0.5">{dt}</dt>
                    <dd className="text-[#111827] font-semibold text-xs leading-relaxed break-words" title={dd}>
                      {dd}
                    </dd>
                  </div>
              ))}
            </dl>

            {mode === 'compliance' && (
              <div>
                <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wide mb-1">Reason</p>
                <p className="text-xs text-[#111827] leading-relaxed whitespace-pre-wrap">{displayValue(item.Reason)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Evidence Locker Component ─────────────────────────────────────────────
export default function EvidenceLocker() {
  const [data, setData] = useState<EvidenceLockerResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'compliance' | 'execution'>('compliance');
  // Default to 2026 All Quarters
  const [quarterFilter, setQuarterFilter] = useState<string>('All Quarters');
  const [productFilter, setProductFilter] = useState<string>('All Products');
  const [regionFilter, setRegionFilter] = useState<string>('All Regions');
  const [countryFilter, setCountryFilter] = useState<string>('All Countries');
  const [statusFilter, setStatusFilter] = useState<StatusBucket | null>(null);

  // Persistent option lists that NEVER shrink when filters change
  const [availableProducts, setAvailableProducts] = useState<string[]>(DEFAULT_PRODUCTS);
  const [availableQuarters, setAvailableQuarters] = useState<string[]>(DEFAULT_QUARTERS);
  const [availableRegions, setAvailableRegions] = useState<string[]>(DEFAULT_REGIONS);
  const [availableCountries, setAvailableCountries] = useState<string[]>(DEFAULT_COUNTRIES);

  // Track image load and error states
  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Modal: which creative is expanded
  const [selectedCreative, setSelectedCreative] = useState<CreativeItem | null>(null);
  const handleCloseModal = useCallback(() => setSelectedCreative(null), []);

  useEffect(() => {
    let isMounted = true;

    setData(null);
    setLoading(true);
    setError(null);
    setImageLoaded({});
    setImageErrors({});

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
    if (productFilter && productFilter !== 'All' && productFilter !== 'All Products') {
      params.append('product', productFilter);
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';

    api
      .get<EvidenceLockerResponse>(`/api/reports/evidence-locker/${queryString}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.data) {
          setData(res.data);

          if (Array.isArray(res.data.filter_options?.products) && res.data.filter_options.products.length > 0) {
            setAvailableProducts(res.data.filter_options.products);
          }

          if (Array.isArray(res.data.filter_options?.quarters) && res.data.filter_options.quarters.length > 0) {
            setAvailableQuarters(res.data.filter_options.quarters);
          }

          if (Array.isArray(res.data.filter_options?.regions) && res.data.filter_options.regions.length > 0) {
            setAvailableRegions(res.data.filter_options.regions);
          }

          if (Array.isArray(res.data.filter_options?.countries) && res.data.filter_options.countries.length > 0) {
            setAvailableCountries(res.data.filter_options.countries);
          }
        }
      })
      .catch((_err) => {
        if (!isMounted) return;
        let fallback = FALLBACK_CREATIVES;
        if (quarterFilter !== 'All' && quarterFilter !== 'All Quarters') {
          fallback = fallback.filter((c) => c.quarter_label === quarterFilter);
        }

        setData({
          quarter: quarterFilter !== 'All' && quarterFilter !== 'All Quarters' ? quarterFilter : 'All Quarters',
          summary: {
            total: fallback.length,
          },
          filter_options: {
            quarters: DEFAULT_QUARTERS,
            products: DEFAULT_PRODUCTS,
            regions: DEFAULT_REGIONS,
            countries: ['All Countries', 'Australia', 'Brazil', 'Colombia', 'France', 'India', 'UK'],
          },
          creatives: fallback,
        });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [quarterFilter, regionFilter, countryFilter, productFilter]);

  useEffect(() => {
    setQuarterFilter((prev) => pickValidOption(prev, availableQuarters, 'All Quarters'));
    setRegionFilter((prev) => pickValidOption(prev, availableRegions, 'All Regions'));
    setCountryFilter((prev) => pickValidOption(prev, availableCountries, 'All Countries'));
    setProductFilter((prev) => pickValidOption(prev, availableProducts, 'All Products'));
  }, [availableQuarters, availableRegions, availableCountries, availableProducts]);

  const clearFilters = () => {
    setQuarterFilter('All Quarters');
    setRegionFilter('All Regions');
    setCountryFilter('All Countries');
    setProductFilter('All Products');
    setStatusFilter(null);
  };

  const filtersActive = filtersAreActive(
    [quarterFilter, regionFilter, countryFilter, productFilter],
    ['All Quarters', 'All Regions', 'All Countries', 'All Products', 'All']
  ) || Boolean(statusFilter);

  // Product family match
  const matchesProduct = useCallback(
    (item: CreativeItem): boolean => {
      if (!productFilter || productFilter === 'All' || productFilter === 'All Products') return true
      const families = item.product_families?.length ? item.product_families : extractProductFamilies(item.Content)
      return families.includes(productFilter)
    },
    [productFilter]
  );

  const matchesRegion = useCallback(
    (item: CreativeItem): boolean => {
      if (!regionFilter || regionFilter === 'All' || regionFilter === 'All Regions') return true;
      return String(item.Region || '').trim().toUpperCase() === regionFilter.trim().toUpperCase();
    },
    [regionFilter]
  );

  const matchesCountry = useCallback(
    (item: CreativeItem): boolean => {
      if (!countryFilter || countryFilter === 'All' || countryFilter === 'All Countries') return true;
      return String(item.Country || '').trim() === countryFilter;
    },
    [countryFilter]
  );

  const countryOptions = availableCountries;
  const filteredCreatives = useMemo(() => {
    if (!data?.creatives) return [];
    return data.creatives.filter((c) => {
      if (!matchesProduct(c) || !matchesRegion(c) || !matchesCountry(c)) return false;
      if (activeTab === 'execution' || !statusFilter) return true;
      return statusBucket(c) === statusFilter;
    });
  }, [data, matchesProduct, matchesRegion, matchesCountry, statusFilter, activeTab]);

  const toggleStatusFilter = (bucket: StatusBucket) => {
    setStatusFilter((prev) => (prev === bucket ? null : bucket));
  };

  const handleImageLoad = (id: string | number) => {
    setImageLoaded((prev) => ({ ...prev, [String(id)]: true }));
  };

  const handleImageError = (id: string | number) => {
    setImageErrors((prev) => ({ ...prev, [String(id)]: true }));
  };

  return (
    <section
      id="retailer-creative-performance"
      className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col scroll-mt-20"
    >
      {/* ── Dark Header Bar ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#0B1325] via-[#122449] to-[#1C3668] px-6 py-5 text-white flex flex-row items-center justify-between gap-4">
        <div className="min-w-0 shrink">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]"></span>
            <h2 className="text-base md:text-lg font-bold tracking-tight text-white">
              Retailer Creative Performance
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Review the creative execution behind retailer performance and identify where brand requirements need attention.
          </p>
        </div>

        <div className="flex items-center gap-2 xl:gap-3 flex-nowrap shrink-0 ml-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <label htmlFor="quarter-filter" className="text-xs font-semibold text-slate-300 whitespace-nowrap">
              Quarter:
            </label>
            <select
              id="quarter-filter"
              value={quarterFilter}
              onChange={(e) => {
                setQuarterFilter(e.target.value);
                setRegionFilter('All Regions');
                setCountryFilter('All Countries');
              }}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0D9488] cursor-pointer backdrop-blur-xs transition-colors"
            >
              {availableQuarters.map((q) => (
                <option key={q} value={q} className="bg-slate-900 text-white">
                  {q}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <label htmlFor="region-filter" className="text-xs font-semibold text-slate-300 whitespace-nowrap">
              Region:
            </label>
            <select
              id="region-filter"
              value={availableRegions.includes(regionFilter) ? regionFilter : 'All Regions'}
              onChange={(e) => {
                setRegionFilter(e.target.value);
                setCountryFilter('All Countries');
              }}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0D9488] cursor-pointer backdrop-blur-xs transition-colors max-w-[130px]"
            >
              {availableRegions.map((r) => (
                <option key={r} value={r} className="bg-slate-900 text-white">
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <label htmlFor="country-filter" className="text-xs font-semibold text-slate-300 whitespace-nowrap">
              Country:
            </label>
            <select
              id="country-filter"
              value={countryOptions.includes(countryFilter) ? countryFilter : 'All Countries'}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0D9488] cursor-pointer backdrop-blur-xs transition-colors max-w-[150px]"
            >
              {countryOptions.map((c) => (
                <option key={c} value={c} className="bg-slate-900 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <label htmlFor="product-filter" className="text-xs font-semibold text-slate-300 whitespace-nowrap">
              Product:
            </label>
            <select
              id="product-filter"
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0D9488] cursor-pointer backdrop-blur-xs transition-colors max-w-[150px]"
            >
              {availableProducts.map((p) => (
                <option key={p} value={p} className="bg-slate-900 text-white">
                  {p}
                </option>
              ))}
            </select>
          </div>

          <ClearFiltersButton
            onClear={clearFilters}
            disabled={!filtersActive}
            className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20 hover:!text-rose-200 hover:!border-rose-300/40"
          />
        </div>
      </div>

      {/* ── Summary Bar & Action Tabs ───────────────────────────────────── */}
      <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-6 py-3.5 flex items-center justify-start gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('compliance')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'compliance'
              ? 'bg-[#1E429F] text-white shadow-xs'
              : 'text-[#6B7280] hover:text-[#111827] hover:bg-slate-200/70'
          }`}
        >
          Compliance Gap
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('execution')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'execution'
              ? 'bg-[#0D9488] text-white shadow-xs'
              : 'text-[#6B7280] hover:text-[#111827] hover:bg-slate-200/70'
          }`}
        >
          Execution Gap
        </button>
      </div>

      {/* ── Main Body: Table + Status Legend ──────────────────────────── */}
      <div className="p-6 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 max-h-[640px] overflow-auto pr-1 custom-scrollbar">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-16 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              <span className="font-bold">Error loading evidence locker:</span> {error}
            </div>
          ) : filteredCreatives.length === 0 ? (
            <div className="py-16 text-center text-[#6B7280] text-xs font-semibold bg-[#F8FAFC] rounded-xl border border-dashed border-[#E5E7EB]">
              No creatives found for the selected filters (Quarter: {quarterFilter} • Product: {productFilter}{activeTab === 'compliance' && statusFilter ? ` • Status: ${statusFilter === 'compliant' ? 'Compliant' : statusFilter === 'non_compliant' ? 'Non-Compliant' : 'At Risk'}` : ''}).
            </div>
          ) : (
            <table className="w-full min-w-[720px] text-left text-xs border-separate border-spacing-0">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#F8FAFC] text-[10px] font-extrabold uppercase tracking-wider text-[#6B7280]">
                  <th className="px-3 py-2.5 border-b border-[#E5E7EB] rounded-tl-lg">Image</th>
                  {activeTab === 'compliance' ? (
                    <>
                      <th className="px-3 py-2.5 border-b border-[#E5E7EB]">Score</th>
                      <th className="px-3 py-2.5 border-b border-[#E5E7EB]">Logo</th>
                      <th className="px-3 py-2.5 border-b border-[#E5E7EB]">Badge</th>
                      <th className="px-3 py-2.5 border-b border-[#E5E7EB]">Text</th>
                      <th className="px-3 py-2.5 border-b border-[#E5E7EB]">Visual</th>
                      <th className="px-3 py-2.5 border-b border-[#E5E7EB] rounded-tr-lg">Feedback type</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2.5 border-b border-[#E5E7EB]">Campaign</th>
                      <th className="px-3 py-2.5 border-b border-[#E5E7EB]">Offer Type</th>
                      <th className="px-3 py-2.5 border-b border-[#E5E7EB]">Product</th>
                      <th className="px-3 py-2.5 border-b border-[#E5E7EB] rounded-tr-lg">CTA (Y/N)</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredCreatives.map((item, idx) => {
                  const cardId = item.Analysis_ID ?? idx;
                  const isLoaded = imageLoaded[String(cardId)];
                  const hasImgError = imageErrors[String(cardId)];
                  const isCompliant = statusBucket(item) === 'compliant';
                  const normUrl = creativeImageUrl(item, activeTab);
                  const score = complianceScore(item);

                  return (
                    <tr
                      key={cardId}
                      onClick={() => setSelectedCreative(item)}
                      className="bg-white hover:bg-[#F8FAFC] cursor-pointer border-b border-[#E5E7EB]"
                    >
                      <td className="px-3 py-2 align-middle">
                        <div className="relative w-20 h-12 rounded-md overflow-hidden bg-[#F8FAFC] border border-[#E5E7EB]">
                          {!hasImgError && normUrl && !isLoaded && (
                            <div className="absolute inset-0 bg-slate-200 animate-pulse" />
                          )}
                          {!hasImgError && normUrl ? (
                            <img
                              src={normUrl}
                              alt=""
                              loading="lazy"
                              onLoad={() => handleImageLoad(cardId)}
                              onError={() => handleImageError(cardId)}
                              className={`w-full h-full object-cover ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                            />
                          ) : (
                            <CreativeBannerVisual item={item} isCompliant={isCompliant} />
                          )}
                        </div>
                      </td>
                      {activeTab === 'compliance' ? (
                        <>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {score == null ? (
                              <span className="font-black text-[#6B7280]">NA</span>
                            ) : (
                              <span className={`font-black ${scoreColorClass(score)}`}>
                                {score}%
                              </span>
                            )}
                          </td>
                          {complianceFlags(item).map(({ label, status }) => (
                            <td key={label} className="px-3 py-2"><FlagMark status={status} /></td>
                          ))}
                          <td className="px-3 py-2 text-[#111827] max-w-[280px]">
                            <span className="line-clamp-2" title={displayFeedbackType(item.FeedbackType) || undefined}>
                              {displayFeedbackType(item.FeedbackType)}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 text-[#111827] font-semibold max-w-[220px]">
                            <span className="line-clamp-2">
                              {displayValue(item.Campaign_Type !== 'Unknown' ? item.Campaign_Type : item.Campaign_Name)}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{displayValue(item.Offer_Type)}</td>
                          <td className="px-3 py-2 max-w-[240px]">
                            <span className="line-clamp-2">{displayValue(item.Content)}</span>
                          </td>
                          <td className="px-3 py-2 font-bold">
                            {ynStatus(item.CTA_Flag) === 'yes' ? (
                              'Y'
                            ) : ynStatus(item.CTA_Flag) === 'na' ? (
                              <span className="text-[#6B7280]">NA</span>
                            ) : highlightMissingCta(item) ? (
                              <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded bg-[#FEE2E2] text-[#B91C1C] font-extrabold">
                                N
                              </span>
                            ) : (
                              'N'
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Status Legend Panel (Right side) ─────────────────────────── */}
        {activeTab === 'compliance' && (
        <aside className="w-full lg:w-72 shrink-0 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-4 flex flex-col gap-3 self-start">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#111827] border-b border-[#E5E7EB] pb-2">
            Status Definitions
          </h3>

          <div className="space-y-2 text-xs leading-relaxed">
            <button
              type="button"
              onClick={() => toggleStatusFilter('compliant')}
              aria-pressed={statusFilter === 'compliant'}
              className={`w-full text-left flex items-start gap-2 rounded-lg p-2 cursor-pointer transition-colors ${
                statusFilter === 'compliant' ? 'bg-emerald-50 ring-1 ring-[#10B981]/40' : 'hover:bg-white'
              }`}
            >
              <span className="text-base shrink-0 leading-none">✅</span>
              <div>
                <strong className="text-[#10B981] block font-bold">Compliant</strong>
                <p className="text-[#6B7280] text-[11px] mt-0.5">
                  Score is 90% or higher.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => toggleStatusFilter('non_compliant')}
              aria-pressed={statusFilter === 'non_compliant'}
              className={`w-full text-left flex items-start gap-2 rounded-lg p-2 cursor-pointer transition-colors ${
                statusFilter === 'non_compliant' ? 'bg-amber-50 ring-1 ring-[#F59E0B]/40' : 'hover:bg-white'
              }`}
            >
              <span className="text-base shrink-0 leading-none">🔶</span>
              <div>
                <strong className="text-[#F59E0B] block font-bold">Non-Compliant</strong>
                <p className="text-[#6B7280] text-[11px] mt-0.5">
                  Score is between 80% and 90%.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => toggleStatusFilter('at_risk')}
              aria-pressed={statusFilter === 'at_risk'}
              className={`w-full text-left flex items-start gap-2 rounded-lg p-2 cursor-pointer transition-colors ${
                statusFilter === 'at_risk' ? 'bg-rose-50 ring-1 ring-[#EF4444]/40' : 'hover:bg-white'
              }`}
            >
              <span className="text-base shrink-0 leading-none">🔴</span>
              <div>
                <strong className="text-[#EF4444] block font-bold">At Risk</strong>
                <p className="text-[#6B7280] text-[11px] mt-0.5">
                  Score is less than 80%.
                </p>
              </div>
            </button>
          </div>
        </aside>
        )}

      </div>
      {/* ── Creative Detail Modal ───────────────────────────────────────── */}
      {selectedCreative && (
        <CreativeModal item={selectedCreative} onClose={handleCloseModal} mode={activeTab} />
      )}
    </section>
  );
}
