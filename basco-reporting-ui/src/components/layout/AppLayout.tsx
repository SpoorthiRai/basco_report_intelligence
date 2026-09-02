// src/components/layout/AppLayout.tsx
// Authenticated shell: Sidebar (left) + TopBar (top) + <Outlet/> (content area).
// All protected pages render inside the <Outlet/>.

import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] text-[#111827] font-sans relative">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-gradient-to-bl from-[#1E429F]/5 via-[#6366F1]/3 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-[20%] w-[35%] h-[35%] bg-gradient-to-tr from-[#0D9488]/6 via-[#1E429F]/3 to-transparent rounded-full blur-3xl pointer-events-none" />

      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative z-10">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-5 sm:p-7 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

