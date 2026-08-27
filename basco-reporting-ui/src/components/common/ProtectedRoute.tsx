// src/components/common/ProtectedRoute.tsx
// Redirects unauthenticated users to /login.
// Wrap all authenticated routes with this component.

import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
