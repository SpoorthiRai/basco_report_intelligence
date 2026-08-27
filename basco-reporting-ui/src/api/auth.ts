// src/api/auth.ts
// Auth API call functions. Use the shared Axios client (token attached automatically).

import client from './client'
import type { LoginResponse, User } from '../types'

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await client.post<LoginResponse>('/api/auth/login/', { email, password })
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await client.get<User>('/api/auth/me/')
  return data
}
