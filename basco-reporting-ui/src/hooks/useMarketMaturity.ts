import { useQuery } from '@tanstack/react-query'
import { getMarketMaturity } from '../api/reports'

export function useMarketMaturity(quarter?: string, region?: string) {
  return useQuery({
    queryKey: ['market-maturity-v7', quarter || 'All Quarters', region || 'All'],
    queryFn: () => getMarketMaturity(quarter, region),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}
