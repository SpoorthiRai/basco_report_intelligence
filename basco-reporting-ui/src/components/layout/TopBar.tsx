// src/components/layout/TopBar.tsx
// Top navigation bar: portal name left, Overview filters + user info + logout right.

import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useOverviewFilters } from '../../store/overviewFiltersStore'
import ClearFiltersButton from '../common/ClearFiltersButton'
import { filtersAreActive } from '../../utils/cascadingFilters'

const roleBadge: Record<string, string> = {
  ADMIN: 'bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/25 shadow-2xs',
  RMM:   'bg-[#0D9488]/15 text-[#0F766E] border border-[#0D9488]/30 shadow-2xs',
  RSM:   'bg-[#1E429F]/10 text-[#1E429F] border border-[#1E429F]/25 shadow-2xs',
}

const selectClass =
  'text-xs font-bold text-[#111827] bg-white border border-[#E5E7EB] rounded-lg px-2 py-1.5 pr-7 max-w-[10.5rem] focus:outline-none focus:ring-2 focus:ring-[#1E429F]/20 focus:border-[#1E429F]'

export default function TopBar() {
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()
  const isOverview = location.pathname === '/dashboard'

  const quarter = useOverviewFilters((s) => s.quarter)
  const region = useOverviewFilters((s) => s.region)
  const quarters = useOverviewFilters((s) => s.quarters)
  const regions = useOverviewFilters((s) => s.regions)
  const defaultQuarter = useOverviewFilters((s) => s.defaultQuarter)
  const setQuarter = useOverviewFilters((s) => s.setQuarter)
  const setRegion = useOverviewFilters((s) => s.setRegion)
  const clearFilters = useOverviewFilters((s) => s.clearFilters)
  const filtersActive =
    filtersAreActive([region], ['All', 'All Regions']) ||
    Boolean(quarter && defaultQuarter && quarter !== defaultQuarter)

  return (
    <header className="flex items-center justify-between h-14 px-6 bg-white/90 backdrop-blur-md border-b border-[#E5E7EB] shrink-0 z-20">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[#111827] tracking-tight">
          Retail Marketing Insights
        </span>
      </div>

      <div className="flex items-center gap-3.5">
        {isOverview && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider hidden sm:inline">
                Quarter
              </span>
              <select
                aria-label="Quarter"
                value={quarters.includes(quarter) ? quarter : (quarters.find((q) => q !== 'All Quarters') || quarters[0] || '')}
                onChange={(e) => setQuarter(e.target.value)}
                className={selectClass}
              >
                {(quarters.includes(quarter) ? quarters : [quarter, ...quarters]).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider hidden sm:inline">
                Region
              </span>
              <select
                aria-label="Region"
                value={regions.includes(region) ? region : (regions[0] || 'All')}
                onChange={(e) => setRegion(e.target.value)}
                className={selectClass}
              >
                {regions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'All' ? 'All Regions' : option}
                  </option>
                ))}
              </select>
            </label>
            <ClearFiltersButton onClear={clearFilters} disabled={!filtersActive} />
            <div className="w-px h-4 bg-[#CBD5E1] mx-0.5 hidden sm:block" />
          </div>
        )}
        {user && (
          <div className="flex items-center gap-2.5">
            <span
              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                roleBadge[user.role] ?? 'bg-slate-100 text-slate-700'
              }`}
            >
              {user.role}
              {user.region ? ` • ${user.region}` : user.country ? ` • ${user.country}` : ''}
            </span>
            <span className="text-xs font-bold text-[#111827] hidden sm:inline-block">
              {user.full_name || user.email}
            </span>
            <div className="w-px h-4 bg-[#CBD5E1] mx-1 hidden sm:block" />
          </div>
        )}
        <button
          onClick={logout}
          className="text-xs font-bold text-[#6B7280] hover:text-[#EF4444] px-2.5 py-1 rounded-lg hover:bg-[#EF4444]/10 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>Sign out</span>
          <span>→</span>
        </button>
      </div>
    </header>
  )
}
