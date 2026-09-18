// src/pages/EvidenceLocker.tsx
// Creative Evidence Locker — POP Evaluation Compliant vs. Non-Compliant Gallery
// Persistent filter options, default 'All' quarter, lazy loading with grey placeholder.

import { useState, useEffect, useMemo, useCallback } from 'react';

import api from '../api/client';

interface CreativeItem {
  Analysis_ID: number | string;
  Asset_URL: string;
  compliance_status: 'Compliant' | 'Non-Compliant';
  sender_email?: string;
  Country?: string;
  Region?: string;
  Parent_Account?: string;
  Subject?: string;
  Campaign_Type?: string;
  Campaign_Name?: string;
  Layout?: string;
  Content?: string;
  Product?: string;
  OEM_Flag?: string;
  OEM_Values?: string;
  Intel_Visual_Flag?: string;
  Visual_Content_Name?: string;
  Intel_Visual_Usage?: string;
  General_Visual_Flag?: string;
  AI_Messaging?: string;
  Inside_Messaging?: string;
  Offer_Flag?: string;
  Offer_Type?: string;
  CTA_Flag?: string;
  Objective?: string;
  quarter_label?: string;
  product_families?: string[];
  generations?: string[];
}

interface EvidenceLockerResponse {
  quarter: string;
  summary: {
    total: number;
    compliant: number;
    non_compliant: number;
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

// ── Check if a mandate condition is passed ─────────────────────────────────────
function isMandatePass(value?: string | null): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === 'yes' || v === '1' || v === 'true' || (v !== 'no' && v !== 'none' && v !== '0' && v !== 'false' && v !== 'unknown');
}

function isPresent(value?: string | null): boolean {
  const v = String(value || '').trim();
  return Boolean(v) && !['none', 'unknown', 'no', 'n/a', 'na', ''].includes(v.toLowerCase());
}

function logoPass(item: CreativeItem): boolean {
  return isMandatePass(item.Intel_Visual_Flag);
}

function badgePass(item: CreativeItem): boolean {
  return isMandatePass(item.Inside_Messaging);
}

function textPass(item: CreativeItem): boolean {
  return isMandatePass(item.AI_Messaging);
}

function visualPass(item: CreativeItem): boolean {
  if (isMandatePass(item.General_Visual_Flag)) return true;
  const usage = String(item.Intel_Visual_Usage || '').toLowerCase();
  if (usage.includes('used') && !usage.includes('not used')) return true;
  return isPresent(item.Visual_Content_Name);
}

function complianceScore(item: CreativeItem): number {
  const flags = [logoPass(item), badgePass(item), textPass(item), visualPass(item)];
  return Math.round((flags.filter(Boolean).length / flags.length) * 100);
}

function complianceFeedback(item: CreativeItem): string {
  const missing: string[] = [];
  if (!logoPass(item)) missing.push('Logo');
  if (!badgePass(item)) missing.push('Badge');
  if (!textPass(item)) missing.push('Text');
  if (!visualPass(item)) missing.push('Visual');
  if (missing.length) return `Missing ${missing.join(', ')}`;
  if (isPresent(item.Objective)) return String(item.Objective);
  return 'Meets brand requirements';
}

function displayOrDash(value?: string | null): string {
  return isPresent(value) ? String(value).trim() : '—';
}

function FlagMark({ pass }: { pass: boolean }) {
  return (
    <span className={`font-bold ${pass ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
      {pass ? 'Yes' : 'No'}
    </span>
  );
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
          {item.Subject || 'Built for Next-Gen Performance & AI'}
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
  'Intel Core Ultra',
  'Intel Core Processors',
  'Intel Evo',
  'Intel Graphics',
  'Other / General',
];

const DEFAULT_QUARTERS = [
  'All Quarters',
  'Q3 2026',
  'Q2 2026',
  'Q1 2026',
];

const DEFAULT_REGIONS = ['All Regions'];
const DEFAULT_COUNTRIES = ['All Countries'];

// ── Creative Detail Modal ──────────────────────────────────────────────────────
function CreativeModal({
  item,
  onClose,
}: {
  item: CreativeItem;
  onClose: () => void;
}) {
  const isCompliant = item.compliance_status === 'Compliant';
  const normUrl = normalizeAssetUrl(item.Asset_URL);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const logoPass  = isMandatePass(item.Intel_Visual_Flag);
  const badgePass = isMandatePass(item.Inside_Messaging);
  const ctaPass   = isMandatePass(item.CTA_Flag);

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
              {item.Subject || item.Campaign_Name || 'Creative Detail'}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Analysis ID: {item.Analysis_ID} &nbsp;•&nbsp; {item.quarter_label || '—'}
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
        <div className="flex flex-col md:flex-row gap-0">

          {/* Left: full creative image */}
          <div className="md:w-1/2 shrink-0 bg-[#F8FAFC] flex items-center justify-center min-h-[300px] relative">
            {!imgError && normUrl ? (
              <>
                {!imgLoaded && (
                  <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
                    <span className="text-xs text-[#6B7280] font-semibold">Loading Asset...</span>
                  </div>
                )}
                <img
                  src={normUrl}
                  alt={item.Subject || 'Creative Asset'}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgError(true)}
                  className={`w-full h-full object-contain transition-opacity duration-300 ${
                    imgLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{ maxHeight: '480px' }}
                />
              </>
            ) : (
              <CreativeBannerVisual item={item} isCompliant={isCompliant} />
            )}
            {/* Compliance badge overlay */}
            <span
              className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide shadow-md ${
                isCompliant
                  ? 'bg-[#10B981] text-white'
                  : 'bg-[#EF4444] text-white'
              }`}
            >
              {isCompliant ? '✅ Compliant' : '🔴 Non-Compliant'}
            </span>
          </div>

          {/* Right: metadata */}
          <div className="md:w-1/2 p-6 flex flex-col gap-4">

            {/* Mandate scoreboard (3 core visual pillars) */}
            <div className="grid grid-cols-3 gap-2 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-3 text-center text-[11px] font-bold">
              {[
                { label: 'Logo',  pass: logoPass },
                { label: 'Badge', pass: badgePass },
                { label: 'CTA',   pass: ctaPass },
              ].map(({ label, pass }) => (
                <div key={label}>
                  <span className="text-[#6B7280] block text-[10px] font-semibold mb-0.5">{label}</span>
                  <span className="text-base">{pass ? '✅' : '❌'}</span>
                </div>
              ))}
            </div>



            {/* Metadata rows */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
              {[
                { dt: 'Sender',         dd: item.sender_email },
                { dt: 'Country',        dd: item.Country },
                { dt: 'Region',         dd: item.Region },
                { dt: 'Parent Account', dd: item.Parent_Account },
                { dt: 'Campaign Type',  dd: item.Campaign_Type },
                { dt: 'Campaign Name',  dd: item.Campaign_Name },
                { dt: 'Layout',         dd: item.Layout },
                { dt: 'Content',        dd: item.Content },
                { dt: 'OEM',            dd: item.OEM_Values || (item.OEM_Flag === 'Yes' ? 'Present' : 'Not present') },
                { dt: 'Visual Name',    dd: item.Visual_Content_Name },
                { dt: 'AI Messaging',   dd: item.AI_Messaging },
                { dt: 'Inside Msg',     dd: item.Inside_Messaging },
                { dt: 'Offer',          dd: item.Offer_Flag },
                { dt: 'CTA',            dd: item.CTA_Flag },
              ].map(({ dt, dd }) =>
                dd && dd !== 'None' && dd !== 'Unknown' ? (
                  <div key={dt}>
                    <dt className="text-[#6B7280] font-semibold text-[10px] uppercase tracking-wide">{dt}</dt>
                    <dd className="text-[#111827] font-semibold truncate" title={String(dd)}>{dd}</dd>
                  </div>
                ) : null
              )}
            </dl>

            {/* Objective */}
            {item.Objective && item.Objective !== 'None' && item.Objective !== 'Unknown' && (
              <div className="mt-auto">
                <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wide mb-1">Objective</p>
                <p className="text-xs text-[#111827] italic leading-relaxed">"{item.Objective}"</p>
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
    const queryString = params.toString() ? `?${params.toString()}` : '';

    api
      .get<EvidenceLockerResponse>(`/api/reports/evidence-locker/${queryString}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.data) {
          setData(res.data);

          if (Array.isArray(res.data.filter_options?.products) && res.data.filter_options.products.length > 1) {
            setAvailableProducts(res.data.filter_options.products);
          }

          if (Array.isArray(res.data.filter_options?.quarters) && res.data.filter_options.quarters.length > 1) {
            setAvailableQuarters((prev) => {
              const merged = Array.from(new Set([...prev, ...res.data.filter_options.quarters]));
              const rest = merged.filter((q) => q !== 'All Quarters' && q !== 'All');
              rest.sort((a, b) => {
                const pa = a.match(/Q(\d)\s+(\d{4})/i);
                const pb = b.match(/Q(\d)\s+(\d{4})/i);
                if (!pa || !pb) return b.localeCompare(a);
                const yearDiff = Number(pb[2]) - Number(pa[2]);
                if (yearDiff !== 0) return yearDiff;
                return Number(pb[1]) - Number(pa[1]);
              });
              return ['All Quarters', ...rest];
            });
          }

          if (Array.isArray(res.data.filter_options?.regions) && res.data.filter_options.regions.length > 1) {
            setAvailableRegions(res.data.filter_options.regions);
          }

          if (Array.isArray(res.data.filter_options?.countries) && res.data.filter_options.countries.length > 1) {
            const countries = res.data.filter_options.countries.map((c) =>
              c === 'All' ? 'All Countries' : c
            );
            if (!countries.includes('All Countries')) {
              countries.unshift('All Countries');
            }
            setAvailableCountries(countries);
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
            compliant: fallback.filter((c) => c.compliance_status === 'Compliant').length,
            non_compliant: fallback.filter((c) => c.compliance_status === 'Non-Compliant').length,
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
  }, [quarterFilter]);

  // Product family match
  const matchesProduct = useCallback(
    (item: CreativeItem): boolean => {
      if (!productFilter || productFilter === 'All' || productFilter === 'All Products') return true;
      if (item.product_families && item.product_families.includes(productFilter)) return true;
      const needle = productFilter.toLowerCase().trim();
      const content = (item.Content || '').toLowerCase();
      if (needle === 'gaming' && (content.includes('gaming') || content.includes('gamer'))) return true;
      if (needle === 'intel core ultra' && content.includes('core ultra')) return true;
      if (needle === 'intel core processors' && (content.includes('core processor') || content.includes('intel processor') || content.includes('processors'))) return true;
      if (needle === 'intel evo' && content.includes('evo')) return true;
      if (needle === 'intel graphics' && (content.includes('arc') || content.includes('iris') || content.includes('graphic'))) return true;
      return content.includes(needle);
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

  const countryOptions = useMemo(() => {
    const fromData = Array.from(
      new Set(
        (data?.creatives || [])
          .filter((c) => matchesRegion(c))
          .map((c) => String(c.Country || '').trim())
          .filter((c) => c && c !== 'None' && c !== 'Unknown')
      )
    ).sort((a, b) => a.localeCompare(b));
    if (fromData.length > 0) return ['All Countries', ...fromData];
    return availableCountries;
  }, [data, matchesRegion, availableCountries]);

  useEffect(() => {
    if (countryFilter === 'All Countries') return;
    if (!countryOptions.includes(countryFilter)) {
      setCountryFilter('All Countries');
    }
  }, [countryOptions, countryFilter]);

  const filteredCreatives = useMemo(() => {
    if (!data?.creatives) return [];
    return data.creatives.filter((c) => matchesProduct(c) && matchesRegion(c) && matchesCountry(c));
  }, [data, matchesProduct, matchesRegion, matchesCountry]);

  const handleImageLoad = (id: string | number) => {
    setImageLoaded((prev) => ({ ...prev, [String(id)]: true }));
  };

  const handleImageError = (id: string | number) => {
    setImageErrors((prev) => ({ ...prev, [String(id)]: true }));
  };

  return (
    <section
      id="retailer-creative-performance"
      className="mt-8 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col scroll-mt-20"
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
              onChange={(e) => setQuarterFilter(e.target.value)}
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

          <div className="flex items-center gap-1.5 shrink-0">
            <label htmlFor="region-filter" className="text-xs font-semibold text-slate-300 whitespace-nowrap">
              Region:
            </label>
            <select
              id="region-filter"
              value={availableRegions.includes(regionFilter) ? regionFilter : 'All Regions'}
              onChange={(e) => setRegionFilter(e.target.value)}
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
              No creatives found for the selected filters (Quarter: {quarterFilter} • Product: {productFilter}).
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
                      <th className="px-3 py-2.5 border-b border-[#E5E7EB] rounded-tr-lg">Feedback</th>
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
                  const isCompliant = item.compliance_status === 'Compliant';
                  const normUrl = normalizeAssetUrl(item.Asset_URL);
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
                            <span className={`font-black ${score >= 90 ? 'text-[#10B981]' : score >= 75 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                              {score}%
                            </span>
                          </td>
                          <td className="px-3 py-2"><FlagMark pass={logoPass(item)} /></td>
                          <td className="px-3 py-2"><FlagMark pass={badgePass(item)} /></td>
                          <td className="px-3 py-2"><FlagMark pass={textPass(item)} /></td>
                          <td className="px-3 py-2"><FlagMark pass={visualPass(item)} /></td>
                          <td className="px-3 py-2 text-[#111827] max-w-[280px]">
                            <span className="line-clamp-2" title={complianceFeedback(item)}>
                              {complianceFeedback(item)}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 text-[#111827] font-semibold max-w-[220px]">
                            <span className="line-clamp-2">
                              {displayOrDash(item.Campaign_Type !== 'Unknown' ? item.Campaign_Type : item.Campaign_Name)}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{displayOrDash(item.Offer_Type)}</td>
                          <td className="px-3 py-2 max-w-[240px]">
                            <span className="line-clamp-2">{displayOrDash(item.Product !== 'Unknown' ? item.Product : item.Content)}</span>
                          </td>
                          <td className="px-3 py-2 font-bold">
                            {isMandatePass(item.CTA_Flag) ? 'Y' : 'N'}
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
        <aside className="w-full lg:w-72 shrink-0 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-4 flex flex-col gap-3 self-start">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#111827] border-b border-[#E5E7EB] pb-2">
            Status Definitions
          </h3>

          <div className="space-y-3 text-xs leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0 leading-none">✅</span>
              <div>
                <strong className="text-[#10B981] block font-bold">Compliant</strong>
                <p className="text-[#6B7280] text-[11px] mt-0.5">
                  Score is 90% or higher and required brand standards are met.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-base shrink-0 leading-none">🔴</span>
              <div>
                <strong className="text-[#EF4444] block font-bold">Non-Compliant</strong>
                <p className="text-[#6B7280] text-[11px] mt-0.5">
                  Score is below 90% and the creative has usage-related issues.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-base shrink-0 leading-none">🔶</span>
              <div>
                <strong className="text-[#F59E0B] block font-bold">At Risk</strong>
                <p className="text-[#6B7280] text-[11px] mt-0.5">
                  Score is below 90% and the creative has missing or outdated brand elements.
                </p>
              </div>
            </div>
          </div>
        </aside>

      </div>
      {/* ── Creative Detail Modal ───────────────────────────────────────── */}
      {selectedCreative && (
        <CreativeModal item={selectedCreative} onClose={handleCloseModal} />
      )}
    </section>
  );
}
