// src/api/reports.ts
// Reporting API call functions. Token is attached automatically by the Axios client.

import client from './client'
import type {
  CtaMixRow,
  LeagueTableRow,
  MarketMaturityRow,
  VisualAdoptionRow,
} from '../types'

export async function getLeagueTable(quarter: string = 'Q3 2026'): Promise<LeagueTableRow[]> {
  const query = quarter && quarter !== 'All Quarters' && quarter !== 'All' ? `?quarter=${encodeURIComponent(quarter)}` : ''
  const { data } = await client.get<any>(`/api/reports/league-table/${query}`)
  if (Array.isArray(data)) {
    return data
  }
  if (data && Array.isArray(data.data)) {
    return data.data
  }
  return []
}

export async function getMarketMaturity(quarter?: string): Promise<{ data: MarketMaturityRow[]; filter_options?: { quarters: string[] } }> {
  const query = quarter && quarter !== 'All Quarters' && quarter !== 'All' ? `?quarter=${encodeURIComponent(quarter)}` : ''
  const { data } = await client.get<any>(`/api/reports/market-maturity/${query}`)
  if (Array.isArray(data)) {
    return { data }
  }
  return data || { data: [] }
}


export async function getVisualAdoption(): Promise<VisualAdoptionRow[]> {
  const { data } = await client.get<VisualAdoptionRow[]>('/api/reports/visual-adoption/')
  return data
}

export async function getCtaMix(): Promise<CtaMixRow[]> {
  const { data } = await client.get<CtaMixRow[]>('/api/reports/cta-mix/')
  return data
}
