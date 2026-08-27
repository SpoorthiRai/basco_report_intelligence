// src/hooks/useLeagueTable.ts
import { useQuery } from '@tanstack/react-query'
import { getLeagueTable } from '../api/reports'

export function useLeagueTable(quarter: string = 'Q3 2026') {
  return useQuery({
    queryKey: ['league-table', quarter],
    queryFn: () => getLeagueTable(quarter),
  })
}
