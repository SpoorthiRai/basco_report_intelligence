import { create } from 'zustand'
import { pickValidOption } from '../utils/cascadingFilters'

interface OverviewFiltersState {
  quarter: string
  region: string
  quarters: string[]
  regions: string[]
  defaultQuarter: string
  initialized: boolean
  setQuarter: (quarter: string) => void
  setRegion: (region: string) => void
  clearFilters: () => void
  setOptions: (opts: { quarters?: string[]; regions?: string[]; defaultQuarter?: string }) => void
}

export const useOverviewFilters = create<OverviewFiltersState>((set) => ({
  quarter: '',
  region: 'All',
  quarters: ['All Quarters'],
  regions: ['All'],
  defaultQuarter: '',
  initialized: false,
  setQuarter: (quarter) => set({ quarter, region: 'All', initialized: true }),
  setRegion: (region) => set({ region }),
  clearFilters: () =>
    set((state) => ({
      quarter: state.defaultQuarter || state.quarters.find((q) => q !== 'All Quarters') || 'All Quarters',
      region: 'All',
      initialized: true,
    })),
  setOptions: (opts) =>
    set((state) => {
      const quarters = opts.quarters?.length ? opts.quarters : state.quarters
      const regions = opts.regions?.length ? opts.regions : state.regions
      const defaultQuarter = opts.defaultQuarter || state.defaultQuarter
      let quarter = state.quarter
      if (!state.initialized && defaultQuarter) {
        quarter = defaultQuarter
      } else if (quarter && !quarters.includes(quarter) && defaultQuarter) {
        quarter = defaultQuarter
      } else {
        quarter = pickValidOption(quarter, quarters, defaultQuarter || 'All Quarters')
      }
      const region = pickValidOption(state.region, regions, 'All')
      return {
        quarters,
        regions,
        defaultQuarter,
        quarter,
        region,
        initialized: state.initialized || Boolean(defaultQuarter || quarter),
      }
    }),
}))
