// src/hooks/useAuth.ts
// Thin wrapper around authStore to keep component imports clean.

import { useAuthStore } from '../store/authStore'

export function useAuth() {
  return useAuthStore((s) => ({
    user: s.user,
    tokens: s.tokens,
    isAuthenticated: s.isAuthenticated,
    login: s.login,
    logout: s.logout,
    loadFromStorage: s.loadFromStorage,
  }))
}
