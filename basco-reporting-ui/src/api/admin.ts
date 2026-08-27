// src/api/admin.ts
// Admin API functions for portal user management.
// All routes require ADMIN role — enforced by the backend.

import client from './client'
import type { User } from '../types'

export async function getAdminUsers(): Promise<User[]> {
  const { data } = await client.get<User[]>('/api/admin/users/')
  return data
}

export interface CreateUserPayload {
  email: string
  full_name: string
  password: string
  role: 'RSM' | 'RMM' | 'ADMIN'
  retailer_ids?: string[]
  country?: string
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const { data } = await client.post<User>('/api/admin/users/create/', payload)
  return data
}

export interface UpdateUserPayload {
  full_name?: string
  role?: 'RSM' | 'RMM' | 'ADMIN'
  retailer_ids?: string[]
  country?: string
  is_active?: boolean
}

export async function updateUser(id: number, payload: UpdateUserPayload): Promise<User> {
  const { data } = await client.patch<User>(`/api/admin/users/${id}/update/`, payload)
  return data
}

export async function deactivateUser(id: number): Promise<void> {
  await client.delete(`/api/admin/users/${id}/deactivate/`)
}
