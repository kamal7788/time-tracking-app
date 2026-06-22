'use client'

import { useState, useEffect } from 'react'
import { formatTime, formatDuration } from '@/lib/utils'

interface ClockInOutProps {
  projects: Array<{
    id: string
    name: string
    client: { name: string }
  }>
}

export default function ClockInOut({ projects }: ClockInOutProps) {
  const [activeSession, setActiveSession] = useState<{
    id: string
    clockIn: string
    projectId: string | null
    description: string | null
    duration: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [description, setDescription] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    fetchActiveSession()
    const interval = setInterval(fetchActiveSession, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchActiveSession = async () => {
    try {
      const res = await fetch('/api/clock-sessions?status=ACTIVE')
      const data = await res.json()
      if (data.clockSessions && data.clockSessions.length > 0) {
        const session = data.clockSessions[0]
        setActiveSession({
          id: session.id,
          clockIn: session.clockIn,
          projectId: session.projectId,
          description: session.description,
          duration: session.duration || 0,
        })
        if (session.projectId) setSelectedProject(session.projectId)
        if (session.description) setDescription(session.description)
      } else {
        setActiveSession(null)
      }
    } catch (error) {
      console.error('Failed to fetch active session:', error)
    }
  }

  const updateElapsedTime = () => {
    if (activeSession) {
      const now = new Date()
      const clockIn = new Date(activeSession.clockIn)
      const diff = now.getTime() - clockIn.getTime()
      setElapsedTime(Math.floor(diff / 1000 / 60))
    }
  }

  useEffect(() => {
    if (activeSession) {
      updateElapsedTime()
      const interval = setInterval(updateElapsedTime, 1000)
      return () => clearInterval(interval)
    }
  }, [activeSession])

  const handleClockIn = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/clock-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clockIn',
          projectId: selectedProject || undefined,
          description: description || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      fetchActiveSession()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to clock in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClockOut = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/clock-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clockOut' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setActiveSession(null)
      setSelectedProject('')
      setDescription('')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to clock out')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!activeSession) return
    if (!confirm('Cancel this clock-in session?')) return
    try {
      const res = await fetch(`/api/clock-sessions/${activeSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (!res.ok) throw new Error('Failed to cancel')
      setActiveSession(null)
    } catch (error) {
      alert('Failed to cancel session')
    }
  }

  return (
    <div className="card h-full">
      <div className="card-header flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-brand-navy">Clock In / Out</h2>
      </div>
      <div className="card-body">
        {!activeSession ? (
          <div className="space-y-4">
            <div>
              <label className="label">Project (Optional)</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="input"
              >
                <option value="">Select a project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.client.name} - {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Description (Optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input"
                placeholder="What are you working on?"
              />
            </div>
            <button
              onClick={handleClockIn}
              disabled={isLoading}
              className="btn-primary w-full py-3.5 text-base"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Clocking In...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Clock In
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Timer display */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-blue to-brand-blue-dark p-6 text-white">
              <div className="absolute inset-0 bg-white/5" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-white/80">Currently Clocked In</span>
                  <span className="status-dot-active" />
                </div>
                <div className="text-4xl font-bold tracking-tight tabular-nums mb-2">
                  {formatDuration(elapsedTime)}
                </div>
                <div className="text-sm text-white/70">
                  Since {formatTime(activeSession.clockIn)}
                </div>
                {activeSession.projectId && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/15 text-sm font-medium">
                    {projects.find(p => p.id === activeSession.projectId)?.client.name} - 
                    {projects.find(p => p.id === activeSession.projectId)?.name}
                  </div>
                )}
                {activeSession.description && (
                  <div className="mt-2 text-sm text-white/60">{activeSession.description}</div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClockOut}
                disabled={isLoading}
                className="btn-danger flex-1 py-3"
              >
                {isLoading ? 'Clocking Out...' : 'Clock Out'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="btn-outline flex-1 py-3"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
