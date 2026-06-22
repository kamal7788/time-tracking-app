'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { timeEntrySchema, type TimeEntryInput } from '@/lib/validations'

interface QuickAddTimeEntryProps {
  projects: Array<{
    id: string
    name: string
    client: { name: string }
  }>
  commonWorks: Array<{
    id: string
    name: string
    description: string | null
    projectId: string
    defaultDuration: number | null
    project: { name: string; client: { name: string } }
  }>
}

export default function QuickAddTimeEntry({ projects, commonWorks }: QuickAddTimeEntryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCommonWork, setSelectedCommonWork] = useState<string>('')
  const [formError, setFormError] = useState('')

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<TimeEntryInput>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
    },
  })

  const onSubmit = async (data: TimeEntryInput) => {
    setFormError('')
    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      reset({ date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '10:00' })
      setIsOpen(false)
      window.location.reload()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to add time entry')
    }
  }

  const handleCommonWorkSelect = (work: typeof commonWorks[0]) => {
    setSelectedCommonWork(work.id)
    setValue('projectId', work.projectId)
    setValue('description', work.description || '')
    if (work.defaultDuration) {
      const startMinutes = 9 * 60 // 9:00 AM
      const endMinutes = startMinutes + work.defaultDuration
      setValue('startTime', `${Math.floor(startMinutes / 60).toString().padStart(2, '0')}:${(startMinutes % 60).toString().padStart(2, '0')}`)
      setValue('endTime', `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`)
    }
  }

  return (
    <>
      <button
        onClick={() => { setIsOpen(true); setFormError('') }}
        className="btn-primary"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Time Entry
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Add Time Entry</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{formError}</div>
              )}
              {commonWorks.length > 0 && (
                <div className="border-b pb-4">
                  <label className="label">Quick Add from Common Works</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {commonWorks.map((work) => (
                      <button
                        type="button"
                        key={work.id}
                        onClick={() => handleCommonWorkSelect(work)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedCommonWork === work.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-sm">{work.name}</div>
                        <div className="text-xs text-gray-500">
                          {work.project.client.name} - {work.project.name}
                          {work.defaultDuration && ` • ${work.defaultDuration} min`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="label">Project <span className="text-red-500">*</span></label>
                <select {...register('projectId')} className="input">
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.client.name} - {p.name}
                    </option>
                  ))}
                </select>
                {errors.projectId && <p className="text-sm text-red-600 mt-1">{errors.projectId.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date <span className="text-red-500">*</span></label>
                  <input type="date" {...register('date')} className="input" />
                  {errors.date && <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>}
                </div>
                <div>
                  <label className="label">Start Time <span className="text-red-500">*</span></label>
                  <input type="time" {...register('startTime')} className="input" step={900} />
                  {errors.startTime && <p className="text-sm text-red-600 mt-1">{errors.startTime.message}</p>}
                </div>
                <div>
                  <label className="label">End Time <span className="text-red-500">*</span></label>
                  <input type="time" {...register('endTime')} className="input" step={900} />
                  {errors.endTime && <p className="text-sm text-red-600 mt-1">{errors.endTime.message}</p>}
                </div>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea {...register('description')} rows={2} className="input" placeholder="What did you work on?" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setIsOpen(false); setFormError('') }} className="btn-outline flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Adding...' : 'Add Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}