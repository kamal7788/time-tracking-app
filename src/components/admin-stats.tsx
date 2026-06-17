'use client'

import Link from 'next/link'
import { formatDate, formatDuration, formatTime } from '@/lib/utils'

interface AdminStatsProps {
  pendingEntries: number
  pendingLeaves: number
  totalUsers: number
  recentEntries: Array<{
    id: string
    duration: number
    description: string | null
    status: string
    submittedAt: Date | null
    user: { name: string; email: string }
    project: { name: string; client: { name: string } }
  }>
}

export default function AdminStats({ pendingEntries, pendingLeaves, totalUsers, recentEntries }: AdminStatsProps) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/admin/time-entries?status=SUBMITTED" className="card hover:shadow-md transition-shadow">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Approvals</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{pendingEntries}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Time entries waiting for review</p>
          </div>
        </Link>

        <Link href="/admin/leaves?status=PENDING" className="card hover:shadow-md transition-shadow">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Leave Requests</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{pendingLeaves}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Leave requests awaiting approval</p>
          </div>
        </Link>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalUsers}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Active users in the system</p>
          </div>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Submissions</h2>
          <Link href="/admin/time-entries" className="text-sm text-primary-600 hover:text-primary-700">
            View all
          </Link>
        </div>
        <div className="card-body">
          {recentEntries.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No pending submissions</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Employee</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Client - Project</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Duration</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Submitted</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEntries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{entry.user.name}</p>
                        <p className="text-sm text-gray-500">{entry.user.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-900">{entry.project.client.name}</p>
                        <p className="text-sm text-gray-500">{entry.project.name}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-medium text-primary-600">{formatDuration(entry.duration)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {entry.submittedAt ? formatDate(entry.submittedAt) : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Link 
                          href="/admin/time-entries" 
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/time-entries" className="card hover:shadow-md transition-shadow">
          <div className="card-body text-center py-6">
            <svg className="w-8 h-8 mx-auto text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="mt-2 font-medium text-gray-900">Manage Time Entries</p>
          </div>
        </Link>

        <Link href="/admin/leaves" className="card hover:shadow-md transition-shadow">
          <div className="card-body text-center py-6">
            <svg className="w-8 h-8 mx-auto text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 font-medium text-gray-900">Manage Leaves</p>
          </div>
        </Link>

        <Link href="/admin/leave-types" className="card hover:shadow-md transition-shadow">
          <div className="card-body text-center py-6">
            <svg className="w-8 h-8 mx-auto text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <p className="mt-2 font-medium text-gray-900">Leave Types</p>
          </div>
        </Link>

        <Link href="/admin/reports" className="card hover:shadow-md transition-shadow">
          <div className="card-body text-center py-6">
            <svg className="w-8 h-8 mx-auto text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 font-medium text-gray-900">Reports</p>
          </div>
        </Link>
      </div>
    </div>
  )
}