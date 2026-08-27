// src/components/common/RoleGuard.tsx
// Renders children only if the current user's role is in allowedRoles.
// Renders fallback (or null) otherwise — the parent decides the fallback.

import type { ReactNode } from 'react'
import { useAuthStore } from '../../store/authStore'
import type { User } from '../../types'

interface RoleGuardProps {
  allowedRoles: Array<User['role']>
  children: ReactNode
  fallback?: ReactNode
}

export default function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user)
  if (!user || !allowedRoles.includes(user.role)) return <>{fallback}</>
  return <>{children}</>
}
