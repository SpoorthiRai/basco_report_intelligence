// Reporting API call functions. Token is attached automatically by the Axios client.

import client from './client'
import type {
  LeagueTableRow,
  MarketMaturityRow,
} from '../types'

export async function getLeagueTable(
  quarter: string = 'Q3 2026',
  region: string = 'All',
): Promise<{
  data: LeagueTableRow[]
  kpis?: Record<string, unknown>
  parent_accounts?: Array<Record<string, unknown>>
  filter_options?: { quarters: string[]; countries: string[]; regions: string[] }
}> {
  const params = new URLSearchParams()
  if (quarter && quarter !== 'All Quarters' && quarter !== 'All') {
    params.set('quarter', quarter)
  }
  if (region && region !== 'All' && region !== 'All Regions') {
    params.set('region', region)
  }
  const qs = params.toString()
  const { data } = await client.get<any>(`/api/reports/league-table/${qs ? `?${qs}` : ''}`)
  if (Array.isArray(data)) {
    return { data }
  }
  return {
    data: Array.isArray(data?.data) ? data.data : [],
    kpis: data?.kpis,
    parent_accounts: Array.isArray(data?.parent_accounts) ? data.parent_accounts : [],
    filter_options: data?.filter_options,
  }
}

export async function getMarketMaturity(
  quarter?: string,
  region?: string,
): Promise<{
  data: MarketMaturityRow[]
  kpis?: { markets_count: number; avg_score: number; markets_at_risk: number; markets_on_track: number }
  filter_options?: { quarters: string[]; regions?: string[] }
}> {
  const params = new URLSearchParams()
  if (quarter && quarter !== 'All Quarters' && quarter !== 'All') {
    params.set('quarter', quarter)
  }
  if (region && region !== 'All' && region !== 'All Regions') {
    params.set('region', region)
  }
  const qs = params.toString()
  const { data } = await client.get<any>(`/api/reports/market-maturity/${qs ? `?${qs}` : ''}`)
  if (Array.isArray(data)) {
    return { data }
  }
  return data || { data: [] }
}
