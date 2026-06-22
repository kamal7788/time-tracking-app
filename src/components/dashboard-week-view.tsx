'use client'

import { formatDate, formatTime, formatDuration } from '@/lib/utils'

interface DashboardWeekViewProps {
  weekDates: Date[]
  entriesByDay: Map<string, Array<{
    id: string
    date: Date
    startTime: Date
    endTime: Date
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

export default function DashboardWeekView({ weekDates, entriesByDay, dayTotals }: DashboardWeekViewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-600'
      case 'SUBMITTED': return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
      case 'REJECTED': return 'bg-red-50 text-red-600 ring-1 ring-red-200'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h2 className="text-lg font-bold text-brand-navy">Weekly Time Log</h2>
        <div className="flex items-center gap-2">
          {['DRAFT', 'SUBMITTED', 'APPROVED'].map((status) => (
            <span key={status} className={`text-xs font-medium px-2 py-1 rounded-lg ${getStatusColor(status)}`}>
              {status}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              {weekDates.map((date) => {
                const dateStr = date.toISOString().split('T')[0]
                const isToday = dateStr === today
                return (
                  <th
                    key={date.toISOString()}
                    className="px-4 py-3 text-center"
                  >
                    <div className="flex flex-col items-center">
                      <span className={`text-xs font-semibold ${isToday ? 'text-brand-blue' : 'text-brand-gray'}`}>
                        {dayNames[date.getDay()]}
                      </span>
                      <span className={`text-lg font-bold mt-0.5 ${isToday ? 'text-brand-blue' : 'text-brand-navy'}`}>
                        {date.getDate()}
                      </span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {Array.from({ length: 5 }, (_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-brand-surface/30 transition-colors">
                {weekDates.map((date) => {
                  const dayKey = date.toISOString().split('T')[0]
                  const entries = entriesByDay.get(dayKey) || []
                  const entry = entries[rowIndex]
                  
                  return (
                    <td key={dayKey} className="px-3 py-2">
                      {entry ? (
                        <div className="p-2.5 rounded-xl bg-brand-surface/50 hover:bg-brand-surface transition-colors min-h-[80px]">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-brand-navy">
                              {formatTime(entry.startTime)}
                            </span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${getStatusColor(entry.status)}`}>
                              {entry.status}
                            </span>
                          </div>
                          <div className="text-xs text-brand-gray truncate font-medium">
                            {entry.project.client.name}
                          </div>
                          <div className="text-xs text-brand-navy truncate font-semibold">
                            {entry.project.name}
                          </div>
                          {entry.description && (
                            <div className="text-[10px] text-brand-gray-light truncate mt-1">
                              {entry.description}
                            </div>
                          )}
                          <div className="text-xs font-bold text-brand-blue mt-1.5">
                            {formatDuration(entry.duration)}
                          </div>
                        </div>
                      ) : (
                        <div className="h-20 rounded-xl border-2 border-dashed border-gray-100 hover:border-brand-blue/30 transition-colors" />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            {/* Daily total row */}
            <tr className="bg-brand-surface/50">
              {weekDates.map((date) => {
                const dayKey = date.toISOString().split('T')[0]
                const total = dayTotals.get(dayKey) || 0
                return (
                  <td key={dayKey} className="px-4 py-3 text-center border-t border-gray-100">
                    <span className="text-sm font-bold text-brand-navy">
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
          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-blue/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-brand-navy">No time entries this week</h3>
          <p className="text-brand-gray mt-1">Click &quot;Add Time Entry&quot; to log your hours</p>
        </div>
      )}
    </div>
  )
}
