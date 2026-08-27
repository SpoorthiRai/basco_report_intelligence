// src/App.tsx
// Router setup only. No UI logic here.
// Session rehydration from localStorage happens on mount.

import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useAuthStore } from './store/authStore'
import ProtectedRoute      from './components/common/ProtectedRoute'
import RoleGuard           from './components/common/RoleGuard'
import AppLayout           from './components/layout/AppLayout'

import LandingPage          from './pages/LandingPage'
import LoginPage            from './pages/LoginPage'
import DashboardPage        from './pages/DashboardPage'
import LeagueTablePage      from './pages/LeagueTablePage'
import MarketMaturityPage   from './pages/MarketMaturityPage'
import VisualAdoptionPage   from './pages/VisualAdoptionPage'
import ProductMixPage      from './pages/ProductMixPage'
import CTACampaignPage     from './pages/CTACampaignPage'
import OfferCTAPage        from './pages/OfferCTAPage'

import UserManagementPage   from './pages/admin/UserManagementPage'


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000, // 1 minute
    },
  },
})

export default function App() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage)

  // Rehydrate auth state from localStorage on first render
  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Landing & Login Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected App Routes — wrapped in ProtectedRoute + AppLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard"       element={<DashboardPage />} />
              <Route path="/league-table"    element={<LeagueTablePage />} />
              <Route path="/market-maturity" element={<MarketMaturityPage />} />
              <Route path="/visual-adoption" element={<VisualAdoptionPage />} />
              <Route path="/product-mix"     element={<ProductMixPage />} />
              <Route path="/cta-campaign"    element={<CTACampaignPage />} />
              <Route path="/offer-cta"       element={<OfferCTAPage />} />

              {/* Admin only — RoleGuard redirects RSM/RMM to dashboard */}
              <Route
                path="/admin/users"
                element={
                  <RoleGuard allowedRoles={['ADMIN']} fallback={<Navigate to="/dashboard" replace />}>
                    <UserManagementPage />
                  </RoleGuard>
                }
              />
            </Route>
          </Route>

          {/* Catch-all redirects to Landing Page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
