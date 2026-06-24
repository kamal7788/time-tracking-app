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
  createdAt: Date
}

interface ExpensesListProps {
  expenses: Expense[]
  onExpenseUpdated: () => void
}

export default function ExpensesList({ expenses, onExpenseUpdated }: ExpensesListProps) {
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const groupedByStatus = expenses.reduce((acc, expense) => {
    const status = expense.status
    if (!acc[status]) acc[status] = []
    acc[status].push(expense)
    return acc
  }, {} as Record<string, Expense[]>)

  const handleSubmit = async (id: string) => {
    setSubmittingId(id)
    try {
      const res = await fetch(`/api/expenses/${id}/submit`, {
        method: 'POST',
      })
      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error)
      }
      onExpenseUpdated()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to submit')
    } finally {
      setSubmittingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (res.ok) onExpenseUpdated()
    } catch {
      alert('Failed to delete expense')
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

  const draftExpenses = groupedByStatus['DRAFT'] || []
  const submittedExpenses = groupedByStatus['SUBMITTED'] || []
  const approvedExpenses = groupedByStatus['APPROVED'] || []
  const rejectedExpenses = groupedByStatus['REJECTED'] || []

  const totalDraft = draftExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
  const totalSubmitted = submittedExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
  const totalApproved = approvedExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-brand-gray">Pending</p>
              <p className="text-2xl font-bold text-brand-navy">${totalSubmitted.toFixed(2)}</p>
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
              <p className="text-sm text-brand-gray">Draft</p>
              <p className="text-2xl font-bold text-brand-navy">${totalDraft.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Draft Expenses */}
      {draftExpenses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-brand-navy">Draft Expenses</h3>
            <span className="badge badge-draft">{draftExpenses.length} items</span>
          </div>
          <div className="space-y-3">
            {draftExpenses.map((expense) => (
              <div key={expense.id} className="card group">
                <div className="card-body flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-surface flex items-center justify-center">
                      {expense.receiptPath ? (
                        <svg className="w-6 h-6 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-brand-gray-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-brand-navy">{expense.itemName}</h4>
                      <p className="text-sm text-brand-gray">{formatDate(expense.date)}</p>
                      {expense.description && (
                        <p className="text-sm text-brand-gray-light mt-1">{expense.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-brand-navy">NPR ${parseFloat(expense.amount.toString()).toFixed(2)}</span>
                    <span className={getStatusBadge(expense.status)}>{expense.status}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      <button
                        onClick={() => handleSubmit(expense.id)}
                        disabled={submittingId === expense.id}
                        className="p-2 rounded-xl text-brand-gray hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                        title="Submit for approval"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="p-2 rounded-xl text-brand-gray hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submitted Expenses */}
      {submittedExpenses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-brand-navy">Submitted Expenses</h3>
            <span className="badge badge-submitted">{submittedExpenses.length} items</span>
          </div>
          <div className="space-y-3">
            {submittedExpenses.map((expense) => (
              <div key={expense.id} className="card">
                <div className="card-body flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                      <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-brand-navy">{expense.itemName}</h4>
                      <p className="text-sm text-brand-gray">{formatDate(expense.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-brand-navy">NPR ${parseFloat(expense.amount.toString()).toFixed(2)}</span>
                    <span className={getStatusBadge(expense.status)}>{expense.status}</span>
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Expenses */}
      {approvedExpenses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-brand-navy">Approved Expenses</h3>
            <span className="badge badge-approved">{approvedExpenses.length} items</span>
          </div>
          <div className="space-y-3">
            {approvedExpenses.map((expense) => (
              <div key={expense.id} className="card">
                <div className="card-body flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-brand-navy">{expense.itemName}</h4>
                      <p className="text-sm text-brand-gray">{formatDate(expense.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-brand-navy">NPR ${parseFloat(expense.amount.toString()).toFixed(2)}</span>
                    <span className={getStatusBadge(expense.status)}>{expense.status}</span>
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejected Expenses */}
      {rejectedExpenses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-brand-navy">Rejected Expenses</h3>
            <span className="badge badge-rejected">{rejectedExpenses.length} items</span>
          </div>
          <div className="space-y-3">
            {rejectedExpenses.map((expense) => (
              <div key={expense.id} className="card">
                <div className="card-body flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-brand-navy">{expense.itemName}</h4>
                      <p className="text-sm text-brand-gray">{formatDate(expense.date)}</p>
                      {expense.rejectReason && (
                        <p className="text-sm text-red-500 mt-1">Reason: {expense.rejectReason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-brand-navy">NPR ${parseFloat(expense.amount.toString()).toFixed(2)}</span>
                    <span className={getStatusBadge(expense.status)}>{expense.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {expenses.length === 0 && (
        <div className="card">
          <div className="card-body text-center py-16">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-blue/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-brand-navy">No expenses yet</h3>
            <p className="text-brand-gray mt-1">Add your first expense to get started</p>
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
