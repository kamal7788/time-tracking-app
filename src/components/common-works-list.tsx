'use client'

import { useState } from 'react'
import { formatDuration } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { commonWorkSchema, type CommonWorkInput } from '@/lib/validations'

interface CommonWork {
  id: string
  name: string
  description: string | null
  projectId: string
  defaultDuration: number | null
  project: { name: string; client: { name: string } }
}

interface CommonWorksListProps {
  commonWorks: CommonWork[]
  projects: Array<{ id: string; name: string; client: { name: string } }>
}

export default function CommonWorksList({ commonWorks, projects }: CommonWorksListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CommonWorkInput>({
    resolver: zodResolver(commonWorkSchema),
  })

  const onSubmit = async (data: CommonWorkInput) => {
    try {
      if (editingId) {
        const res = await fetch(`/api/common-works/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Failed to update')
      } else {
        const res = await fetch('/api/common-works', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Failed to create')
      }
      reset()
      setIsAdding(false)
      setEditingId(null)
      window.location.reload()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Operation failed')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this common work?')) return
    try {
      const res = await fetch(`/api/common-works/${id}`, { method: 'DELETE' })
      if (res.ok) window.location.reload()
    } catch (error) {
      alert('Failed to delete')
    }
  }

  const startEditing = (work: CommonWork) => {
    setEditingId(work.id)
    setIsAdding(true)
    reset({
      name: work.name,
      description: work.description || '',
      projectId: work.projectId,
      defaultDuration: work.defaultDuration || 60,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setIsAdding(true); setEditingId(null); reset(); }}
          className="btn-primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Common Work
        </button>
      </div>

      {isAdding && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">{editingId ? 'Edit' : 'Add'} Common Work</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">Name <span className="text-red-500">*</span></label>
                <input {...register('name')} className="input" placeholder="e.g., Morning Standup" />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Description</label>
                <input {...register('description')} className="input" placeholder="Brief description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                  {errors.projectId && <p className="text-sm text-red-600">{errors.projectId.message}</p>}
                </div>
                <div>
                  <label className="label">Default Duration (minutes)</label>
                  <select {...register('defaultDuration', { valueAsNumber: true })} className="input">
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                    <option value={180}>3 hours</option>
                    <option value={240}>4 hours</option>
                  </select>
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
        {commonWorks.length === 0 ? (
          <div className="card-body text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No common works</h3>
            <p className="mt-1 text-sm text-gray-500">Add quick-add templates for frequent tasks</p>
          </div>
        ) : (
          <div className="divide-y">
            {commonWorks.map((work) => (
              <div key={work.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{work.name}</p>
                  <p className="text-sm text-gray-600">
                    {work.project.client.name} - {work.project.name}
                  </p>
                  {work.description && (
                    <p className="text-sm text-gray-500 mt-1">{work.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {work.defaultDuration && (
                    <span className="text-sm text-gray-500">{formatDuration(work.defaultDuration)}</span>
                  )}
                  <button onClick={() => startEditing(work)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(work.id)} className="text-gray-400 hover:text-red-600">
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
  )
}