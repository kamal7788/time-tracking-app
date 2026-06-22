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
      const startMinutes = 9 * 60
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-lifted max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-brand-navy">Add Time Entry</h3>
                <p className="text-sm text-brand-gray mt-0.5">Log your work hours</p>
              </div>
              <button onClick={() => { setIsOpen(false); setFormError('') }} className="p-2 rounded-xl text-brand-gray hover:text-brand-navy hover:bg-brand-surface transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formError}
                </div>
              )}

              {commonWorks.length > 0 && (
                <div className="border-b border-gray-100 pb-5">
                  <label className="label">Quick Add from Templates</label>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {commonWorks.map((work) => (
                      <button
                        type="button"
                        key={work.id}
                        onClick={() => handleCommonWorkSelect(work)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-200 ${
                          selectedCommonWork === work.id
                            ? 'border-brand-blue bg-brand-blue/5'
                            : 'border-gray-100 hover:border-gray-200 hover:bg-brand-surface/50'
                        }`}
                      >
                        <div className="font-semibold text-sm text-brand-navy">{work.name}</div>
                        <div className="text-xs text-brand-gray mt-0.5">
                          {work.project.client.name} / {work.project.name}
                          {work.defaultDuration && <span className="text-brand-gray-light ml-1">• {work.defaultDuration} min</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="label">Project</label>
                <select {...register('projectId')} className="input">
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.client.name} - {p.name}
                    </option>
                  ))}
                </select>
                {errors.projectId && <p className="text-sm text-red-500 mt-1.5 font-medium">{errors.projectId.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Date</label>
                  <input type="date" {...register('date')} className="input" />
                  {errors.date && <p className="text-sm text-red-500 mt-1.5 font-medium">{errors.date.message}</p>}
                </div>
                <div>
                  <label className="label">Start Time</label>
                  <input type="time" {...register('startTime')} className="input" step={900} />
                  {errors.startTime && <p className="text-sm text-red-500 mt-1.5 font-medium">{errors.startTime.message}</p>}
                </div>
                <div>
                  <label className="label">End Time</label>
                  <input type="time" {...register('endTime')} className="input" step={900} />
                  {errors.endTime && <p className="text-sm text-red-500 mt-1.5 font-medium">{errors.endTime.message}</p>}
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
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Adding...
                    </span>
                  ) : 'Add Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
