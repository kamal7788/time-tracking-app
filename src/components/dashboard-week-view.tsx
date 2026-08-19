'use client'

import { formatStoredTime, formatDuration, entryDateKey, toLocalDateInputValue } from '@/lib/utils'
import { ClockIcon } from '@/components/ui/icons'

interface DashboardWeekViewProps {
  weekDates: Date[]
  entriesByDay: Map<string, Array<{
    id: string
    date: string
    startTime: string
    endTime: string
    duration: number
    description: string | null
    status: string
    project: {
      name: string
      client: { name: string }
    }
  }>>
  dayTotals: Map<string, number>
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getStatusClasses(status: string) {
  switch (status) {
    case 'DRAFT': return 'bg-slate-100 text-slate-600'
    case 'SUBMITTED': return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
    case 'APPROVED': return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
    case 'REJECTED': return 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-200'
    default: return 'bg-slate-100 text-slate-600'
  }
}

export default function DashboardWeekView({ weekDates, entriesByDay, dayTotals }: DashboardWeekViewProps) {
  // Compare against the local calendar day, not UTC
  const today = toLocalDateInputValue(new Date())

  // Render as many rows as the busiest day needs — no silent truncation
  const maxRows = Math.max(1, ...weekDates.map((d) => (entriesByDay.get(entryDateKey(d)) || []).length))

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-navy">Weekly Time Log</h2>
        <div className="flex items-center gap-2">
          {['DRAFT', 'SUBMITTED', 'APPROVED'].map((status) => (
            <span key={status} className={`text-xs font-medium px-2 py-1 rounded-md ${getStatusClasses(status)}`}>
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="table-header">
              {weekDates.map((date) => {
                const dateStr = entryDateKey(date)
                const isToday = dateStr === today
                return (
                  <th key={dateStr} className="px-3 py-3 text-center" scope="col">
                    <div className="flex flex-col items-center">
                      <span className={`text-xs font-semibold ${isToday ? 'text-brand-blue' : 'text-brand-gray'}`}>
                        {dayNames[date.getDay()]}
                      </span>
                      <span
                        className={`text-base font-semibold mt-0.5 w-8 h-8 flex items-center justify-center rounded-full ${
                          isToday ? 'bg-brand-blue text-white' : 'text-brand-navy'
                        }`}
                      >
                        {date.getDate()}
                      </span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-brand-border/60">
            {Array.from({ length: maxRows }, (_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-brand-surface/40 transition-colors">
                {weekDates.map((date) => {
                  const dayKey = entryDateKey(date)
                  const entries = entriesByDay.get(dayKey) || []
                  const entry = entries[rowIndex]

                  return (
                    <td key={dayKey} className="px-2.5 py-2 align-top">
                      {entry ? (
                        <div className="p-2.5 rounded-lg bg-brand-surface hover:bg-brand-surface-dark transition-colors min-h-[76px]">
                          <div className="flex items-center justify-between mb-1 gap-1">
                            <span className="text-xs font-semibold text-brand-navy tabular-nums">
                              {formatStoredTime(entry.startTime)}
                            </span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getStatusClasses(entry.status)}`}>
                              {entry.status.charAt(0) + entry.status.slice(1).toLowerCase()}
                            </span>
                          </div>
                          <div className="text-xs text-brand-gray truncate">
                            {entry.project.client.name}
                          </div>
                          <div className="text-xs text-brand-navy truncate font-medium">
                            {entry.project.name}
                          </div>
                          <div className="text-xs font-semibold text-brand-blue mt-1 tabular-nums">
                            {formatDuration(entry.duration)}
                          </div>
                        </div>
                      ) : (
                        rowIndex === 0 ? <div className="h-[76px] rounded-lg border border-dashed border-brand-border" /> : <div />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            {/* Daily total row */}
            <tr className="bg-brand-surface/60">
              {weekDates.map((date) => {
                const dayKey = entryDateKey(date)
                const total = dayTotals.get(dayKey) || 0
                return (
                  <td key={dayKey} className="px-3 py-2.5 text-center border-t border-brand-border/60">
                    <span className="text-sm font-semibold text-brand-navy tabular-nums">
                      {total > 0 ? formatDuration(total) : '—'}
                    </span>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {entriesByDay.size === 0 && (
        <div className="card-body text-center py-16">
          <div className="w-12 h-12 mx-auto rounded-lg bg-brand-blue/10 flex items-center justify-center mb-4">
            <ClockIcon className="w-6 h-6 text-brand-blue" />
          </div>
          <h3 className="text-base font-semibold text-brand-navy">No time entries this week</h3>
          <p className="text-brand-gray text-sm mt-1">Click &quot;Add Time Entry&quot; to log your hours</p>
        </div>
      )}
    </div>
  )
}
