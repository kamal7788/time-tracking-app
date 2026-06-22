'use client'

import { useState, useEffect } from 'react'
import { formatTime, formatDuration, formatDate, timeStringToMinutes } from '@/lib/utils'

interface TimeEntry {
  id: string
  date: Date
  startTime: Date
  endTime: Date
  duration: number
  description: string | null
  status: string
  project: { name: string; client: { name: string } }
  projectId: string
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
  weekStart: string
  weekEnd: string
}

export default function TimeEntriesList({ timeEntries, clockSessions, projects, commonWorks, weekStart, weekEnd }: TimeEntriesListProps) {
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [activeTab, setActiveTab] = useState<'entries' | 'clocks'>('entries')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  const [editProjectId, setEditProjectId] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editError, setEditError] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  useEffect(() => {
    if (editingEntry) {
      setEditProjectId(editingEntry.projectId)
      const d = new Date(editingEntry.date)
      setEditDate(d.toISOString().split('T')[0])
      setEditStartTime(formatTime(editingEntry.startTime))
      setEditEndTime(formatTime(editingEntry.endTime))
      setEditDescription(editingEntry.description || '')
      setEditError('')
    }
  }, [editingEntry])

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

  const checkOverlap = (startTime: string, endTime: string, date: string, excludeId?: string): string | null => {
    const newStart = timeStringToMinutes(startTime)
    const newEnd = timeStringToMinutes(endTime)
    for (const entry of timeEntries) {
      if (excludeId && entry.id === excludeId) continue
      const entryDate = new Date(entry.date).toISOString().split('T')[0]
      if (entryDate !== date) continue
      if (entry.status === 'REJECTED') continue
      const existStart = timeStringToMinutes(formatTime(entry.startTime))
      const existEnd = timeStringToMinutes(formatTime(entry.endTime))
      if (newStart < existEnd && existStart < newEnd) {
        return `Overlaps with ${formatTime(entry.startTime)} - ${formatTime(entry.endTime)} (${entry.project.client.name} - ${entry.project.name})`
      }
    }
    return null
  }

  const handleEditSubmit = async () => {
    if (!editingEntry) return
    setEditError('')
    if (!editProjectId || !editDate || !editStartTime || !editEndTime) {
      setEditError('All fields are required')
      return
    }
    const overlap = checkOverlap(editStartTime, editEndTime, editDate, editingEntry.id)
    if (overlap) {
      setEditError(overlap)
      return
    }
    setEditSubmitting(true)
    try {
      const res = await fetch(`/api/time-entries/${editingEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: editProjectId,
          date: editDate,
          startTime: editStartTime,
          endTime: editEndTime,
          description: editDescription || undefined,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setEditingEntry(null)
      window.location.reload()
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to update entry')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleSubmitWeek = async () => {
    setSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')
    try {
      const res = await fetch('/api/time-entries/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: weekStart, endDate: weekEnd }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setSubmitSuccess(`Submitted ${result.submittedCount} entries for approval`)
      setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'badge-approved'
      case 'REJECTED': return 'badge-rejected'
      case 'SUBMITTED': return 'badge-submitted'
      default: return 'badge-draft'
    }
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {submitSuccess && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-3.5 rounded-2xl animate-slide-up">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{submitSuccess}</span>
        </div>
      )}
      {submitError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-600 px-5 py-3.5 rounded-2xl animate-slide-up">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{submitError}</span>
        </div>
      )}

      {/* Tabs + Submit */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-1 p-1 bg-brand-surface rounded-xl">
          <button
            onClick={() => setActiveTab('entries')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'entries' 
                ? 'bg-white text-brand-navy shadow-soft' 
                : 'text-brand-gray hover:text-brand-navy'
            }`}
          >
            Manual Entries ({timeEntries.length})
          </button>
          <button
            onClick={() => setActiveTab('clocks')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'clocks' 
                ? 'bg-white text-brand-navy shadow-soft' 
                : 'text-brand-gray hover:text-brand-navy'
            }`}
          >
            Clock Sessions ({clockSessions.length})
          </button>
        </div>
        <button
          onClick={handleSubmitWeek}
          disabled={submitting}
          className="btn-primary"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          {submitting ? 'Submitting...' : 'Submit Week'}
        </button>
      </div>

      {/* Manual Entries */}
      {activeTab === 'entries' && (
        <div className="space-y-6">
          {Object.entries(groupedByDate).length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-16">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-blue/10 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-brand-gray font-medium">No time entries for this week</p>
                <p className="text-brand-gray-light text-sm mt-1">Add your first entry to get started</p>
              </div>
            </div>
          ) : (
            Object.entries(groupedByDate).map(([date, entries]) => (
              <div key={date} className="card animate-slide-up">
                <div className="card-header flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-navy">{formatDate(date)}</h3>
                      <p className="text-xs text-brand-gray">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-brand-blue">{formatDuration(dailyTotal(entries))}</p>
                    <p className="text-xs text-brand-gray">Daily Total</p>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {entries.map((entry) => (
                    <div key={entry.id} className="px-6 py-4 hover:bg-brand-surface/30 transition-colors group">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-10 rounded-full bg-brand-blue/30" />
                            <div>
                              <p className="font-semibold text-brand-navy">
                                {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                              </p>
                              <p className="text-sm text-brand-gray">
                                {entry.project.client.name} <span className="text-brand-gray-light">/</span> {entry.project.name}
                              </p>
                            </div>
                          </div>
                          {entry.description && (
                            <p className="text-sm text-brand-gray-light mt-1.5 ml-4">{entry.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-brand-blue">{formatDuration(entry.duration)}</span>
                          <span className={getStatusBadge(entry.status)}>
                            {entry.status}
                          </span>
                          {entry.status === 'DRAFT' && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditingEntry(entry)}
                                className="p-2 rounded-xl text-brand-gray hover:text-brand-blue hover:bg-brand-blue/10 transition-all"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="p-2 rounded-xl text-brand-gray hover:text-red-500 hover:bg-red-50 transition-all"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="card-body text-center py-16">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-blue/10 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-brand-gray font-medium">No clock sessions for this week</p>
              </div>
            </div>
          ) : (
            Object.entries(clockSessionsByDate).map(([date, sessions]) => (
              <div key={date} className="card animate-slide-up">
                <div className="card-header">
                  <h3 className="font-bold text-brand-navy">{formatDate(date)}</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {sessions.map((session) => (
                    <div key={session.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-1 h-10 rounded-full ${session.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                          <div>
                            <p className="font-semibold text-brand-navy">
                              {formatTime(session.clockIn)} - {session.clockOut ? formatTime(session.clockOut) : 'Active'}
                            </p>
                            {session.project && (
                              <p className="text-sm text-brand-gray">
                                {session.project.client.name} <span className="text-brand-gray-light">/</span> {session.project.name}
                              </p>
                            )}
                            {session.description && (
                              <p className="text-sm text-brand-gray-light mt-1">{session.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-brand-blue">
                            {session.duration ? formatDuration(session.duration) : 'In Progress'}
                          </span>
                          <span className={getStatusBadge(session.status === 'COMPLETED' ? 'APPROVED' : session.status === 'ACTIVE' ? 'SUBMITTED' : 'REJECTED')}>
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

      {/* Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-lifted max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-brand-navy">Edit Time Entry</h3>
                <p className="text-sm text-brand-gray mt-0.5">Update entry details below</p>
              </div>
              <button onClick={() => setEditingEntry(null)} className="p-2 rounded-xl text-brand-gray hover:text-brand-navy hover:bg-brand-surface transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              {editError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {editError}
                </div>
              )}
              <div>
                <label className="label">Project</label>
                <select value={editProjectId} onChange={(e) => setEditProjectId(e.target.value)} className="input">
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.client.name} - {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Date</label>
                  <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">Start Time</label>
                  <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="input" step={900} />
                </div>
                <div>
                  <label className="label">End Time</label>
                  <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="input" step={900} />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="input"
                  placeholder="What did you work on?"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingEntry(null)} className="btn-outline flex-1">
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={editSubmitting}
                  className="btn-primary flex-1"
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
