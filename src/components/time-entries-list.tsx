'use client'

import { useState } from 'react'
import { formatTime, formatDuration, formatDate } from '@/lib/utils'

interface TimeEntry {
  id: string
  date: Date
  startTime: Date
  endTime: Date
  duration: number
  description: string | null
  status: string
  project: { name: string; client: { name: string } }
}

interface ClockSession {
  id: string
  clockIn: Date
  clockOut: Date | null
  duration: number | null
  description: string | null
  status: string
  project: { name: string; client: { name: string } } | null
}

interface TimeEntriesListProps {
  timeEntries: TimeEntry[]
  clockSessions: ClockSession[]
  projects: Array<{ id: string; name: string; client: { name: string } }>
  commonWorks: Array<{ id: string; name: string; projectId: string; project: { name: string; client: { name: string } } }>
}

export default function TimeEntriesList({ timeEntries, clockSessions, projects, commonWorks }: TimeEntriesListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'entries' | 'clocks'>('entries')

  const groupedByDate = timeEntries.reduce((acc, entry) => {
    const dateKey = entry.date.toString().split('T')[0]
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(entry)
    return acc
  }, {} as Record<string, TimeEntry[]>)

  const clockSessionsByDate = clockSessions.reduce((acc, session) => {
    const dateKey = session.clockIn.toString().split('T')[0]
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(session)
    return acc
  }, {} as Record<string, ClockSession[]>)

  const dailyTotal = (entries: TimeEntry[]) => entries.reduce((sum, e) => sum + e.duration, 0)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this time entry?')) return
    try {
      const res = await fetch(`/api/time-entries/${id}`, { method: 'DELETE' })
      if (res.ok) window.location.reload()
    } catch (error) {
      alert('Failed to delete entry')
    }
  }

  const handleStatusUpdate = async (ids: string[], action: 'approve' | 'reject') => {
    const reason = action === 'reject' ? prompt('Reason for rejection:') : undefined
    if (action === 'reject' && !reason) return

    try {
      const res = await fetch('/api/admin/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeEntryIds: ids, action, rejectReason: reason }),
      })
      if (res.ok) window.location.reload()
    } catch (error) {
      alert('Failed to update status')
    }
  }

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('entries')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'entries' 
              ? 'border-primary-500 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Manual Entries ({timeEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('clocks')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'clocks' 
              ? 'border-primary-500 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Clock In/Out Sessions ({clockSessions.length})
        </button>
      </div>

      {/* Manual Entries */}
      {activeTab === 'entries' && (
        <div className="space-y-6">
          {Object.entries(groupedByDate).length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-12">
                <p className="text-gray-500">No time entries for this week</p>
              </div>
            </div>
          ) : (
            Object.entries(groupedByDate).map(([date, entries]) => (
              <div key={date} className="card">
                <div className="card-header flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{formatDate(date)}</h3>
                    <p className="text-sm text-gray-500">{entries.length} entries</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-600">{formatDuration(dailyTotal(entries))}</p>
                    <p className="text-xs text-gray-500">Daily Total</p>
                  </div>
                </div>
                <div className="divide-y">
                  {entries.map((entry) => (
                    <div key={entry.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                              </p>
                              <p className="text-sm text-gray-600">
                                {entry.project.client.name} - {entry.project.name}
                              </p>
                            </div>
                          </div>
                          {entry.description && (
                            <p className="text-sm text-gray-500 mt-1">{entry.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-primary-600">{formatDuration(entry.duration)}</span>
                          <span className={`badge ${
                            entry.status === 'APPROVED' ? 'badge-approved' :
                            entry.status === 'REJECTED' ? 'badge-rejected' :
                            entry.status === 'SUBMITTED' ? 'badge-submitted' : 'badge-draft'
                          }`}>
                            {entry.status}
                          </span>
                          {entry.status === 'DRAFT' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingId(entry.id)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="text-gray-400 hover:text-red-600"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Clock Sessions */}
      {activeTab === 'clocks' && (
        <div className="space-y-6">
          {Object.entries(clockSessionsByDate).length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-12">
                <p className="text-gray-500">No clock sessions for this week</p>
              </div>
            </div>
          ) : (
            Object.entries(clockSessionsByDate).map(([date, sessions]) => (
              <div key={date} className="card">
                <div className="card-header">
                  <h3 className="font-semibold text-gray-900">{formatDate(date)}</h3>
                </div>
                <div className="divide-y">
                  {sessions.map((session) => (
                    <div key={session.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatTime(session.clockIn)} - {session.clockOut ? formatTime(session.clockOut) : 'Active'}
                          </p>
                          {session.project && (
                            <p className="text-sm text-gray-600">
                              {session.project.client.name} - {session.project.name}
                            </p>
                          )}
                          {session.description && (
                            <p className="text-sm text-gray-500 mt-1">{session.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-primary-600">
                            {session.duration ? formatDuration(session.duration) : 'In Progress'}
                          </span>
                          <span className={`ml-2 badge ${
                            session.status === 'COMPLETED' ? 'badge-approved' :
                            session.status === 'CANCELLED' ? 'badge-rejected' : 'badge-submitted'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}