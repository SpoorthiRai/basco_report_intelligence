// src/hooks/useCtaMix.ts
import { useQuery } from '@tanstack/react-query'
import { getCtaMix } from '../api/reports'

export function useCtaMix() {
  return useQuery({
    queryKey: ['cta-mix'],
    queryFn: getCtaMix,
  })
}
