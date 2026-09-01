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
  OEM_Flag?: string;
  OEM_Values?: string;
  Intel_Visual_Flag?: string;
  Visual_Content_Name?: string;
  AI_Messaging?: string;
  Inside_Messaging?: string;
  Offer_Flag?: string;
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
  return v === 'yes' || v === '1' || v === 'true' || (v !== 'no' && v !== 'none' && v !== '0' && v !== 'false');
}

// ── Dynamic Creative Visual Banner Mockup ──────────────────────────────────────
function CreativeBannerVisual({ item, isCompliant }: { item: CreativeItem; isCompliant: boolean }) {
  const content = item.Content || 'Intel Core Ultra';
  const campaign = item.Campaign_Type || item.Campaign_Name || 'Next-Gen PC';
  const oem = item.OEM_Values || (item.OEM_Flag === 'Yes' ? 'OEM Partner' : '');

  const bgGradient = isCompliant
    ? 'linear-gradient(135deg, #071739 0%, #013FFC 50%, #16D3C3 100%)'
    : 'linear-gradient(135deg, #1e1124 0%, #7A35F4 50%, #071739 100%)';

  return (
    <div
      style={{ background: bgGradient }}
      className="w-full h-full p-4 flex flex-col justify-between relative overflow-hidden select-none"
    >
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#16D3C3]/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-[#013FFC]/25 rounded-full blur-2xl pointer-events-none" />

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
        <div className="inline-flex items-center gap-1 bg-[#16D3C3]/20 border border-[#16D3C3]/30 px-2 py-0.5 rounded-full text-[9px] font-bold text-[#16D3C3] uppercase tracking-wider mb-1">
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
            <span className="text-[#013FFC] font-black text-[9px] tracking-tighter">intel</span>
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

const DEFAULT_GENERATIONS = [
  'All Generations / Series',
  'Series 3',
  'Series 2',
  'Series 1',
  '14th Gen',
  '13th Gen',
  '12th Gen',
  '11th Gen',
  '10th Gen',
];

const DEFAULT_QUARTERS = [
  'All Quarters',
  'Q3 2026',
  'Q2 2026',
  'Q1 2026',
];

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
  const aiPass    = isMandatePass(item.AI_Messaging);
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-[#071739] to-[#013FFC] rounded-t-2xl">
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

            {/* Mandate scoreboard */}
            <div className="grid grid-cols-4 gap-2 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-3 text-center text-[11px] font-bold">
              {[
                { label: 'Logo',  pass: logoPass },
                { label: 'Badge', pass: badgePass },
                { label: 'AI Msg', pass: aiPass },
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

  const [activeTab, setActiveTab] = useState<'Compliant' | 'Non-Compliant'>('Compliant');
  // Default to 2026 All Quarters
  const [quarterFilter, setQuarterFilter] = useState<string>('All Quarters');
  const [productFilter, setProductFilter] = useState<string>('All Products');
  const [generationFilter, setGenerationFilter] = useState<string>('All Generations / Series');

  // Persistent option lists that NEVER shrink when filters change
  const [availableProducts, setAvailableProducts] = useState<string[]>(DEFAULT_PRODUCTS);
  const [availableGenerations, setAvailableGenerations] = useState<string[]>(DEFAULT_GENERATIONS);
  const [availableQuarters, setAvailableQuarters] = useState<string[]>(DEFAULT_QUARTERS);

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

          if (Array.isArray(res.data.filter_options?.generations) && res.data.filter_options.generations.length > 1) {
            setAvailableGenerations(res.data.filter_options.generations);
          }

          if (Array.isArray(res.data.filter_options?.quarters) && res.data.filter_options.quarters.length > 1) {
            setAvailableQuarters(res.data.filter_options.quarters);
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
            generations: DEFAULT_GENERATIONS,
            countries: ['All', 'Australia', 'Brazil', 'Colombia', 'France', 'India', 'UK'],
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

  // Generation / Series match
  const matchesGeneration = useCallback(
    (item: CreativeItem): boolean => {
      if (!generationFilter || generationFilter === 'All' || generationFilter === 'All Generations / Series') return true;
      if (item.generations && item.generations.includes(generationFilter)) return true;
      const needle = generationFilter.toLowerCase().trim();
      const content = (item.Content || '').toLowerCase();
      return content.includes(needle);
    },
    [generationFilter]
  );

  const { liveCompliant, liveNonCompliant } = useMemo(() => {
    if (!data?.creatives) return { liveCompliant: 0, liveNonCompliant: 0 };
    const compliant    = data.creatives.filter((c) => c.compliance_status === 'Compliant'    && matchesProduct(c) && matchesGeneration(c));
    const nonCompliant = data.creatives.filter((c) => c.compliance_status === 'Non-Compliant' && matchesProduct(c) && matchesGeneration(c));
    return { liveCompliant: compliant.length, liveNonCompliant: nonCompliant.length };
  }, [data, matchesProduct, matchesGeneration]);

  const filteredCreatives = useMemo(() => {
    if (!data?.creatives) return [];
    return data.creatives.filter(
      (c) => c.compliance_status === activeTab && matchesProduct(c) && matchesGeneration(c)
    );
  }, [data, activeTab, matchesProduct, matchesGeneration]);

  const handleImageLoad = (id: string | number) => {
    setImageLoaded((prev) => ({ ...prev, [String(id)]: true }));
  };

  const handleImageError = (id: string | number) => {
    setImageErrors((prev) => ({ ...prev, [String(id)]: true }));
  };

  return (
    <section className="mt-8 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
      {/* ── Dark Header Bar ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#071739] via-[#013FFC] to-[#5B8CFF] px-6 py-5 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16D3C3]"></span>
            <h2 className="text-base md:text-lg font-bold tracking-tight text-white">
              Retailer Creative Performance
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Compliant Vs. Non-Compliant Creatives • Visual Audit Breakdown
          </p>
        </div>

        {/* Filter Dropdowns: Quarter, Product Family & Generation */}
        <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap">
          {/* Quarter Filter (2026 only) */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="quarter-filter" className="text-xs font-semibold text-slate-300 whitespace-nowrap">
              Quarter:
            </label>
            <select
              id="quarter-filter"
              value={quarterFilter}
              onChange={(e) => setQuarterFilter(e.target.value)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#16D3C3] cursor-pointer backdrop-blur-xs transition-colors"
            >
              {availableQuarters.map((q) => (
                <option key={q} value={q} className="bg-slate-900 text-white">
                  {q}
                </option>
              ))}
            </select>
          </div>

          {/* Product Category Filter (Less granular product families) */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="product-filter" className="text-xs font-semibold text-slate-300 whitespace-nowrap">
              Product:
            </label>
            <select
              id="product-filter"
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#16D3C3] cursor-pointer backdrop-blur-xs transition-colors max-w-[180px]"
            >
              {availableProducts.map((p) => (
                <option key={p} value={p} className="bg-slate-900 text-white">
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Generation / Series Filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="generation-filter" className="text-xs font-semibold text-slate-300 whitespace-nowrap">
              Generation:
            </label>
            <select
              id="generation-filter"
              value={generationFilter}
              onChange={(e) => setGenerationFilter(e.target.value)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#16D3C3] cursor-pointer backdrop-blur-xs transition-colors max-w-[180px]"
            >
              {availableGenerations.map((g) => (
                <option key={g} value={g} className="bg-slate-900 text-white">
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Summary Bar & Action Tabs ───────────────────────────────────── */}
      <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Quarter & Live Counts Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-[#013FFC]/10 text-[#013FFC] border border-[#013FFC]/20">
            <span>🗓</span>
            <span>{quarterFilter}</span>
          </span>
          {productFilter !== 'All' && productFilter !== 'All Products' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
              <span>🏷</span>
              <span>{productFilter}</span>
              <button
                type="button"
                onClick={() => setProductFilter('All Products')}
                className="ml-0.5 text-[#F59E0B] hover:text-[#F59E0B]/80 font-extrabold leading-none cursor-pointer"
                title="Clear product filter"
              >✕</button>
            </span>
          )}
          {generationFilter !== 'All' && generationFilter !== 'All Generations / Series' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-[#16D3C3]/10 text-[#16D3C3] border border-[#16D3C3]/20">
              <span>⚡</span>
              <span>{generationFilter}</span>
              <button
                type="button"
                onClick={() => setGenerationFilter('All Generations / Series')}
                className="ml-0.5 text-[#16D3C3] hover:text-[#16D3C3]/80 font-extrabold leading-none cursor-pointer"
                title="Clear generation filter"
              >✕</button>
            </span>
          )}
          <span className="text-[#CBD5E1]">|</span>
          <span className="font-semibold text-[#10B981]">
            ✅ Compliant: <strong>{liveCompliant}</strong>
          </span>
          <span className="text-[#CBD5E1]">|</span>
          <span className="font-semibold text-[#EF4444]">
            🔴 Non-Compliant: <strong>{liveNonCompliant}</strong>
          </span>
        </div>

        {/* Compliant / Non-Compliant Tabs — counts reflect current product & generation filters */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('Compliant')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'Compliant'
                ? 'bg-[#10B981] text-white shadow-xs underline underline-offset-4 decoration-2'
                : 'text-[#6B7280] hover:text-[#111827] hover:bg-slate-200/70'
            }`}
          >
            ✅ Compliant ({liveCompliant})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('Non-Compliant')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'Non-Compliant'
                ? 'bg-[#EF4444] text-white shadow-xs underline underline-offset-4 decoration-2'
                : 'text-[#6B7280] hover:text-[#111827] hover:bg-slate-200/70'
            }`}
          >
            🔴 Non-Compliant ({liveNonCompliant})
          </button>
        </div>
      </div>

      {/* ── Main Body: Scrollable Grid + Status Legend ──────────────────── */}
      <div className="p-6 flex flex-col lg:flex-row gap-6">
        
        {/* Left / Center: Scrollable Creative Cards Grid */}
        <div className="flex-1 max-h-[640px] overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            /* Skeleton Loading State — matches horizontal card layout */
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-[#F8FAFC] rounded-xl border border-[#E5E7EB] flex flex-row overflow-hidden animate-pulse min-h-[140px]"
                >
                  <div className="w-52 shrink-0 bg-slate-200" />
                  <div className="flex-1 p-4 flex flex-col gap-3 justify-center">
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                    <div className="grid grid-cols-4 gap-2">
                      {[1,2,3,4].map(i => <div key={i} className="h-8 bg-slate-200 rounded" />)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              <span className="font-bold">Error loading evidence locker:</span> {error}
            </div>
          ) : filteredCreatives.length === 0 ? (
            /* Empty State */
            <div className="py-16 text-center text-[#6B7280] text-xs font-semibold bg-[#F8FAFC] rounded-xl border border-dashed border-[#E5E7EB]">
              No creatives found for the selected filter ({activeTab} • Quarter: {quarterFilter} • Product: {productFilter}).
            </div>
          ) : (
            /* Cards — always 1 per row, horizontal layout, clickable */
            <div className="grid grid-cols-1 gap-4 pb-2">
              {filteredCreatives.map((item, idx) => {
                const cardId    = item.Analysis_ID ?? idx;
                const isLoaded  = imageLoaded[String(cardId)];
                const hasImgError = imageErrors[String(cardId)];
                const isCompliant = item.compliance_status === 'Compliant';
                const normUrl   = normalizeAssetUrl(item.Asset_URL);

                const logoPass  = isMandatePass(item.Intel_Visual_Flag);
                const badgePass = isMandatePass(item.Inside_Messaging);
                const aiPass    = isMandatePass(item.AI_Messaging);
                const ctaPass   = isMandatePass(item.CTA_Flag);

                return (
                  <div
                    key={cardId}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedCreative(item)}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedCreative(item)}
                    className="bg-white rounded-xl border border-[#E5E7EB] shadow-2xs hover:shadow-md hover:border-[#013FFC]/40 transition-all overflow-hidden flex flex-row cursor-pointer min-h-[148px] group"
                  >
                    {/* ── Left: image / banner (fixed width, fills card height) ── */}
                    <div className="relative w-52 shrink-0 bg-[#F8FAFC] overflow-hidden flex items-center justify-center self-stretch">

                      {/* Placeholder while image loads */}
                      {!hasImgError && normUrl && !isLoaded && (
                        <div className="absolute inset-0 bg-slate-200 flex items-center justify-center animate-pulse z-0">
                          <span className="text-[10px] text-[#6B7280] font-semibold">Loading…</span>
                        </div>
                      )}

                      {!hasImgError && normUrl ? (
                        <img
                          src={normUrl}
                          alt={item.Subject || item.Campaign_Name || 'Creative Asset'}
                          loading="lazy"
                          onLoad={() => handleImageLoad(cardId)}
                          onError={() => handleImageError(cardId)}
                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                            isLoaded ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                      ) : (
                        <CreativeBannerVisual item={item} isCompliant={isCompliant} />
                      )}

                      {/* Compliance Pill Badge */}
                      <span
                        className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide shadow uppercase z-10 ${
                          isCompliant
                            ? 'bg-[#10B981]/90 text-white border border-[#10B981]'
                            : 'bg-[#EF4444]/90 text-white border border-[#EF4444]'
                        }`}
                      >
                        {isCompliant ? '✅ Compliant' : '🔴 Non-Compliant'}
                      </span>

                      {/* Expand hint on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors z-10">
                        <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-lg transition-opacity">
                          🔍 View Full
                        </span>
                      </div>
                    </div>

                    {/* ── Right: metadata (takes remaining width) ── */}
                    <div className="flex-1 p-4 flex flex-col gap-2 justify-between bg-white">

                      {/* Top row: OEM tag + Country chip */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {item.OEM_Flag === 'Yes' || (item.OEM_Values && item.OEM_Values !== 'None') ? (
                          <span className="inline-block bg-[#F8FAFC] text-[#111827] text-[10px] font-bold px-2 py-0.5 rounded border border-[#E5E7EB]">
                            OEM: {item.OEM_Values || 'Present'}
                          </span>
                        ) : (
                          <span className="inline-block bg-[#F8FAFC] text-[#6B7280] text-[10px] font-semibold px-2 py-0.5 rounded border border-[#E5E7EB]">
                            OEM NOT PRESENT
                          </span>
                        )}
                        {item.Country && (
                          <span className="bg-[#F8FAFC] text-[#6B7280] text-[10px] font-medium px-2 py-0.5 rounded">
                            {item.Country}
                          </span>
                        )}
                      </div>

                      {/* Subject / Campaign name */}
                      <p className="text-xs font-semibold text-[#111827] line-clamp-1">
                        {item.Subject || item.Campaign_Name || '—'}
                      </p>

                      {/* Campaign Type & Content Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.Campaign_Type && (
                          <span className="bg-[#F8FAFC] text-[#111827] text-[10px] font-semibold px-2 py-0.5 rounded">
                            {item.Campaign_Type}
                          </span>
                        )}
                        {item.Content && (
                          <span className="bg-[#013FFC]/10 text-[#013FFC] text-[10px] font-semibold px-2 py-0.5 rounded border border-[#013FFC]/20">
                            {item.Content}
                          </span>
                        )}
                      </div>

                      {/* Mandates scoreboard */}
                      <div className="grid grid-cols-4 gap-1 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-2 py-1.5 text-center text-[10px] font-bold">
                        <div title="Intel Logo">
                          <span className="text-[#6B7280] block text-[9px]">Logo</span>
                          <span>{logoPass ? '✅' : '❌'}</span>
                        </div>
                        <div title="Badge / Inside Messaging">
                          <span className="text-[#6B7280] block text-[9px]">Badge</span>
                          <span>{badgePass ? '✅' : '❌'}</span>
                        </div>
                        <div title="AI Messaging">
                          <span className="text-[#6B7280] block text-[9px]">AI Msg</span>
                          <span>{aiPass ? '✅' : '❌'}</span>
                        </div>
                        <div title="Call To Action">
                          <span className="text-[#6B7280] block text-[9px]">CTA</span>
                          <span>{ctaPass ? '✅' : '❌'}</span>
                        </div>
                      </div>

                      {/* Objective (2-line truncated) */}
                      {item.Objective && item.Objective !== 'None' && item.Objective !== 'Unknown' && (
                        <p className="text-[11px] text-[#6B7280] italic line-clamp-2">
                          "{item.Objective}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Status Legend Panel (Right side) ─────────────────────────── */}
        <aside className="w-full lg:w-72 shrink-0 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-4 flex flex-col gap-3 self-start">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#111827] border-b border-[#E5E7EB] pb-2">
            Status Definitions
          </h3>

          <div className="space-y-3 text-xs leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0 leading-none">🔴</span>
              <div>
                <strong className="text-[#EF4444] block font-bold">Non-Compliance</strong>
                <p className="text-[#6B7280] text-[11px] mt-0.5">
                  The creative violates mandatory Intel brand guidelines and requires correction.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-base shrink-0 leading-none">🔶</span>
              <div>
                <strong className="text-[#F59E0B] block font-bold">At Risk</strong>
                <p className="text-[#6B7280] text-[11px] mt-0.5">
                  The creative has missing mandatory elements and may become non-compliant if not addressed.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-base shrink-0 leading-none">✅</span>
              <div>
                <strong className="text-[#10B981] block font-bold">Compliant</strong>
                <p className="text-[#6B7280] text-[11px] mt-0.5">
                  The creative meets all required Intel brand, messaging, and visual mandates.
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
