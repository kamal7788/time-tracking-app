'use client'

import { useState } from 'react'

export default function AdminReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [report, setReport] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const generateReport = async (format: string = 'json') => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ startDate, endDate, format })
      const res = await fetch(`/api/admin/reports?${params}`)
      
      if (format === 'csv') {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `time-report-${startDate}-to-${endDate}.csv`
        a.click()
        URL.revokeObjectURL(url)
        return
      }

      const data = await res.json()
      setReport(data)
    } catch (error) {
      console.error('Report error:', error)
      alert('Failed to generate report')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600">Generate time tracking reports</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold">Date Range</h3>
        </div>
        <div className="card-body">
          <div className="flex gap-4 items-end">
            <div>
              <label className="label">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
            </div>
            <button onClick={() => generateReport('json')} disabled={isLoading} className="btn-primary">
              {isLoading ? 'Generating...' : 'Generate Report'}
            </button>
            <button onClick={() => generateReport('csv')} disabled={isLoading} className="btn-outline">
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <div className="card-body">
                <p className="text-sm text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold text-gray-900">{report.summary.totalEntries}</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{report.summary.totalHours.toFixed(1)}h</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="text-sm text-gray-600">Unique Users</p>
                <p className="text-2xl font-bold text-gray-900">{report.summary.uniqueUsers}</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="text-sm text-gray-600">Projects</p>
                <p className="text-2xl font-bold text-gray-900">{report.summary.uniqueProjects}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Hours by User</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                {report.byUser.map((user: any) => (
                  <div key={user.user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{user.user.name}</p>
                      <p className="text-sm text-gray-500">{user.entries} entries, {user.daysWorked} days</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary-600">{user.totalFormatted}</p>
                      <p className="text-xs text-gray-500">{user.averageHoursPerDay.toFixed(1)}h/day avg</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Hours by Project</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                {report.byProject.map((project: any) => (
                  <div key={project.project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{project.project.name}</p>
                      <p className="text-sm text-gray-500">{project.project.client} - {project.entries} entries</p>
                    </div>
                    <p className="font-semibold text-primary-600">{project.totalFormatted}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}