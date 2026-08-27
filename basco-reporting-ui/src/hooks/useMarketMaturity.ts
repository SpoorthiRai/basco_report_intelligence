// src/hooks/useMarketMaturity.ts
import { useQuery } from '@tanstack/react-query'
import { getMarketMaturity } from '../api/reports'

export function useMarketMaturity(quarter?: string) {
  return useQuery({
    queryKey: ['market-maturity', quarter || 'All Quarters'],
    queryFn: () => getMarketMaturity(quarter),
  })
}

