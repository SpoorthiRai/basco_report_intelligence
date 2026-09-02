// src/pages/LoginPage.tsx
// BASCO Retail Marketing Insights — Co-Branded Sign-In Page matching reference design.

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import LoadingSpinner from "../components/common/LoadingSpinner";
import bascoLogoImg from "../assets/basco-logo.jpeg";
import intelLogoImg from "../assets/intel-logo.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err?.message === "Network Error" || !err?.response) {
        setError("Unable to connect to the backend server. Please verify backend is running.");
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#F8FAFC] via-[#F8FAFC] to-[#FFFFFF] text-[#111827] selection:bg-[#013FFC] selection:text-white relative overflow-hidden font-sans">
      
      {/* ── Ambient Decorative Waves Background ────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
        {/* Soft atmospheric radial mesh glows */}
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[60%] bg-gradient-to-br from-[#013FFC]/10 via-[#7A35F4]/8 to-transparent rounded-full blur-3xl opacity-75" />
        <div className="absolute top-[10%] -right-[5%] w-[55%] h-[70%] bg-gradient-to-bl from-[#7A35F4]/10 via-[#16D3C3]/10 to-transparent rounded-full blur-3xl opacity-80" />
        <div className="absolute bottom-[0%] left-[20%] w-[60%] h-[50%] bg-gradient-to-t from-[#16D3C3]/10 via-[#013FFC]/8 to-transparent rounded-full blur-2xl opacity-60" />

        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="loginWave1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7A35F4" stopOpacity="0.4" />
              <stop offset="35%" stopColor="#013FFC" stopOpacity="0.55" />
              <stop offset="70%" stopColor="#16D3C3" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#5B8CFF" stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id="loginWave2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7A35F4" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#16D3C3" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#013FFC" stopOpacity="0.25" />
            </linearGradient>
            <filter id="loginGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Primary sweeping swirl ribbons */}
          <g filter="url(#loginGlow)">
            <path d="M -80 220 C 320 440, 720 100, 1120 340 C 1320 460, 1500 300, 1620 200" stroke="url(#loginWave1)" strokeWidth="1.2" strokeDasharray="5 5" />
            <path d="M -80 235 C 320 455, 720 115, 1120 355 C 1320 475, 1500 315, 1620 215" stroke="url(#loginWave1)" strokeWidth="1.5" />
            <path d="M -80 250 C 320 470, 720 130, 1120 370 C 1320 490, 1500 330, 1620 230" stroke="url(#loginWave1)" strokeWidth="1.8" />
            <path d="M -80 265 C 320 485, 720 145, 1120 385 C 1320 505, 1500 345, 1620 245" stroke="url(#loginWave1)" strokeWidth="2.2" />
            <path d="M -80 280 C 320 500, 720 160, 1120 400 C 1320 520, 1500 360, 1620 260" stroke="url(#loginWave1)" strokeWidth="2.6" />
            <path d="M -80 295 C 320 515, 720 175, 1120 415 C 1320 535, 1500 375, 1620 275" stroke="url(#loginWave2)" strokeWidth="2.0" />
            <path d="M -80 310 C 320 530, 720 190, 1120 430 C 1320 550, 1500 390, 1620 290" stroke="url(#loginWave2)" strokeWidth="1.5" />
            <path d="M -80 325 C 320 545, 720 205, 1120 445 C 1320 565, 1500 405, 1620 305" stroke="url(#loginWave2)" strokeWidth="1.2" />
          </g>

          {/* Lower harmonic contour band */}
          <g opacity="0.6">
            <path d="M -120 520 C 280 720, 680 360, 1080 600 C 1280 720, 1480 540, 1600 440" stroke="url(#loginWave1)" strokeWidth="1.5" />
            <path d="M -120 535 C 280 735, 680 375, 1080 615 C 1280 735, 1480 555, 1600 455" stroke="url(#loginWave2)" strokeWidth="1.8" />
            <path d="M -120 550 C 280 750, 680 390, 1080 630 C 1280 750, 1480 570, 1600 470" stroke="url(#loginWave2)" strokeWidth="2.2" />
          </g>
        </svg>
      </div>


      {/* ── Top Header Navigation ──────────────────────────────────────────── */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-6 flex items-center justify-between">
        {/* Left: Intel Logo */}
        <Link to="/" className="flex items-center hover:opacity-90 transition-opacity">
          <img
            src={intelLogoImg}
            alt="Intel Logo"
            className="h-7 sm:h-8.5 w-auto object-contain mix-blend-multiply"
          />
        </Link>

        {/* Right: BASCO Logo */}
        <Link to="/" className="flex items-center hover:opacity-90 transition-opacity">
          <img
            src={bascoLogoImg}
            alt="BASCO Logo"
            className="h-7 sm:h-8.5 w-auto object-contain mix-blend-multiply"
          />
        </Link>
      </header>

      {/* ── Main Content: 2-Column Layout ──────────────────────────────────── */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-6 sm:py-8 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* ── Left Column: Overview & Analytics Graphics Backdrop ────────── */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight leading-[1.18]">
                <span className="text-[#111827] block pb-1">
                  Retail Marketing
                </span>
                <span className="bg-gradient-to-r from-[#013FFC] via-[#16D3C3] to-[#7A35F4] bg-clip-text text-transparent inline-block pb-2 -mb-2">
                  Insights
                </span>
              </h1>
              <p className="text-[#6B7280] text-sm sm:text-base mt-4 max-w-md leading-relaxed font-normal">
                Actionable intelligence on retailer marketing performance, creative effectiveness, offers, and product promotion— all in one place.
              </p>
            </div>


            {/* Decorative Vector Graphics matching the mockup (Bar Chart, Line Nodes, Donut & World Dots) */}
            <div className="relative w-full max-w-md h-56 sm:h-64 mt-2 select-none pointer-events-none hidden sm:block">
              
              {/* Bar Chart Illustration */}
              <div className="absolute left-6 bottom-10 flex items-end gap-2.5 opacity-90 z-10">
                <div className="w-4.5 h-16 bg-gradient-to-t from-[#013FFC] to-[#16D3C3] rounded-t-sm shadow-sm" />
                <div className="w-4.5 h-24 bg-gradient-to-t from-[#013FFC] to-[#16D3C3] rounded-t-sm shadow-sm" />
                <div className="w-4.5 h-36 bg-gradient-to-t from-[#013FFC] to-[#16D3C3] rounded-t-sm shadow-sm" />
                <div className="w-4.5 h-28 bg-gradient-to-t from-[#013FFC] to-[#16D3C3] rounded-t-sm shadow-sm" />
              </div>

              {/* Line Trend Curve with Connected Circular Nodes */}
              <svg className="absolute left-16 top-4 w-72 h-36 overflow-visible z-20" viewBox="0 0 280 120">
                <path
                  d="M 10 100 L 70 70 L 130 85 L 190 35 L 250 15"
                  fill="none"
                  stroke="#013FFC"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="10" cy="100" r="4" fill="#013FFC" stroke="#fff" strokeWidth="2" />
                <circle cx="70" cy="70" r="4" fill="#013FFC" stroke="#fff" strokeWidth="2" />
                <circle cx="130" cy="85" r="4" fill="#013FFC" stroke="#fff" strokeWidth="2" />
                <circle cx="190" cy="35" r="4" fill="#013FFC" stroke="#fff" strokeWidth="2" />
                <circle cx="250" cy="15" r="5" fill="#013FFC" stroke="#fff" strokeWidth="2.5" />
              </svg>

              {/* Multi-tone Donut Ring Visual in bottom left */}
              <div className="absolute -left-2 bottom-0 w-24 h-24 rounded-full border-[7px] border-[#16D3C3] border-t-[#7A35F4] border-r-[#013FFC] opacity-85 z-10" />

              {/* World Dots Map Matrix Silhouettes in background */}
              <div className="absolute right-0 bottom-4 w-64 h-36 opacity-35">
                <svg viewBox="0 0 300 150" className="w-full h-full fill-[#013FFC]">
                  <circle cx="30" cy="35" r="3" />
                  <circle cx="45" cy="45" r="2.5" />
                  <circle cx="65" cy="40" r="3.5" />
                  <circle cx="80" cy="60" r="3" />
                  <circle cx="95" cy="80" r="2.5" />
                  <circle cx="120" cy="35" r="3.5" />
                  <circle cx="140" cy="40" r="4" />
                  <circle cx="155" cy="55" r="3" />
                  <circle cx="170" cy="45" r="3.5" />
                  <circle cx="190" cy="65" r="2.5" />
                  <circle cx="210" cy="50" r="4" />
                  <circle cx="230" cy="65" r="3.5" />
                  <circle cx="250" cy="75" r="4" />
                  <circle cx="265" cy="95" r="3" />
                </svg>
              </div>
            </div>
          </div>

          {/* ── Right Column: Login Card ───────────────────────────────────── */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="w-full max-w-[420px] bg-white rounded-3xl shadow-2xl p-8 sm:p-10 border border-[#E5E7EB] relative">
              
              {/* Security Blue Lock Icon in Circular Badge */}
              <div className="w-16 h-16 bg-[#013FFC]/10 text-[#013FFC] rounded-full flex items-center justify-center border border-[#013FFC]/20 shadow-2xs mx-auto mb-5">
                <svg
                  className="w-7 h-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2.5" ry="2.5" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>

              {/* Welcome Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-[26px] font-black text-[#111827] tracking-tight">
                  Welcome back
                </h2>
                <p className="text-xs sm:text-sm text-[#6B7280] mt-1 font-normal">
                  Sign in to access your retail marketing insights.
                </p>
              </div>

              {/* Direct Email & Password Form with Sign In Button */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="name@intel.com"
                    className="w-full bg-[#F8FAFC] text-[#111827] text-sm rounded-xl px-4 py-3 border border-[#E5E7EB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#013FFC] focus:border-transparent font-medium transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full bg-[#F8FAFC] text-[#111827] text-sm rounded-xl px-4 py-3 border border-[#E5E7EB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#013FFC] focus:border-transparent font-medium transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#013FFC] hover:bg-[#0036d9] active:bg-[#002cb3] disabled:opacity-60 text-white text-sm font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#013FFC]/25 transition-all cursor-pointer group mt-2"
                >
                  {loading ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <span className="text-base transition-transform group-hover:translate-x-1">→</span>
                    </>
                  )}
                </button>
              </form>

              {/* Error Banner */}
              {error && (
                <div className="mt-4 p-3.5 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-xs text-[#EF4444] font-semibold leading-snug">
                  {error}
                </div>
              )}

              {/* Secure & Trusted Indicator */}
              <div className="mt-7 pt-6 border-t border-[#E5E7EB] text-center space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <div className="h-px bg-[#CBD5E1] flex-1" />
                  <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                    Secure and trusted
                  </span>
                  <div className="h-px bg-[#CBD5E1] flex-1" />
                </div>

                <div className="flex items-start justify-center gap-2 text-xs text-[#6B7280] text-left">
                  <svg
                    className="w-4 h-4 text-[#6B7280] shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  <span>Access is based on your assigned account and market permissions.</span>
                </div>

                <div className="pt-2">
                  <a
                    href="mailto:support@basco.com"
                    className="text-xs font-semibold text-[#013FFC] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Need help accessing BASCO?</span>
                    <span>&gt;</span>
                  </a>
                </div>
              </div>

            </div>
          </div>

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
            <a href="mailto:support@basco.com" className="hover:text-white text-[#16D3C3] flex items-center gap-1 transition-colors">
              <span>Contact Support</span>
              <span>→</span>
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
