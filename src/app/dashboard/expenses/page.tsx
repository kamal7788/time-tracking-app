'use client'

import { useState, useEffect, useCallback } from 'react'
import ExpensesList from '@/components/expenses-list'
import AddExpenseModal from '@/components/add-expense-modal'

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

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch('/api/expenses')
      const data = await res.json()
      if (res.ok) {
        setExpenses(data.expenses)
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy tracking-tight">Expenses</h1>
          <p className="text-brand-gray mt-1">Submit and track your expense reports</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </button>
      </div>

      {isLoading ? (
        <div className="card">
          <div className="card-body text-center py-16">
            <svg className="animate-spin w-8 h-8 mx-auto text-brand-blue" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-brand-gray mt-4">Loading expenses...</p>
          </div>
        </div>
      ) : (
        <ExpensesList expenses={expenses} onExpenseUpdated={fetchExpenses} />
      )}

      <AddExpenseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onExpenseAdded={fetchExpenses}
      />
    </div>
  )
}
