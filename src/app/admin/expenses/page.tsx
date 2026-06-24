'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminExpensesList from '@/components/admin-expenses-list'

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

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/expenses')
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
      <div>
        <h1 className="text-2xl font-bold text-brand-navy tracking-tight">Expense Management</h1>
        <p className="text-brand-gray mt-1">Review and approve employee expense submissions</p>
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
        <AdminExpensesList expenses={expenses} onExpenseUpdated={fetchExpenses} />
      )}
    </div>
  )
}
