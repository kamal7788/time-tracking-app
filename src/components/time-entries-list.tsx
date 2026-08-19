'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatStoredTime, storedTimeToHHMM, formatDuration, formatDate, timeStringToMinutes, entryDateKey } from '@/lib/utils'
import { Modal, ConfirmDialog } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { EditIcon, TrashIcon, SendIcon, CalendarIcon, ClockIcon } from '@/components/ui/icons'

interface TimeEntry {
  id: string
  date: string
  startTime: string
  endTime: string
  duration: number
  description: string | null
  status: string
  project: { name: string; client: { name: string } }
  projectId: string
}

interface ClockSession {
  id: string
  clockIn: string
  clockOut: string | null
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

export default function TimeEntriesList({ timeEntries, clockSessions, projects, weekStart, weekEnd }: TimeEntriesListProps) {
  const router = useRouter()
  const toast = useToast()
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<TimeEntry | null>(null)
  const [activeTab, setActiveTab] = useState<'entries' | 'clocks'>('entries')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
      setEditDate(entryDateKey(editingEntry.date))
      setEditStartTime(storedTimeToHHMM(editingEntry.startTime))
      setEditEndTime(storedTimeToHHMM(editingEntry.endTime))
      setEditDescription(editingEntry.description || '')
      setEditError('')
    }
  }, [editingEntry])

  const groupedByDate = timeEntries.reduce((acc, entry) => {
    const dateKey = entryDateKey(entry.date)
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

  const handleDelete = async () => {
    if (!deletingEntry) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/time-entries/${deletingEntry.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete entry')
      }
      toast.success('Time entry deleted')
      setDeletingEntry(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete entry')
    } finally {
      setDeleting(false)
    }
  }

  const checkOverlap = (startTime: string, endTime: string, date: string, excludeId?: string): string | null => {
    const newStart = timeStringToMinutes(startTime)
    let newEnd = timeStringToMinutes(endTime)
    if (isNaN(newStart) || isNaN(newEnd)) return null
    if (newEnd <= newStart) newEnd += 1440 // overnight
    for (const entry of timeEntries) {
      if (excludeId && entry.id === excludeId) continue
      if (entryDateKey(entry.date) !== date) continue
      if (entry.status === 'REJECTED') continue
      const existStart = timeStringToMinutes(storedTimeToHHMM(entry.startTime))
      let existEnd = timeStringToMinutes(storedTimeToHHMM(entry.endTime))
      if (isNaN(existStart) || isNaN(existEnd)) continue
      if (existEnd <= existStart) existEnd += 1440
      if (newStart < existEnd && existStart < newEnd) {
        return `Overlaps with ${formatStoredTime(entry.startTime)} - ${formatStoredTime(entry.endTime)} (${entry.project.client.name} - ${entry.project.name})`
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
      toast.success('Time entry updated')
      router.refresh()
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to update entry')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleSubmitWeek = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/time-entries/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: weekStart, endDate: weekEnd }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      toast.success(`Submitted ${result.submittedCount} entries for approval`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
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
      {/* Tabs + Submit */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-1 p-1 bg-brand-surface-dark rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('entries')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'entries'
                ? 'bg-white text-brand-navy shadow-soft'
                : 'text-brand-gray hover:text-brand-navy'
            }`}
          >
            Manual Entries ({timeEntries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('clocks')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'clocks'
                ? 'bg-white text-brand-navy shadow-soft'
                : 'text-brand-gray hover:text-brand-navy'
            }`}
          >
            Clock Sessions ({clockSessions.length})
          </button>
        </div>
        <button
          type="button"
          onClick={handleSubmitWeek}
          disabled={submitting}
          className="btn-primary"
        >
          <SendIcon className="w-4 h-4" />
          {submitting ? 'Submitting…' : 'Submit Week'}
        </button>
      </div>

      {/* Manual Entries */}
      {activeTab === 'entries' && (
        <div className="space-y-4">
          {Object.entries(groupedByDate).length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-16">
                <div className="w-12 h-12 mx-auto rounded-lg bg-brand-blue/10 flex items-center justify-center mb-4">
                  <ClockIcon className="w-6 h-6 text-brand-blue" />
                </div>
                <p className="text-brand-navy font-medium">No time entries for this week</p>
                <p className="text-brand-gray-light text-sm mt-1">Add your first entry to get started</p>
              </div>
            </div>
          ) : (
            Object.entries(groupedByDate).map(([date, entries]) => (
              <div key={date} className="card">
                <div className="card-header flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                      <CalendarIcon className="w-4 h-4 text-brand-blue" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-brand-navy">{formatDate(date)}</h3>
                      <p className="text-xs text-brand-gray">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-brand-blue tabular-nums">{formatDuration(dailyTotal(entries))}</p>
                    <p className="text-xs text-brand-gray">Daily total</p>
                  </div>
                </div>
                <div className="divide-y divide-brand-border/60">
                  {entries.map((entry) => (
                    <div key={entry.id} className="px-5 py-4 hover:bg-brand-surface/60 transition-colors group">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-10 rounded-full bg-brand-blue/30" />
                            <div className="min-w-0">
                              <p className="font-medium text-brand-navy tabular-nums">
                                {formatStoredTime(entry.startTime)} - {formatStoredTime(entry.endTime)}
                              </p>
                              <p className="text-sm text-brand-gray truncate">
                                {entry.project.client.name} <span className="text-brand-gray-muted">/</span> {entry.project.name}
                              </p>
                            </div>
                          </div>
                          {entry.description && (
                            <p className="text-sm text-brand-gray-light mt-1.5 ml-4">{entry.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-base font-semibold text-brand-blue tabular-nums">{formatDuration(entry.duration)}</span>
                          <span className={getStatusBadge(entry.status)}>
                            {entry.status}
                          </span>
                          {entry.status === 'DRAFT' && (
                            <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => setEditingEntry(entry)}
                                className="p-2 rounded-lg text-brand-gray hover:text-brand-blue hover:bg-brand-blue/10 transition-colors cursor-pointer"
                                aria-label="Edit entry"
                                title="Edit"
                              >
                                <EditIcon className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingEntry(entry)}
                                className="p-2 rounded-lg text-brand-gray hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                aria-label="Delete entry"
                                title="Delete"
                              >
                                <TrashIcon className="w-4 h-4" />
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
        <div className="space-y-4">
          {Object.entries(clockSessionsByDate).length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-16">
                <div className="w-12 h-12 mx-auto rounded-lg bg-brand-blue/10 flex items-center justify-center mb-4">
                  <ClockIcon className="w-6 h-6 text-brand-blue" />
                </div>
                <p className="text-brand-navy font-medium">No clock sessions for this week</p>
              </div>
            </div>
          ) : (
            Object.entries(clockSessionsByDate).map(([date, sessions]) => (
              <div key={date} className="card">
                <div className="card-header">
                  <h3 className="font-semibold text-brand-navy">{formatDate(date)}</h3>
                </div>
                <div className="divide-y divide-brand-border/60">
                  {sessions.map((session) => (
                    <div key={session.id} className="px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-1 h-10 rounded-full flex-shrink-0 ${session.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-brand-border'}`} />
                          <div className="min-w-0">
                            <p className="font-medium text-brand-navy tabular-nums">
                              {new Date(session.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              {' - '}
                              {session.clockOut
                                ? new Date(session.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                : 'Active'}
                            </p>
                            {session.project && (
                              <p className="text-sm text-brand-gray truncate">
                                {session.project.client.name} <span className="text-brand-gray-muted">/</span> {session.project.name}
                              </p>
                            )}
                            {session.description && (
                              <p className="text-sm text-brand-gray-light mt-1">{session.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-base font-semibold text-brand-blue tabular-nums">
                            {session.duration ? formatDuration(session.duration) : 'In progress'}
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
      <Modal open={!!editingEntry} onClose={() => setEditingEntry(null)} title="Edit Time Entry">
        <div className="space-y-4">
          {editError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium" role="alert">
              {editError}
            </div>
          )}
          <div>
            <label htmlFor="edit-project" className="label">Project</label>
            <select id="edit-project" value={editProjectId} onChange={(e) => setEditProjectId(e.target.value)} className="input">
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.client.name} - {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="edit-date" className="label">Date</label>
              <input id="edit-date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="edit-start" className="label">Start Time</label>
              <input id="edit-start" type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="input" step={900} />
            </div>
            <div>
              <label htmlFor="edit-end" className="label">End Time</label>
              <input id="edit-end" type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="input" step={900} />
            </div>
          </div>
          <p className="text-xs text-brand-gray-light">Overnight entries are supported — an end time earlier than the start time rolls into the next day.</p>
          <div>
            <label htmlFor="edit-description" className="label">Description</label>
            <textarea
              id="edit-description"
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
              type="button"
              onClick={handleEditSubmit}
              disabled={editSubmitting}
              className="btn-primary flex-1"
            >
              {editSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deletingEntry}
        onClose={() => setDeletingEntry(null)}
        onConfirm={handleDelete}
        title="Delete Time Entry"
        message={`Delete the entry ${deletingEntry ? `${formatStoredTime(deletingEntry.startTime)} - ${formatStoredTime(deletingEntry.endTime)}` : ''}? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </div>
  )
}
