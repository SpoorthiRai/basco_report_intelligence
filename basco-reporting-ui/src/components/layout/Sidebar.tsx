// src/components/layout/Sidebar.tsx
// Navigation sidebar with role-aware admin section, custom SVG page icons, and active indicator glows.

import React from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import RoleGuard from '../common/RoleGuard'
import bascoLogoImg from '../../assets/basco-logo.jpeg'
import intelLogoImg from '../../assets/intel-logo.png'

// ── Custom Modern SVG Icons for Each Portal Page ─────────────────────────────────
function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1.5" />
      <rect width="7" height="5" x="14" y="3" rx="1.5" />
      <rect width="7" height="9" x="14" y="12" rx="1.5" />
      <rect width="7" height="5" x="3" y="16" rx="1.5" />
    </svg>
  )
}

function LeagueTableIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
      <path d="M6 4h12v5c0 3.31-2.69 6-6 6s-6-2.69-6-6V4Z" />
    </svg>
  )
}

function MarketMaturityIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 3 0 18 18 0" />
      <circle cx="9" cy="14" r="2.5" fill="currentColor" fillOpacity="0.2" />
      <circle cx="15" cy="8" r="3.5" fill="currentColor" fillOpacity="0.25" />
      <circle cx="18" cy="15" r="1.5" fill="currentColor" fillOpacity="0.2" />
      <path d="m7 16 5-6 4 3 3-5" />
    </svg>
  )
}

function VisualAdoptionIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}

function ProductMixIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  )
}

function CTACampaignIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  )
}

function OfferCTAIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" strokeWidth="3" />
    </svg>
  )
}

function UserManagementIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

interface NavItemDef {
  label: string
  to: string
  Icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItemDef[] = [
  { label: 'Overview',               to: '/dashboard',       Icon: DashboardIcon },
  { label: 'Retailer Performance',   to: '/league-table',    Icon: LeagueTableIcon },
  { label: 'Market Priorities',      to: '/market-maturity', Icon: MarketMaturityIcon },
  { label: 'Intel Visual Adoption',  to: '/visual-adoption', Icon: VisualAdoptionIcon },
  { label: 'Product Priorities',     to: '/product-mix',     Icon: ProductMixIcon },
  { label: 'Campaign Effectiveness', to: '/cta-campaign',    Icon: CTACampaignIcon },
  { label: 'Promotional Effectiveness', to: '/offer-cta',     Icon: OfferCTAIcon },
]

const linkBase =
  'group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 relative overflow-hidden'
const linkActive  =
  'bg-gradient-to-r from-[#0062d2] via-[#0284c7] to-[#2563eb] text-white shadow-md shadow-blue-500/25 font-bold'
const linkInactive =
  'text-slate-400 hover:bg-white/5 hover:text-white'

export default function Sidebar() {
  const user = useAuthStore((s) => s.user)

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-gradient-to-b from-[#071739] via-[#061226] to-[#040c1a] border-r border-slate-800/80 shrink-0 select-none">
      {/* ── Co-Branded Header: Intel Logo then BASCO Logo ──────────── */}
      <div className="px-4 py-4 border-b border-slate-800/80 flex items-center justify-start">
        <Link to="/dashboard" className="flex items-center gap-2.5 bg-white/95 hover:bg-white px-3 py-1.5 rounded-xl shadow-md shadow-black/20 group hover:scale-102 transition-all">
          <img src={intelLogoImg} alt="Intel" className="h-4.5 w-auto object-contain mix-blend-multiply" />
          <div className="h-3.5 w-px bg-slate-300" />
          <img src={bascoLogoImg} alt="BASCO" className="h-4.5 w-auto object-contain mix-blend-multiply" />
        </Link>
      </div>

      {/* ── Main nav ──────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        <p className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Reports & Analytics
        </p>
        {navItems.map(({ label, to, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`w-4.5 h-4.5 transition-colors shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-cyan-300'
                  }`}
                />
                <span className="truncate">{label}</span>
                {isActive && (
                  <span className="absolute right-0 top-2 bottom-2 w-1 bg-cyan-300 rounded-l-full shadow-sm" />
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* ── Admin section (ADMIN only) ─────────────────────────── */}
        <RoleGuard allowedRoles={['ADMIN']}>
          <div className="pt-4 mt-3 border-t border-slate-800/60">
            <p className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Administration
            </p>
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              {({ isActive }) => (
                <>
                  <UserManagementIcon
                    className={`w-4.5 h-4.5 transition-colors shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-purple-300'
                    }`}
                  />
                  <span className="truncate">User Management</span>
                  {isActive && (
                    <span className="absolute right-0 top-2 bottom-2 w-1 bg-purple-300 rounded-l-full shadow-sm" />
                  )}
                </>
              )}
            </NavLink>
          </div>
        </RoleGuard>
      </nav>

      {/* ── Bottom: logged-in user profile pill ─────────────────────── */}
      {user && (
        <div className="p-3.5 border-t border-slate-800/80 bg-black/25">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
              {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">{user.full_name || 'User'}</p>
              <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}


