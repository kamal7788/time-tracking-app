'use client'

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
  leaveType: { name: string; color: string }
  approvedBy: { name: string } | null
}

interface LeaveRequestsListProps {
  requests: LeaveRequest[]
}

export default function LeaveRequestsList({ requests }: LeaveRequestsListProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return 'badge-submitted'
      case 'APPROVED': return 'badge-approved'
      case 'REJECTED': return 'badge-rejected'
      case 'CANCELLED': return 'badge-draft'
      default: return 'badge-draft'
    }
  }

  if (requests.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-8">
          <p className="text-gray-500">No leave requests found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-gray-900">My Leave Requests</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Type</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Dates</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Days</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Reason</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: request.leaveType.color }}
                    />
                    <span className="font-medium">{request.leaveType.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <p>{formatDate(request.startDate)}</p>
                  <p className="text-sm text-gray-500">to {formatDate(request.endDate)}</p>
                </td>
                <td className="py-3 px-4 text-center font-medium">{request.totalDays}</td>
                <td className="py-3 px-4">
                  <p className="text-sm text-gray-600 truncate max-w-[200px]">
                    {request.reason || '-'}
                  </p>
                </td>
                <td className="py-3 px-4">
                  <span className={getStatusBadge(request.status)}>{request.status}</span>
                  {request.rejectReason && (
                    <p className="text-xs text-red-600 mt-1">{request.rejectReason}</p>
                  )}
                </td>
                <td className="py-3 px-4 text-sm text-gray-500">
                  {formatDate(request.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}