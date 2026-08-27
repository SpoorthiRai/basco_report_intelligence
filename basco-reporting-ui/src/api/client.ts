// src/api/client.ts
// Axios instance for all API calls.
// Handles auth headers, token refresh, and redirect on auth failure.

import axios from 'axios'
import { getTokens, saveTokens, clearTokens } from '../utils/tokenUtils'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8002',
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach access token ─────────────────────────────────
client.interceptors.request.use((config) => {
  const tokens = getTokens()
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`
  }
  return config
})

// ── Response interceptor: transparent token refresh ──────────────────────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login/') ||
      originalRequest.url?.includes('/auth/token/refresh/')

    if (error.response?.status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue subsequent 401s while a refresh is already in-flight
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return client(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const tokens = getTokens()
      if (!tokens?.refresh) {
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/api/auth/token/refresh/`,
          { refresh: tokens.refresh },
          { headers: { 'Content-Type': 'application/json' } },
        )
        const newTokens = { access: data.access, refresh: data.refresh ?? tokens.refresh }
        saveTokens(newTokens)
        processQueue(null, newTokens.access)
        originalRequest.headers.Authorization = `Bearer ${newTokens.access}`
        return client(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default client
