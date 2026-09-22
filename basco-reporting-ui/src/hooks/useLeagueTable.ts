import { useQuery } from '@tanstack/react-query'
import { getLeagueTable } from '../api/reports'

export function useLeagueTable(quarter: string = 'Q3 2026', region: string = 'All') {
  return useQuery({
    queryKey: ['league-table-v2', quarter, region],
    queryFn: () => getLeagueTable(quarter, region),
  })
}
