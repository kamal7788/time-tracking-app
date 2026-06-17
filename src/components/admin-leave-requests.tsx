'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/utils'

interface LeaveRequest {
  id: string
  startDate: Date
  endDate: Date
  totalDays: number
  reason: string | null
  status: string
  rejectReason: string | null
  createdAt: Date
  user: { id: string; name: string; email: string }
  leaveType: { name: string; color: string }
  approvedBy: { id: string; name: string } | null
}

interface AdminLeaveRequestsProps {
  requests: LeaveRequest[]
  users: Array<{ id: string; name: string; email: string }>
}

export default function AdminLeaveRequests({ requests, users }: AdminLeaveRequestsProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterUser, setFilterUser] = useState<string>('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const filteredRequests = requests.filter((req) => {
    if (filterStatus && req.status !== filterStatus) return false
    if (filterUser && req.user.id !== filterUser) return false
    return true
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingIds = filteredRequests.filter(r => r.status === 'PENDING').map(r => r.id)
      setSelectedIds(pendingIds)
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
      const res = await fetch('/api/leave-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestIds: ids, action: 'approve' }),
      })
      if (!res.ok) throw new Error('Failed to approve')
      window.location.reload()
    } catch (error) {
      alert('Failed to approve requests')
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
      const res = await fetch('/api/leave-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestIds: ids, action: 'reject', rejectReason }),
      })
      if (!res.ok) throw new Error('Failed to reject')
      setShowRejectModal(false)
      setRejectReason('')
      setSelectedIds([])
      window.location.reload()
    } catch (error) {
      alert('Failed to reject requests')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return 'badge-submitted'
      case 'APPROVED': return 'badge-approved'
      case 'REJECTED': return 'badge-rejected'
      case 'CANCELLED': return 'badge-draft'
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
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
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

      {/* Requests Table */}
      <div className="card">
        <div className="card-body">
          {filteredRequests.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No leave requests found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">
                      <input
                        type="checkbox"
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Employee</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Leave Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Dates</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Days</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {request.status === 'PENDING' && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(request.id)}
                            onChange={(e) => handleSelectOne(request.id, e.target.checked)}
                            className="rounded"
                          />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{request.user.name}</p>
                        <p className="text-sm text-gray-500">{request.user.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: request.leaveType.color }}
                          />
                          <span>{request.leaveType.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm">
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </p>
                        {request.reason && (
                          <p className="text-xs text-gray-500 mt-1">{request.reason}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-medium">{request.totalDays}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={getStatusBadge(request.status)}>{request.status}</span>
                        {request.rejectReason && (
                          <p className="text-xs text-red-600 mt-1">{request.rejectReason}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {request.status === 'PENDING' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove([request.id])}
                              disabled={isProcessing}
                              className="text-green-600 hover:text-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedIds([request.id])
                                setShowRejectModal(true)
                              }}
                              disabled={isProcessing}
                              className="text-red-600 hover:text-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        )}
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
              <h3 className="text-lg font-semibold">Reject Leave Request(s)</h3>
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