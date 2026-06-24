'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/utils'

interface Expense {
  id: string
  itemName: string
  amount: { toString(): string }
  date: Date
  receiptPath: string | null
  description: string | null
  status: string
  submittedAt: Date | null
  approvedAt: Date | null
  rejectedAt: Date | null
  rejectReason: string | null
  user: { id: string; name: string; email: string }
}

interface AdminExpensesListProps {
  expenses: Expense[]
  onExpenseUpdated: () => void
}

export default function AdminExpensesList({ expenses, onExpenseUpdated }: AdminExpensesListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterUser, setFilterUser] = useState<string>('')
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const filteredExpenses = expenses.filter((expense) => {
    if (filterStatus && expense.status !== filterStatus) return false
    if (filterUser && expense.user.id !== filterUser) return false
    return true
  })

  const uniqueUsers = Array.from(new Set(expenses.map(e => e.user.id))).map(id => {
    const user = expenses.find(e => e.user.id === id)?.user
    return user!
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableIds = filteredExpenses
        .filter(e => e.status === 'SUBMITTED')
        .map(e => e.id)
      setSelectedIds(selectableIds)
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id))
    }
  }

  const handleApprove = async (ids: string[]) => {
    setIsProcessing(true)
    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseIds: ids, action: 'approve' }),
      })
      if (!res.ok) throw new Error('Failed to approve')
      setSelectedIds([])
      onExpenseUpdated()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to approve')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectClick = (id?: string) => {
    if (id) {
      setRejectingId(id)
    } else {
      setRejectingId(null)
    }
    setRejectReason('')
    setShowRejectModal(true)
  }

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    setIsProcessing(true)
    try {
      const ids = rejectingId ? [rejectingId] : selectedIds
      const res = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseIds: ids, action: 'reject', rejectReason: rejectReason.trim() }),
      })
      if (!res.ok) throw new Error('Failed to reject')
      setShowRejectModal(false)
      setRejectingId(null)
      setSelectedIds([])
      onExpenseUpdated()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to reject')
    } finally {
      setIsProcessing(false)
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

  const totalPending = filteredExpenses
    .filter(e => e.status === 'SUBMITTED')
    .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)

  const totalApproved = filteredExpenses
    .filter(e => e.status === 'APPROVED')
    .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-brand-gray">Pending Approval</p>
              <p className="text-2xl font-bold text-brand-navy">${totalPending.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-brand-gray">Approved</p>
              <p className="text-2xl font-bold text-brand-navy">${totalApproved.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-brand-gray">Total Expenses</p>
              <p className="text-2xl font-bold text-brand-navy">{filteredExpenses.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input">
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div className="flex-1">
          <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="input">
            <option value="">All Employees</option>
            {uniqueUsers.map(user => (
              <option key={user.id} value={user.id}>{user.name || user.email}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-brand-blue/5 rounded-2xl border border-brand-blue/20">
          <span className="text-sm font-medium text-brand-navy">{selectedIds.length} selected</span>
          <button
            onClick={() => handleApprove(selectedIds)}
            disabled={isProcessing}
            className="btn-primary"
          >
            Approve Selected
          </button>
          <button
            onClick={() => handleRejectClick()}
            disabled={isProcessing}
            className="btn-danger"
          >
            Reject Selected
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="btn-ghost"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Expenses Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    checked={selectedIds.length === filteredExpenses.filter(e => e.status === 'SUBMITTED').length && filteredExpenses.filter(e => e.status === 'SUBMITTED').length > 0}
                    className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                  />
                </th>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Receipt</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-brand-surface/30 transition-colors">
                  <td className="px-4 py-3">
                    {expense.status === 'SUBMITTED' && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(expense.id)}
                        onChange={(e) => handleSelectOne(expense.id, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-brand-navy">{expense.user.name || expense.user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-brand-navy">{expense.itemName}</div>
                    {expense.description && (
                      <div className="text-sm text-brand-gray truncate max-w-xs">{expense.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-brand-navy">NPR ${parseFloat(expense.amount.toString()).toFixed(2)}</td>
                  <td className="px-4 py-3 text-brand-gray">{formatDate(expense.date)}</td>
                  <td className="px-4 py-3">
                    <span className={getStatusBadge(expense.status)}>{expense.status}</span>
                    {expense.rejectReason && (
                      <p className="text-xs text-red-500 mt-1">{expense.rejectReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {expense.receiptPath && (
                      <button
                        onClick={() => setViewingReceipt(expense.receiptPath)}
                        className="p-2 rounded-xl text-brand-gray hover:text-brand-blue hover:bg-brand-blue/10 transition-all"
                        title="View receipt"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {expense.status === 'SUBMITTED' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleApprove([expense.id])}
                          disabled={isProcessing}
                          className="p-2 rounded-xl text-brand-gray hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                          title="Approve"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRejectClick(expense.id)}
                          disabled={isProcessing}
                          className="p-2 rounded-xl text-brand-gray hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Reject"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredExpenses.length === 0 && (
          <div className="card-body text-center py-16">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-blue/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-brand-navy">No expenses found</h3>
            <p className="text-brand-gray mt-1">No expenses match your filters</p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-lifted max-w-md w-full animate-slide-up">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-brand-navy">Reject Expense</h3>
              <p className="text-sm text-brand-gray mt-0.5">Please provide a reason for rejection</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Rejection Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="input"
                  placeholder="Why is this expense being rejected?"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowRejectModal(false)} className="btn-outline flex-1">
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={isProcessing || !rejectReason.trim()}
                  className="btn-danger flex-1"
                >
                  {isProcessing ? 'Processing...' : 'Reject Expense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-sm" onClick={() => setViewingReceipt(null)}>
          <div className="bg-white rounded-2xl shadow-lifted max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-brand-navy">Receipt</h3>
              <button onClick={() => setViewingReceipt(null)} className="p-2 rounded-xl text-brand-gray hover:text-brand-navy hover:bg-brand-surface transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <img src={viewingReceipt} alt="Receipt" className="w-full rounded-xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
