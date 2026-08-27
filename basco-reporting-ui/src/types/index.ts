// src/types/index.ts
// All TypeScript interfaces for the BASCO Intelligence Portal.
// These match the backend response shapes exactly.

export interface User {
  id: number
  email: string
  full_name: string
  role: 'RSM' | 'RMM' | 'ADMIN'
  retailer_ids: string[]
  country: string
  region?: string
  is_active: boolean
  date_joined: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface LoginResponse {
  access: string
  refresh: string
  user: User
}

export interface LeagueTableRow {
  retailer_name: string
  basco_score: number
  fmv_at_risk: number
  helpdesk_queries: number
}

export interface MarketMaturityRow {
  country: string
  region: string
  total_jobs: number
  avg_basco_score: number
  total_violations: number
  fmv?: number
  attr_loss?: number
}

export interface MarketMaturityResponse {
  data: MarketMaturityRow[]
  filter_options?: {
    quarters: string[]
  }
}


export interface VisualAdoptionRow {
  retailer_name: string
  visual_type: string
  usage_count: number
}

export interface CtaMixRow {
  campaign_type: string
  cta_type: string
  count: number
}
