// src/pages/CtaMixPage.tsx
// CTA Mix — pie chart by campaign type + data table.

import {
  PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts'
import { useCtaMix } from '../hooks/useCtaMix'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ChartWrapper from '../components/charts/ChartWrapper'
import type { CtaMixRow } from '../types'

const PIE_COLORS = [
  '#2563eb', '#16a34a', '#d97706', '#9333ea',
  '#0891b2', '#e11d48', '#78716c', '#0d9488',
]

// ── Aggregate count by campaign_type ──────────────────────────────────────
function aggregateByCampaign(rows: CtaMixRow[]) {
  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(row.campaign_type, (map.get(row.campaign_type) ?? 0) + row.count)
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }))
}

// ── Custom label ─────────────────────────────────────────────────────────
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.04) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function CtaMixPage() {
  const { data, isLoading, isError } = useCtaMix()

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CTA Mix</h1>
        <p className="text-gray-500 mt-1">Campaign type and CTA breakdown across all creatives.</p>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 font-medium">
          Could not load CTA mix data. Please try again.
        </div>
      ) : !data?.length ? (
        <p className="text-center text-gray-400 py-16">No data available for your account.</p>
      ) : (
        <>
          {/* ── Table ─────────────────────────────────────────────── */}
          <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Campaign Type', 'CTA Type', 'Count'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row: CtaMixRow, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-800">{row.campaign_type}</td>
                    <td className="px-4 py-3 text-gray-700">{row.cta_type}</td>
                    <td className="px-4 py-3 text-gray-700">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Chart ─────────────────────────────────────────────── */}
          <ChartWrapper title="Campaign Type Distribution" height={360}>
            <PieChart>
              <Pie
                data={aggregateByCampaign(data)}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={130}
                labelLine={false}
                label={<PieLabel />}
              >
                {aggregateByCampaign(data).map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: any, name: any) => [v, name]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ChartWrapper>
        </>
      )}
    </div>
  )
}
