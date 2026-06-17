'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
})

const projectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  clientId: z.string().min(1, 'Client is required'),
})

interface Client {
  id: string
  name: string
  description: string | null
  manager: { id: string; name: string; email: string }
  projects: Array<{
    id: string
    name: string
    description: string | null
    manager: { id: string; name: string }
  }>
}

interface ClientsProjectsManagerProps {
  clients: Client[]
}

export default function ClientsProjectsManager({ clients }: ClientsProjectsManagerProps) {
  const [activeTab, setActiveTab] = useState<'clients' | 'projects'>('clients')
  const [isAddingClient, setIsAddingClient] = useState(false)
  const [isAddingProject, setIsAddingProject] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { register: regClient, handleSubmit: submitClient, reset: resetClient, formState: { errors: clientErrors, isSubmitting: clientSubmitting } } = useForm({
    resolver: zodResolver(clientSchema),
  })

  const { register: regProject, handleSubmit: submitProject, reset: resetProject, formState: { errors: projectErrors, isSubmitting: projectSubmitting } } = useForm({
    resolver: zodResolver(projectSchema),
  })

  const onAddClient = async (data: { name: string; description?: string }) => {
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setSuccess('Client created successfully')
      resetClient()
      setIsAddingClient(false)
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create client')
    }
  }

  const onAddProject = async (data: { name: string; description?: string; clientId: string }) => {
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setSuccess('Project created successfully')
      resetProject()
      setIsAddingProject(false)
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create project')
    }
  }

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Delete this client? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      window.location.reload()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete')
    }
  }

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      window.location.reload()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('clients')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'clients' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500'
          }`}
        >
          Clients ({clients.length})
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'projects' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500'
          }`}
        >
          Projects ({clients.reduce((sum, c) => sum + c.projects.length, 0)})
        </button>
      </div>

      {/* Clients Tab */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setIsAddingClient(!isAddingClient)} className="btn-primary">
              {isAddingClient ? 'Cancel' : 'Add Client'}
            </button>
          </div>

          {isAddingClient && (
            <div className="card">
              <div className="card-header"><h3 className="font-semibold">New Client</h3></div>
              <div className="card-body">
                <form onSubmit={submitClient(onAddClient)} className="space-y-4">
                  <div>
                    <label className="label">Client Name *</label>
                    <input {...regClient('name')} className="input" placeholder="Client name" />
                    {clientErrors.name && <p className="text-sm text-red-600">{clientErrors.name.message}</p>}
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <textarea {...regClient('description')} className="input" rows={2} placeholder="Optional description" />
                  </div>
                  <button type="submit" disabled={clientSubmitting} className="btn-primary">
                    {clientSubmitting ? 'Creating...' : 'Create Client'}
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {clients.map((client) => (
              <div key={client.id} className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                      {client.description && <p className="text-sm text-gray-500">{client.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">{client.projects.length} project(s)</p>
                    </div>
                    <button onClick={() => handleDeleteClient(client.id)} className="text-gray-400 hover:text-red-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  {client.projects.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-primary-200">
                      {client.projects.map((project) => (
                        <div key={project.id} className="flex items-center justify-between py-1">
                          <span className="text-sm text-gray-700">{project.name}</span>
                          {project.description && <span className="text-xs text-gray-400">{project.description}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setIsAddingProject(!isAddingProject)} className="btn-primary">
              {isAddingProject ? 'Cancel' : 'Add Project'}
            </button>
          </div>

          {isAddingProject && (
            <div className="card">
              <div className="card-header"><h3 className="font-semibold">New Project</h3></div>
              <div className="card-body">
                <form onSubmit={submitProject(onAddProject)} className="space-y-4">
                  <div>
                    <label className="label">Project Name *</label>
                    <input {...regProject('name')} className="input" placeholder="Project name" />
                    {projectErrors.name && <p className="text-sm text-red-600">{projectErrors.name.message}</p>}
                  </div>
                  <div>
                    <label className="label">Client *</label>
                    <select {...regProject('clientId')} className="input">
                      <option value="">Select client...</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {projectErrors.clientId && <p className="text-sm text-red-600">{projectErrors.clientId.message}</p>}
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <textarea {...regProject('description')} className="input" rows={2} placeholder="Optional description" />
                  </div>
                  <button type="submit" disabled={projectSubmitting} className="btn-primary">
                    {projectSubmitting ? 'Creating...' : 'Create Project'}
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-body">
              {clients.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No clients yet. Create a client first.</p>
              ) : (
                <div className="space-y-2">
                  {clients.map((client) => (
                    client.projects.map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{project.name}</p>
                          <p className="text-sm text-gray-500">{client.name}</p>
                          {project.description && <p className="text-xs text-gray-400">{project.description}</p>}
                        </div>
                        <button onClick={() => handleDeleteProject(project.id)} className="text-gray-400 hover:text-red-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}