// src/pages/admin/UserManagementPage.tsx
// ADMIN-only page: full user CRUD — list, create, activate/deactivate.

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import {
  getAdminUsers,
  createUser,
  updateUser,
  deactivateUser,
  type CreateUserPayload,
} from '../../api/admin'
import type { User } from '../../types'
import LoadingSpinner from '../../components/common/LoadingSpinner'

// ── Role badge ─────────────────────────────────────────────────────────────
const roleBadge: Record<string, string> = {
  ADMIN: 'bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20',
  RMM:   'bg-[#0D9488]/10 text-[#0F766E] border border-[#0D9488]/20',
  RSM:   'bg-[#1E429F]/10 text-[#1E429F] border border-[#1E429F]/20',
}

// ── Empty create form state ────────────────────────────────────────────────
const emptyForm = {
  email:        '',
  full_name:    '',
  password:     '',
  role:         'RSM' as CreateUserPayload['role'],
  retailer_ids: '',   // raw comma-separated string
  country:      '',
}

export default function UserManagementPage() {
  const qc      = useQueryClient()
  const me      = useAuthStore((s) => s.user)

  // ── Fetch user list ──────────────────────────────────────────────────────
  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['admin-users'],
    queryFn:  getAdminUsers,
  })

  // ── Mutations ────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-users'] })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess:  () => { invalidate(); setShowForm(false); setSuccess('User created successfully.'); setFormError(null) },
    onError:    (e: any) => setFormError(e?.response?.data?.detail ?? JSON.stringify(e?.response?.data) ?? 'Failed to create user.'),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => deactivateUser(id),
    onSuccess:  invalidate,
  })

  const activateMutation = useMutation({
    mutationFn: (id: number) => updateUser(id, { is_active: true }),
    onSuccess:  invalidate,
  })

  // ── Inline form state ─────────────────────────────────────────────────────
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)

  function handleField(key: keyof typeof emptyForm, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
    setFormError(null)
    setSuccess(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: CreateUserPayload = {
      email:        form.email.trim(),
      full_name:    form.full_name.trim(),
      password:     form.password,
      role:         form.role,
      retailer_ids: form.role === 'RSM'
        ? form.retailer_ids.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      country: form.role === 'RMM' ? form.country.trim() : '',
    }
    createMutation.mutate(payload)
  }

  function cancelForm() {
    setShowForm(false)
    setForm(emptyForm)
    setFormError(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const activeCount = users.filter((u: User) => u.is_active).length;
  const inactiveCount = users.length - activeCount;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header & Top Telemetry Summary ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black text-[#111827] tracking-tight">
              User Management &{" "}
              <span className="bg-gradient-to-r from-[#1E429F] via-[#0D9488] to-[#6366F1] bg-clip-text text-transparent inline-block">
                Access Control
              </span>
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20 shadow-2xs">
              Admin Console
            </span>
          </div>
          <p className="text-xs md:text-sm text-[#6B7280] mt-1">
            Provision portal user roles, manage regional scoping, and oversee account access privileges.
          </p>
        </div>

        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setSuccess(null) }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#1E429F] to-[#4A6FA5] hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-900/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <span>+ Add New User</span>
          </button>
        )}
      </div>

      {/* ── Quick Telemetry Summary Cards ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/95 border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Total Accounts</span>
            <span className="text-2xl font-black text-[#111827] mt-0.5 block">{users.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#1E429F]/10 text-[#1E429F] flex items-center justify-center font-bold text-base shadow-2xs">
            👥
          </div>
        </div>

        <div className="bg-white/95 border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider block">Active Users</span>
            <span className="text-2xl font-black text-[#10B981] mt-0.5 block">{activeCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center font-bold text-base shadow-2xs">
            ✓
          </div>
        </div>

        <div className="bg-white/95 border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Inactive Accounts</span>
            <span className="text-2xl font-black text-[#6B7280] mt-0.5 block">{inactiveCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#6B7280] flex items-center justify-center font-bold text-base shadow-2xs">
            ⏸
          </div>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-[#10B981] font-bold shadow-2xs flex items-center justify-between">
          <span>✓ {success}</span>
          <button onClick={() => setSuccess(null)} className="text-emerald-900 font-bold text-xs cursor-pointer">✕</button>
        </div>
      )}


      {/* ── Inline create form ───────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#E5E7EB]">
            <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Create New User Account</h2>
            <button onClick={cancelForm} className="text-[#6B7280] hover:text-[#111827] font-bold text-xs cursor-pointer">✕ Close</button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <label className="text-xs font-bold text-[#111827] block mb-1">Email Address</label>
              <input
                type="email" required
                value={form.email}
                onChange={(e) => handleField('email', e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1E429F] font-medium"
                placeholder="user@company.com"
              />
            </div>

            {/* Full name */}
            <div>
              <label className="text-xs font-bold text-[#111827] block mb-1">Full Name</label>
              <input
                type="text" required
                value={form.full_name}
                onChange={(e) => handleField('full_name', e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1E429F] font-medium"
                placeholder="Jane Smith"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-bold text-[#111827] block mb-1">Temporary Password</label>
              <input
                type="password" required
                value={form.password}
                onChange={(e) => handleField('password', e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1E429F] font-medium"
                placeholder="••••••••"
              />
            </div>

            {/* Role */}
            <div>
              <label className="text-xs font-bold text-[#111827] block mb-1">Assigned Role</label>
              <select
                value={form.role}
                onChange={(e) => handleField('role', e.target.value as CreateUserPayload['role'])}
                className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1E429F] font-bold text-[#111827]"
              >
                <option value="RSM">RSM (Retail Sales Manager)</option>
                <option value="RMM">RMM (Regional Marketing Manager)</option>
                <option value="ADMIN">ADMIN (System Administrator)</option>
              </select>
            </div>

            {/* Conditional: Retailer IDs (RSM only) */}
            {form.role === 'RSM' && (
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-[#111827] block mb-1">
                  Scoped Retailer IDs <span className="text-[#6B7280] font-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={form.retailer_ids}
                  onChange={(e) => handleField('retailer_ids', e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1E429F] font-medium"
                  placeholder="e.g. Best Buy, Currys, MediaMarkt"
                />
              </div>
            )}

            {/* Conditional: Country (RMM only) */}
            {form.role === 'RMM' && (
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-[#111827] block mb-1">Assigned Country</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => handleField('country', e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1E429F] font-medium"
                  placeholder="e.g. United States, Germany, India"
                />
              </div>
            )}

            {/* Form error */}
            {formError && (
              <div className="sm:col-span-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs text-rose-700 font-bold">
                ⚠️ {formError}
              </div>
            )}

            {/* Actions */}
            <div className="sm:col-span-2 flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-5 py-2.5 bg-gradient-to-r from-[#1E429F] to-[#4A6FA5] hover:opacity-95 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                {createMutation.isPending ? 'Provisioning…' : 'Create User Account'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2.5 bg-[#F8FAFC] border border-[#E5E7EB] hover:bg-slate-200/70 text-[#111827] text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Users table ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 font-bold shadow-2xs">
          Could not load users list. Please check backend service status.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
              <tr>
                {['User Profile', 'Email', 'Role', 'Status', 'Scoped Retailers', 'Country', 'Actions'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3.5 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#6B7280] text-xs font-medium">
                    No users registered in the database.
                  </td>
                </tr>
              ) : (
                users.map((u: User) => (
                  <tr key={u.id} className="hover:bg-[#1E429F]/5 transition-colors">
                    {/* User Profile */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#1E429F] to-[#0D9488] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {u.full_name?.charAt(0) || u.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-[#111827]">{u.full_name || 'Anonymous'}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3.5 text-[#6B7280] font-medium">{u.email}</td>

                    {/* Role badge */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          roleBadge[u.role] ?? 'bg-slate-100 text-[#6B7280]'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          u.is_active
                            ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20'
                            : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                        <span>{u.is_active ? 'Active' : 'Inactive'}</span>
                      </span>
                    </td>

                    {/* Retailer IDs */}
                    <td className="px-4 py-3.5 text-[#6B7280] max-w-[180px] truncate font-medium">
                      {u.retailer_ids?.length ? u.retailer_ids.join(', ') : 'All Accounts'}
                    </td>

                    {/* Country */}
                    <td className="px-4 py-3.5 text-[#6B7280] font-medium">{u.country || 'Global'}</td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      {u.is_active && u.id !== me?.id ? (
                        <button
                          onClick={() => deactivateMutation.mutate(u.id)}
                          disabled={deactivateMutation.isPending}
                          className="text-xs font-bold text-[#EF4444] hover:text-[#EF4444]/80 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          Deactivate
                        </button>
                      ) : !u.is_active ? (
                        <button
                          onClick={() => activateMutation.mutate(u.id)}
                          disabled={activateMutation.isPending}
                          className="text-xs font-bold text-[#10B981] hover:text-[#10B981]/80 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          Activate
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Current User</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

