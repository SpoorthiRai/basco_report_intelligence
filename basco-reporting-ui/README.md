# BASCO Intelligence Portal — Frontend

React 18 + TypeScript + Vite frontend for the BASCO Intelligence Portal reporting system.

---

## What this project is

A role-aware reporting UI that connects to the `basco-reporting-api` Django backend.
Users log in with JWT credentials and see reports filtered based on their role (RSM / RMM / ADMIN).

---

## src/ folder responsibilities

| Folder / File | Responsibility |
|---|---|
| `api/client.ts` | Axios instance, auth header injection, silent JWT refresh, redirect on auth failure |
| `api/auth.ts` | `login()`, `getMe()` API call functions |
| `api/reports.ts` | One function per reporting endpoint |
| `types/index.ts` | All TypeScript interfaces — single source of truth for data shapes |
| `store/authStore.ts` | Zustand store: user, tokens, `login()`, `logout()`, `loadFromStorage()` |
| `hooks/useAuth.ts` | Thin wrapper around authStore for clean component imports |
| `hooks/use*.ts` | TanStack Query hooks, one per report endpoint |
| `pages/` | One page component per route. Report pages are shells — charts added later |
| `components/layout/` | `AppLayout` (sidebar + topbar + outlet), `Sidebar`, `TopBar` |
| `components/common/` | `ProtectedRoute`, `RoleGuard`, `LoadingSpinner` |
| `utils/tokenUtils.ts` | `saveTokens()`, `getTokens()`, `clearTokens()` via localStorage |

---

## How to run locally

```bash
# 1. Copy env file
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

Make sure the Django backend (`basco-reporting-api`) is running on port 8000.

---

## How to point at a different backend

Edit `.env`:

```
VITE_API_BASE_URL=https://your-staging-api.example.com
```

Then restart the dev server (`npm run dev`).

---

## Tech stack

| Library | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | latest | Build tool |
| Tailwind CSS | 4 | Styling |
| React Router | 6 | Client-side routing |
| Axios | latest | HTTP client |
| TanStack Query | 5 | Server state / caching |
| Zustand | latest | Client auth state |
