// src/utils/tokenUtils.ts
// Token persistence helpers using localStorage.
// Kept isolated so swapping to sessionStorage or a cookie is a one-file change.

import type { AuthTokens } from '../types'

const STORAGE_KEY = 'basco_tokens'

export function saveTokens(tokens: AuthTokens): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export function getTokens(): AuthTokens | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthTokens
  } catch {
    return null
  }
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEY)
}
