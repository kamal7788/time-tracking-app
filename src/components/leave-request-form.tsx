'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { formatDuration } from '@/lib/utils'

const leaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1, 'Leave type is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().optional(),
}).refine((data) => {
  return new Date(data.endDate) >= new Date(data.startDate)
}, {
  message: 'End date must be after or equal to start date',
  path: ['endDate'],
})

interface LeaveType {
  id: string
  name: string
}

interface LeaveRequestFormProps {
  leaveTypes: LeaveType[]
}

export default function LeaveRequestForm({ leaveTypes }: LeaveRequestFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<z.infer<typeof leaveRequestSchema>>({
    resolver: zodResolver(leaveRequestSchema),
  })

  const startDate = watch('startDate')
  const endDate = watch('endDate')

  const calculateDays = () => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const onSubmit = async (data: z.infer<typeof leaveRequestSchema>) => {
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to submit request')

      setSuccess('Leave request submitted successfully!')
      reset()
      setTimeout(() => {
        setIsOpen(false)
        window.location.reload()
      }, 1500)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn-primary">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Request Leave
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Request Leave</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <div>
                <label className="label">Leave Type</label>
                <select {...register('leaveTypeId')} className="input">
                  <option value="">Select leave type...</option>
                  {leaveTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
                {errors.leaveTypeId && (
                  <p className="text-sm text-red-600 mt-1">{errors.leaveTypeId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date</label>
                  <input type="date" {...register('startDate')} className="input" />
                  {errors.startDate && (
                    <p className="text-sm text-red-600 mt-1">{errors.startDate.message}</p>
                  )}
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input type="date" {...register('endDate')} className="input" />
                  {errors.endDate && (
                    <p className="text-sm text-red-600 mt-1">{errors.endDate.message}</p>
                  )}
                </div>
              </div>

              {startDate && endDate && (
                <div className="bg-primary-50 p-3 rounded-lg">
                  <p className="text-sm text-primary-700">
                    Total days: <span className="font-bold">{calculateDays()}</span>
                  </p>
                </div>
              )}

              <div>
                <label className="label">Reason (Optional)</label>
                <textarea {...register('reason')} className="input" rows={3} placeholder="Enter reason for leave..." />
              </div>

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setIsOpen(false)} className="btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}