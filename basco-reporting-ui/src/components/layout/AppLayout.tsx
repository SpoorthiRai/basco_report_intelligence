// src/components/layout/AppLayout.tsx
// Authenticated shell: Sidebar (left) + TopBar (top) + <Outlet/> (content area).
// All protected pages render inside the <Outlet/>.

import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f8fe] text-slate-900 font-sans relative">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-gradient-to-bl from-blue-200/30 via-purple-100/20 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-[20%] w-[35%] h-[35%] bg-gradient-to-tr from-cyan-100/30 via-blue-100/20 to-transparent rounded-full blur-3xl pointer-events-none" />

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

