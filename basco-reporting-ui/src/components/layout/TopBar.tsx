// src/components/layout/TopBar.tsx
// Top navigation bar: portal name left, user info + logout right.

import { useAuthStore } from '../../store/authStore'

const roleBadge: Record<string, string> = {
  ADMIN: 'bg-[#7A35F4]/10 text-[#7A35F4] border border-[#7A35F4]/25 shadow-2xs',
  RMM:   'bg-[#16D3C3]/15 text-[#0d7d74] border border-[#16D3C3]/30 shadow-2xs',
  RSM:   'bg-[#013FFC]/10 text-[#013FFC] border border-[#013FFC]/25 shadow-2xs',
}

export default function TopBar() {
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <header className="flex items-center justify-between h-14 px-6 bg-white/90 backdrop-blur-md border-b border-[#E5E7EB] shrink-0 z-20">
      {/* Left: Section Indicator */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[#111827] tracking-tight">
          Retail Marketing Insights
        </span>
      </div>

      {/* Right: role badge + name + logout */}
      <div className="flex items-center gap-3.5">
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

