// src/pages/LandingPage.tsx
// BASCO Retail Marketing Insights — Public Landing Page matching reference design.

import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import bascoLogoImg from "../assets/basco-logo.jpeg";
import intelLogoImg from "../assets/intel-logo.png";


export default function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const handleCtaClick = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f6ff] text-slate-900 selection:bg-blue-500 selection:text-white relative overflow-hidden font-sans">
      
      {/* ── Ambient Radiant Mesh & Concentric Wave Ribbons Background ──────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
        {/* Soft atmospheric radial mesh gradients */}
        <div className="absolute -top-[15%] -left-[10%] w-[55%] h-[65%] bg-gradient-to-br from-[#dbeafe] via-[#ede9fe] to-transparent rounded-full blur-3xl opacity-80" />
        <div className="absolute top-[5%] -right-[5%] w-[60%] h-[75%] bg-gradient-to-bl from-[#fae8ff] via-[#e0e7ff] to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute bottom-[10%] left-[25%] w-[50%] h-[45%] bg-gradient-to-t from-[#cffafe] via-[#dbeafe] to-transparent rounded-full blur-2xl opacity-60" />
        <div className="absolute top-[35%] left-[40%] w-[35%] h-[35%] bg-radial from-white/90 via-[#e0f2fe]/40 to-transparent rounded-full blur-2xl" />

        {/* Concentric Gradient Wave Ribbon Streams matching the reference image */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="auroraGrad1" x1="0%" y1="70%" x2="100%" y2="20%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.45" />
              <stop offset="25%" stopColor="#c084fc" stopOpacity="0.65" />
              <stop offset="55%" stopColor="#0062d2" stopOpacity="0.75" />
              <stop offset="85%" stopColor="#06b6d4" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
            </linearGradient>

            <linearGradient id="auroraGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.3" />
              <stop offset="40%" stopColor="#60a5fa" stopOpacity="0.5" />
              <stop offset="75%" stopColor="#38bdf8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.25" />
            </linearGradient>

            <linearGradient id="auroraGrad3" x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="#e879f9" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.2" />
            </linearGradient>

            {/* Subtle glow filter */}
            <filter id="ribbonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Primary sweeping concentric wave ribbons (Bottom-Left to Top-Right) */}
          <g filter="url(#ribbonGlow)">
            <path d="M -120 540 C 180 720, 480 640, 740 480 C 1000 320, 1220 250, 1580 180" stroke="url(#auroraGrad1)" strokeWidth="1.2" />
            <path d="M -120 554 C 180 734, 480 654, 740 494 C 1000 334, 1220 264, 1580 194" stroke="url(#auroraGrad1)" strokeWidth="1.5" />
            <path d="M -120 568 C 180 748, 480 668, 740 508 C 1000 348, 1220 278, 1580 208" stroke="url(#auroraGrad1)" strokeWidth="1.8" />
            <path d="M -120 582 C 180 762, 480 682, 740 522 C 1000 362, 1220 292, 1580 222" stroke="url(#auroraGrad1)" strokeWidth="2.2" />
            <path d="M -120 596 C 180 776, 480 696, 740 536 C 1000 376, 1220 306, 1580 236" stroke="url(#auroraGrad1)" strokeWidth="2.6" />
            <path d="M -120 610 C 180 790, 480 710, 740 550 C 1000 390, 1220 320, 1580 250" stroke="url(#auroraGrad1)" strokeWidth="2.2" />
            <path d="M -120 624 C 180 804, 480 724, 740 564 C 1000 404, 1220 334, 1580 264" stroke="url(#auroraGrad2)" strokeWidth="1.8" />
            <path d="M -120 638 C 180 818, 480 738, 740 578 C 1000 418, 1220 348, 1580 278" stroke="url(#auroraGrad2)" strokeWidth="1.5" />
            <path d="M -120 652 C 180 832, 480 752, 740 592 C 1000 432, 1220 362, 1580 292" stroke="url(#auroraGrad2)" strokeWidth="1.2" />
            <path d="M -120 666 C 180 846, 480 766, 740 606 C 1000 446, 1220 376, 1580 306" stroke="url(#auroraGrad2)" strokeWidth="1.0" />
            <path d="M -120 680 C 180 860, 480 780, 740 620 C 1000 460, 1220 390, 1580 320" stroke="url(#auroraGrad2)" strokeWidth="0.8" />
          </g>

          {/* Secondary sweeping harmonic contour lines */}
          <g opacity="0.65">
            <path d="M -80 400 C 260 520, 620 440, 880 290 C 1140 140, 1340 100, 1560 50" stroke="url(#auroraGrad3)" strokeWidth="1.2" strokeDasharray="6 6" />
            <path d="M -80 415 C 260 535, 620 455, 880 305 C 1140 155, 1340 115, 1560 65" stroke="url(#auroraGrad3)" strokeWidth="1.4" />
            <path d="M -80 430 C 260 550, 620 470, 880 320 C 1140 170, 1340 130, 1560 80" stroke="url(#auroraGrad3)" strokeWidth="1.6" />
            <path d="M -80 445 C 260 565, 620 485, 880 335 C 1140 185, 1340 145, 1560 95" stroke="url(#auroraGrad1)" strokeWidth="1.8" />
          </g>
        </svg>
      </div>


      {/* ── Top Header Navigation ──────────────────────────────────────────── */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-6 flex items-center justify-between">
        {/* Left: Intel Logo */}
        <div className="flex items-center">
          <img
            src={intelLogoImg}
            alt="Intel Logo"
            className="h-7 sm:h-8.5 w-auto object-contain mix-blend-multiply"
          />
        </div>

        {/* Right: BASCO Logo */}
        <div className="flex items-center">
          <img
            src={bascoLogoImg}
            alt="BASCO Logo"
            className="h-7 sm:h-8.5 w-auto object-contain mix-blend-multiply"
          />
        </div>
      </header>

      {/* ── Main Hero Section ──────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 pt-2 pb-12 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* ── Left Column: Value Proposition & CTA ───────────────────────── */}
          <div className="lg:col-span-5 flex flex-col items-start space-y-6">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black text-[#071739] tracking-tight leading-[1.08]">
                Turn Retail<br />
                Execution into<br />
                <span className="bg-gradient-to-r from-[#0062d2] via-[#0284c7] to-[#6366f1] bg-clip-text text-transparent inline-block">
                  Marketing
                </span><br />
                <span className="bg-gradient-to-r from-[#0062d2] via-[#06b6d4] to-[#3b82f6] bg-clip-text text-transparent inline-block">
                  Intelligence.
                </span>
              </h1>

              {/* Accent underline bar with Aurora Gradient */}
              <div className="w-14 h-1.5 bg-gradient-to-r from-[#0062d2] via-[#06b6d4] to-[#6366f1] rounded-full mt-4 shadow-xs" />
            </div>


            <p className="text-slate-600 text-sm sm:text-[15px] leading-relaxed max-w-md font-normal">
              Get complete visibility into retailer marketing performance, creative effectiveness, Intel brand presence, product promotion, and campaign activity—all in one place.
            </p>

            <div className="pt-2 space-y-3.5 w-full sm:w-auto">
              <button
                onClick={handleCtaClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#0062d2] hover:bg-[#0052b4] active:bg-[#004294] text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:translate-y-[-1px] cursor-pointer"
              >
                <span>View My Retailer Insights</span>
                <span className="text-base">→</span>
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <svg
                  className="w-3.5 h-3.5 text-slate-400 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <span>Sign in with your Intel credentials</span>
              </div>
            </div>
          </div>

          {/* ── Right Column: Visual Intelligence Preview Bento Grid ───────── */}
          <div className="lg:col-span-7 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto lg:max-w-none">
              
              {/* Card 1: Intel Visual Adoption (Gauge) */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-100/90 flex flex-col justify-between hover:shadow-2xl transition-all duration-300">
                <div className="text-xs font-bold text-slate-700 tracking-tight">
                  Intel Visual Adoption
                </div>

                <div className="my-3 flex flex-col items-center justify-center relative">
                  {/* Circular Ring Gauge */}
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#e2e8f0"
                        strokeWidth="9"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="url(#gaugeGrad)"
                        strokeWidth="9"
                        strokeDasharray="251.2"
                        strokeDashoffset="45"
                        strokeLinecap="round"
                        fill="transparent"
                      />
                      <defs>
                        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#0062d2" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-slate-900 leading-none">82%</span>
                      <span className="text-[10px] text-slate-500 font-medium mt-1">Adoption Rate</span>
                    </div>
                  </div>
                </div>

                <div className="text-center text-[11px] font-semibold text-emerald-600 flex items-center justify-center gap-1 bg-emerald-50 py-1 px-2.5 rounded-full mx-auto">
                  <span>↑</span>
                  <span>12% vs Q4-2024</span>
                </div>
              </div>

              {/* Card 2: Brand Attribution at Risk (Sparkline) */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-100/90 flex flex-col justify-between hover:shadow-2xl transition-all duration-300">
                <div>
                  <div className="text-xs font-bold text-slate-800">Brand Attribution at Risk</div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">Est. Attribution Loss (FMV)</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#0062d2] mt-2">$2.8M</div>
                </div>

                {/* Mini sparkline curve */}
                <div className="h-10 w-full mt-3">
                  <svg className="w-full h-full" viewBox="0 0 160 40" preserveAspectRatio="none">
                    <path
                      d="M0 35 Q 30 32, 60 25 T 110 18 T 160 5 L 160 40 L 0 40 Z"
                      fill="url(#sparkGrad)"
                    />
                    <path
                      d="M0 35 Q 30 32, 60 25 T 110 18 T 160 5"
                      fill="none"
                      stroke="#0062d2"
                      strokeWidth="2.5"
                    />
                    <defs>
                      <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0062d2" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#0062d2" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Card 3: Retailer Health Index (Wide across 2 cols) */}
              <div className="sm:col-span-2 bg-white rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-100/90 hover:shadow-2xl transition-all duration-300">
                <div className="text-xs font-bold text-slate-800 mb-3.5">
                  Retailer Health Index
                </div>

                <div className="grid grid-cols-4 gap-2 text-center divide-x divide-slate-100">
                  <div className="px-1">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-600 mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Strong</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-600">24</div>
                  </div>

                  <div className="px-1">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-600 mb-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Watch</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-500">18</div>
                  </div>

                  <div className="px-1">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-600 mb-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>Lower Priority</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-blue-600">7</div>
                  </div>

                  <div className="px-1">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-600 mb-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Action Needed</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-rose-500">11</div>
                  </div>
                </div>
              </div>

              {/* Card 4: Top Compliance Issue */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-100/90 flex flex-col justify-between hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Top Compliance Issue</span>
                  <span className="text-amber-500 text-sm">⚠️</span>
                </div>

                <div className="my-3 bg-blue-50/80 border border-blue-100/80 rounded-xl p-3 text-center">
                  <span className="text-xs font-extrabold text-[#0a2540] tracking-wide block uppercase">
                    IMPROPER USAGE<br />OF ELEMENTS
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 text-center font-medium">
                  32% of flagged issues
                </div>
              </div>

              {/* Card 5: Product Promotion Mix (Bar Graph) */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-100/90 flex flex-col justify-between hover:shadow-2xl transition-all duration-300 space-y-2.5">
                <div className="text-xs font-bold text-slate-800">
                  Product Promotion Mix
                </div>

                <div className="space-y-2.5 my-auto">
                  {/* Intel® Core™ Ultra – 45% */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-700">Intel® Core™ Ultra</span>
                      <span className="font-extrabold text-blue-700">45%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: "45%" }}
                      />
                    </div>
                  </div>

                  {/* Intel® Evo™ Edition – 32% */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-700">Intel® Evo™ Edition</span>
                      <span className="font-extrabold text-cyan-600">32%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
                        style={{ width: "32%" }}
                      />
                    </div>
                  </div>

                  {/* 14th Gen Intel® Core™ – 12% */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-700">14th Gen Intel® Core™</span>
                      <span className="font-extrabold text-slate-800">12%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-slate-700 to-slate-900 h-full rounded-full transition-all duration-500"
                        style={{ width: "12%" }}
                      />
                    </div>
                  </div>

                  {/* Others – 11% */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-700">Others</span>
                      <span className="font-extrabold text-slate-500">11%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-slate-400 h-full rounded-full transition-all duration-500"
                        style={{ width: "11%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ── Platform Value Section (4 Value Pillars) ─────────────────────── */}
        <section id="value-section" className="mt-14 pt-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl border border-slate-100/90 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Pillar 1: Performance at a glance */}
            <div className="flex flex-col items-start space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50/90 text-[#0062d2] flex items-center justify-center border border-blue-100/80 shadow-2xs">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                  <path d="M4 15l5-5 5 4 6-8" />
                  <polyline points="16 6 20 6 20 10" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-[#071739]">Performance at a glance</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Track how retailers are executing and where attention is needed.
              </p>
            </div>

            {/* Pillar 2: Actionable insights */}
            <div className="flex flex-col items-start space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50/90 text-[#0062d2] flex items-center justify-center border border-blue-100/80 shadow-2xs">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                  <path d="m19 5-5.5 5.5" />
                  <path d="M15 5h4v4" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-[#071739]">Actionable insights</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Identify gaps, opportunities, and priority actions that drive impact.
              </p>
            </div>

            {/* Pillar 3: Creative intelligence */}
            <div className="flex flex-col items-start space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50/90 text-[#0062d2] flex items-center justify-center border border-blue-100/80 shadow-2xs">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-[#071739]">Creative intelligence</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                See how Intel brand, visuals, messaging, and offers are being used.
              </p>
            </div>

            {/* Pillar 4: Role-based access */}
            <div className="flex flex-col items-start space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50/90 text-[#0062d2] flex items-center justify-center border border-blue-100/80 shadow-2xs">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-[#071739]">Role-based access</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Personalized views for your accounts, markets, and retailers.
              </p>
            </div>

          </div>
        </section>

        {/* ── Closing Statement ──────────────────────────────────────────────── */}
        <div className="text-center my-10">
          <p className="text-base sm:text-lg font-black bg-gradient-to-r from-[#0062d2] via-[#0284c7] to-[#6366f1] bg-clip-text text-transparent tracking-tight">
            Your retailers. Your markets. The signals that matter.
          </p>
        </div>

      </main>

      {/* ── Navy Footer ────────────────────────────────────────────────────── */}
      <footer className="w-full bg-[#061226] text-slate-400 py-6 px-6 sm:px-10 lg:px-14 border-t border-slate-800/60 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-white text-sm tracking-wide">BASCO</span>
            <span className="text-slate-600">|</span>
            <span className="text-xs text-slate-400">© 2025 Intel Corporation. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-300">
            <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <span className="text-slate-700">|</span>
            <a href="#terms" className="hover:text-white transition-colors">Terms of Use</a>
            <span className="text-slate-700">|</span>
            <button onClick={() => navigate("/login")} className="hover:text-white text-[#38bdf8] flex items-center gap-1 transition-colors cursor-pointer">
              <span>Contact Support</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
