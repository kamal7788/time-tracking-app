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
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-gray-900">Clock In / Out</h2>
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
              className="btn-primary w-full py-3 text-lg"
            >
              {isLoading ? 'Clocking In...' : 'Clock In'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-primary-800">Currently Clocked In</span>
                <span className="text-2xl font-bold text-primary-700 tabular-nums">
                  {formatDuration(elapsedTime)}
                </span>
              </div>
              <div className="text-sm text-primary-700">
                Since {formatTime(activeSession.clockIn)}
                {activeSession.projectId && (
                  <>
                    {' | '}
                    <span className="font-medium">
                      {projects.find(p => p.id === activeSession.projectId)?.client.name} - 
                      {projects.find(p => p.id === activeSession.projectId)?.name}
                    </span>
                  </>
                )}
              </div>
              {activeSession.description && (
                <div className="text-sm text-primary-600 mt-1">{activeSession.description}</div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClockOut}
                disabled={isLoading}
                className="btn-danger flex-1 py-3 text-lg"
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