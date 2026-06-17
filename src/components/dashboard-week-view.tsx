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
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'badge-draft'
      case 'SUBMITTED': return 'badge-submitted'
      case 'APPROVED': return 'badge-approved'
      case 'REJECTED': return 'badge-rejected'
      default: return 'badge-draft'
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-gray-900">Weekly Time Log</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {weekDates.map((date, index) => (
                <th
                  key={date.toISOString()}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    index === 0 || index === 6 ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span>{dayNames[date.getDay()]}</span>
                    <span className="text-sm font-normal text-gray-900 mt-1">
                      {date.getDate()}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Time slots rows - we'll show up to 5 entries per day */}
            {Array.from({ length: 5 }, (_, rowIndex) => (
              <tr key={rowIndex}>
                {weekDates.map((date, colIndex) => {
                  const dayKey = date.toISOString().split('T')[0]
                  const entries = entriesByDay.get(dayKey) || []
                  const entry = entries[rowIndex]
                  
                  return (
                    <td key={dayKey} className={`px-4 py-2 ${rowIndex === 0 ? 'border-t' : ''} ${colIndex === 0 || colIndex === 6 ? 'bg-gray-50' : ''}`}>
                      {entry ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-900">
                              {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                            </span>
                            <span className={`badge ${getStatusBadge(entry.status)}`}>
                              {entry.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {entry.project.client.name} - {entry.project.name}
                          </div>
                          {entry.description && (
                            <div className="text-xs text-gray-500 truncate">
                              {entry.description}
                            </div>
                          )}
                          <div className="text-xs font-medium text-primary-600">
                            {formatDuration(entry.duration)}
                          </div>
                        </div>
                      ) : (
                        <div className="h-16" />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            {/* Daily total row */}
            <tr className="bg-gray-50">
              {weekDates.map((date) => {
                const dayKey = date.toISOString().split('T')[0]
                const total = dayTotals.get(dayKey) || 0
                return (
                  <td key={dayKey} className="px-4 py-2 font-medium text-gray-900 border-t">
                    {total > 0 ? formatDuration(total) : '-'}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Empty state */}
      {entriesByDay.size === 0 && (
        <div className="card-body text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No time entries this week</h3>
          <p className="mt-1 text-sm text-gray-500">Click "Add Time Entry" to log your hours</p>
        </div>
      )}
    </div>
  )
}