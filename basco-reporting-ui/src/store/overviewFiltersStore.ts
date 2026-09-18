import { create } from 'zustand'

interface OverviewFiltersState {
  quarter: string
  region: string
  quarters: string[]
  regions: string[]
  initialized: boolean
  setQuarter: (quarter: string) => void
  setRegion: (region: string) => void
  setOptions: (opts: { quarters?: string[]; regions?: string[]; defaultQuarter?: string }) => void
}

export const useOverviewFilters = create<OverviewFiltersState>((set) => ({
  quarter: '',
  region: 'All',
  quarters: ['All Quarters'],
  regions: ['All'],
  initialized: false,
  setQuarter: (quarter) => set({ quarter, initialized: true }),
  setRegion: (region) => set({ region }),
  setOptions: (opts) =>
    set((state) => {
      const quarters = opts.quarters?.length ? opts.quarters : state.quarters
      const regions = opts.regions?.length ? opts.regions : state.regions
      let quarter = state.quarter
      if (!state.initialized && opts.defaultQuarter) {
        quarter = opts.defaultQuarter
      } else if (quarter && !quarters.includes(quarter) && opts.defaultQuarter) {
        quarter = opts.defaultQuarter
      }
      return {
        quarters,
        regions,
        quarter,
        initialized: state.initialized || Boolean(opts.defaultQuarter || quarter),
      }
    }),
}))
