'use client'

import { useState } from 'react'
import { formatDate, formatTime, formatDuration } from '@/lib/utils'

interface TimeEntry {
  id: string
  date: Date
  startTime: Date
  endTime: Date
  duration: number
  description: string | null
  status: string
  submittedAt: Date | null
  approvedAt: Date | null
  rejectReason: string | null
  user: { id: string; name: string; email: string }
  project: { name: string; client: { name: string } }
}

interface AdminTimeEntriesListProps {
  timeEntries: TimeEntry[]
  users: Array<{ id: string; name: string; email: string }>
  projects: Array<{ id: string; name: string; client: { name: string } }>
}

export default function AdminTimeEntriesList({ timeEntries, users, projects }: AdminTimeEntriesListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterUser, setFilterUser] = useState<string>('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const filteredEntries = timeEntries.filter((entry) => {
    if (filterStatus && entry.status !== filterStatus) return false
    if (filterUser && entry.user.id !== filterUser) return false
    return true
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableIds = filteredEntries
        .filter(e => e.status === 'SUBMITTED')
        .map(e => e.id)
      setSelectedIds(selectableIds)
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id])
    } else {
      setSelectedIds(selectedIds.filter(i => i !== id))
    }
  }

  const handleApprove = async (ids: string[]) => {
    setIsProcessing(true)
    try {
      const res = await fetch('/api/admin/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeEntryIds: ids, action: 'approve' }),
      })
      if (!res.ok) throw new Error('Failed to approve')
      window.location.reload()
    } catch (error) {
      alert('Failed to approve entries')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (ids: string[]) => {
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason')
      return
    }
    setIsProcessing(true)
    try {
      const res = await fetch('/api/admin/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeEntryIds: ids, action: 'reject', rejectReason }),
      })
      if (!res.ok) throw new Error('Failed to reject')
      setShowRejectModal(false)
      setRejectReason('')
      setSelectedIds([])
      window.location.reload()
    } catch (error) {
      alert('Failed to reject entries')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this time entry? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/time-entries/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      window.location.reload()
    } catch {
      alert('Failed to delete entry')
    }
  }

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
    <div className="space-y-4">
      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="label">Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input">
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div>
              <label className="label">Employee</label>
              <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="input">
                <option value="">All Employees</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-primary-800">
            {selectedIds.length} item(s) selected
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => handleApprove(selectedIds)}
              disabled={isProcessing}
              className="btn-primary"
            >
              Approve Selected
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={isProcessing}
              className="btn-danger"
            >
              Reject Selected
            </button>
          </div>
        </div>
      )}

      {/* Entries Table */}
      <div className="card">
        <div className="card-body">
          {filteredEntries.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No time entries found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4">
                      <input
                        type="checkbox"
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Employee</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Time</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Client - Project</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Duration</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {entry.status === 'SUBMITTED' && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(entry.id)}
                            onChange={(e) => handleSelectOne(entry.id, e.target.checked)}
                            className="rounded"
                          />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{entry.user.name}</p>
                        <p className="text-sm text-gray-500">{entry.user.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        {formatDate(entry.date)}
                      </td>
                      <td className="py-3 px-4">
                        {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                      </td>
                      <td className="py-3 px-4">
                        <p>{entry.project.client.name}</p>
                        <p className="text-sm text-gray-500">{entry.project.name}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-medium text-primary-600">{formatDuration(entry.duration)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={getStatusBadge(entry.status)}>{entry.status}</span>
                        {entry.rejectReason && (
                          <p className="text-xs text-red-600 mt-1">{entry.rejectReason}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {entry.status === 'SUBMITTED' && (
                            <>
                              <button
                                onClick={() => handleApprove([entry.id])}
                                disabled={isProcessing}
                                className="text-green-600 hover:text-green-700 text-sm"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedIds([entry.id])
                                  setShowRejectModal(true)
                                }}
                                disabled={isProcessing}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="text-gray-400 hover:text-red-600 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Reject Time Entry(s)</h3>
            </div>
            <div className="p-4">
              <label className="label">Rejection Reason <span className="text-red-500">*</span></label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="input"
                placeholder="Enter reason for rejection..."
              />
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedIds)}
                disabled={isProcessing || !rejectReason.trim()}
                className="btn-danger"
              >
                {isProcessing ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}