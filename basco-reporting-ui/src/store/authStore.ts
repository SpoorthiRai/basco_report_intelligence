// src/store/authStore.ts
// Zustand store for authentication state.
// Single source of truth for user, tokens, and auth status.

import { create } from 'zustand'
import { login as apiLogin, getMe } from '../api/auth'
import { saveTokens, getTokens, clearTokens } from '../utils/tokenUtils'
import type { User, AuthTokens } from '../types'

interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean

  // Actions
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loadFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,

  login: async (email, password) => {
    const response = await apiLogin(email, password)
    const tokens: AuthTokens = { access: response.access, refresh: response.refresh }
    saveTokens(tokens)
    set({ user: response.user, tokens, isAuthenticated: true })
  },

  logout: () => {
    clearTokens()
    set({ user: null, tokens: null, isAuthenticated: false })
    window.location.href = '/login'
  },

  loadFromStorage: async () => {
    const tokens = getTokens()
    if (!tokens?.access) return
    try {
      const user = await getMe()
      set({ user, tokens, isAuthenticated: true })
    } catch {
      // Token is expired or invalid — wipe storage silently
      clearTokens()
      set({ user: null, tokens: null, isAuthenticated: false })
    }
  },
}))
