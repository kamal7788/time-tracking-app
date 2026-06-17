'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const leaveTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color'),
  icon: z.string().optional(),
  carryoverAllowed: z.boolean().default(false),
  maxCarryoverDays: z.number().int().positive().optional().nullable(),
  carryoverExpiryMonths: z.number().int().positive().optional().nullable(),
  requiresApproval: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

interface LeaveType {
  id: string
  name: string
  description: string | null
  color: string
  icon: string | null
  isActive: boolean
  carryoverAllowed: boolean
  maxCarryoverDays: number | null
  carryoverExpiryMonths: number | null
  requiresApproval: boolean
  sortOrder: number
  _count: { leaveBalances: number; leaveRequests: number }
}

interface LeaveTypesManagerProps {
  leaveTypes: LeaveType[]
}

export default function LeaveTypesManager({ leaveTypes }: LeaveTypesManagerProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(leaveTypeSchema),
    defaultValues: {
      color: '#0ea5e9',
      carryoverAllowed: false,
      requiresApproval: true,
      sortOrder: 0,
    },
  })

  const onSubmit = async (data: z.infer<typeof leaveTypeSchema>) => {
    setSuccess('')
    setError('')
    try {
      if (editingId) {
        const res = await fetch(`/api/leave-types/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error)
      } else {
        const res = await fetch('/api/leave-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error)
      }
      reset()
      setIsAdding(false)
      setEditingId(null)
      setSuccess(editingId ? 'Leave type updated successfully' : 'Leave type created successfully')
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Operation failed')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this leave type?')) return
    try {
      const res = await fetch(`/api/leave-types/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      window.location.reload()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete')
    }
  }

  const startEditing = (type: LeaveType) => {
    setEditingId(type.id)
    setIsAdding(true)
    reset({
      name: type.name,
      description: type.description || '',
      color: type.color,
      icon: type.icon || '',
      carryoverAllowed: type.carryoverAllowed,
      maxCarryoverDays: type.maxCarryoverDays,
      carryoverExpiryMonths: type.carryoverExpiryMonths,
      requiresApproval: type.requiresApproval,
      sortOrder: type.sortOrder,
    })
  }

  return (
    <div className="space-y-4">
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

      <div className="flex justify-end">
        <button
          onClick={() => { setIsAdding(true); setEditingId(null); reset(); }}
          className="btn-primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Leave Type
        </button>
      </div>

      {isAdding && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">{editingId ? 'Edit' : 'Add'} Leave Type</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Name <span className="text-red-500">*</span></label>
                  <input {...register('name')} className="input" placeholder="e.g., Annual Leave" />
                  {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="label">Color</label>
                  <input type="color" {...register('color')} className="h-10 w-full rounded border" />
                </div>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea {...register('description')} rows={2} className="input" placeholder="Brief description of this leave type" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Carryover Allowed</label>
                  <label className="flex items-center gap-2 mt-2">
                    <input type="checkbox" {...register('carryoverAllowed')} className="rounded" />
                    <span className="text-sm">Allow carryover</span>
                  </label>
                </div>
                <div>
                  <label className="label">Max Carryover Days</label>
                  <input
                    type="number"
                    {...register('maxCarryoverDays', { valueAsNumber: true })}
                    className="input"
                    placeholder="Leave blank for unlimited"
                  />
                </div>
                <div>
                  <label className="label">Requires Approval</label>
                  <label className="flex items-center gap-2 mt-2">
                    <input type="checkbox" {...register('requiresApproval')} className="rounded" defaultChecked />
                    <span className="text-sm">Admin approval required</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); }} className="btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {leaveTypes.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No leave types configured</p>
          ) : (
            <div className="space-y-3">
              {leaveTypes.map((type) => (
                <div key={type.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{type.name}</p>
                      {type.description && (
                        <p className="text-sm text-gray-500">{type.description}</p>
                      )}
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        <span>{type._count.leaveBalances} balances</span>
                        <span>{type._count.leaveRequests} requests</span>
                        {type.carryoverAllowed && <span className="text-green-600">Carryover enabled</span>}
                        {type.requiresApproval && <span className="text-yellow-600">Requires approval</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEditing(type)} className="text-gray-400 hover:text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(type.id)} className="text-gray-400 hover:text-red-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}