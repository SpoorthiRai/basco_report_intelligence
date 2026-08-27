// src/hooks/useVisualAdoption.ts
import { useQuery } from '@tanstack/react-query'
import { getVisualAdoption } from '../api/reports'

export function useVisualAdoption() {
  return useQuery({
    queryKey: ['visual-adoption'],
    queryFn: getVisualAdoption,
  })
}
