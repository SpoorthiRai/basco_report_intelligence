// src/components/charts/ChartWrapper.tsx
// Shared wrapper for all report charts.
// Renders a consistent title and wraps children in a full-width ResponsiveContainer.

import { ResponsiveContainer } from 'recharts'
import type { ReactNode } from 'react'

interface ChartWrapperProps {
  title: string
  children: ReactNode
  height?: number
}

export default function ChartWrapper({ title, children, height = 320 }: ChartWrapperProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 mt-6">
      <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-4">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  )
}
