'use client'

import { useState } from 'react'

interface User {
  id: string
  name: string
  email: string
}

interface LeaveType {
  id: string
  name: string
  color: string
}

interface Balance {
  id: string
  allocatedDays: number
  usedDays: number
  carriedOverDays: number
  user: { id: string; name: string; email: string }
  leaveType: { id: string; name: string; color: string }
}

interface LeaveBalanceAllocatorProps {
  users: User[]
  leaveTypes: LeaveType[]
  balances: Balance[]
  year: number
}

export default function LeaveBalanceAllocator({ users, leaveTypes, balances, year }: LeaveBalanceAllocatorProps) {
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('')
  const [allocatedDays, setAllocatedDays] = useState<number>(0)
  const [carriedOverDays, setCarriedOverDays] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !selectedLeaveType || allocatedDays <= 0) {
      setError('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/leave-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          leaveTypeId: selectedLeaveType,
          year,
          allocatedDays,
          carriedOverDays,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setSuccess('Leave balance allocated successfully')
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to allocate balance')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getBalanceForUserAndType = (userId: string, leaveTypeId: string) => {
    return balances.find(b => b.user.id === userId && b.leaveType.id === leaveTypeId)
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Allocation Form */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold">Allocate Leave Balance</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Employee <span className="text-red-500">*</span></label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="input"
                >
                  <option value="">Select employee...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Leave Type <span className="text-red-500">*</span></label>
                <select
                  value={selectedLeaveType}
                  onChange={(e) => setSelectedLeaveType(e.target.value)}
                  className="input"
                >
                  <option value="">Select leave type...</option>
                  {leaveTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Allocated Days <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={allocatedDays}
                  onChange={(e) => setAllocatedDays(parseInt(e.target.value) || 0)}
                  min="0"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Carried Over Days</label>
                <input
                  type="number"
                  value={carriedOverDays}
                  onChange={(e) => setCarriedOverDays(parseInt(e.target.value) || 0)}
                  min="0"
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Allocating...' : 'Allocate Balance'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Balances Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold">Current Balances - {year}</h3>
        </div>
        <div className="card-body">
          {balances.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No balances allocated yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Employee</th>
                    {leaveTypes.map((type) => (
                      <th key={type.id} className="text-center py-3 px-4 text-sm font-medium text-gray-600">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                          {type.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </td>
                      {leaveTypes.map((type) => {
                        const balance = getBalanceForUserAndType(user.id, type.id)
                        return (
                          <td key={type.id} className="py-3 px-4 text-center">
                            {balance ? (
                              <div>
                                <p className="font-medium">{balance.allocatedDays}</p>
                                <p className="text-xs text-gray-500">
                                  Used: {balance.usedDays} / 
                                  Remaining: {balance.allocatedDays + balance.carriedOverDays - balance.usedDays}
                                </p>
                                {balance.carriedOverDays > 0 && (
                                  <p className="text-xs text-green-600">+{balance.carriedOverDays} carried</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}