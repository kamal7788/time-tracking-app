import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { formatDuration } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')
    const format = searchParams.get('format') // 'json', 'csv', 'pdf'

    const where: Record<string, unknown> = {
      status: { in: ['SUBMITTED', 'APPROVED'] },
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    if (userId) {
      where.userId = userId
    }

    if (projectId) {
      where.projectId = projectId
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        project: {
          include: {
            client: true,
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { user: { name: 'asc' } },
      ],
    })

    // Aggregate by user
    const userStats = new Map<string, {
      user: { id: string; name: string; email: string }
      totalMinutes: number
      entries: number
      projects: Map<string, { name: string; client: string; minutes: number }>
      days: Map<string, number>
    }>()

    // Aggregate by project/client
    const projectStats = new Map<string, {
      project: { id: string; name: string; client: string }
      totalMinutes: number
      entries: number
      users: Map<string, { name: string; minutes: number }>
    }>()

    for (const entry of timeEntries) {
      // User stats
      if (!userStats.has(entry.userId)) {
        userStats.set(entry.userId, {
          user: entry.user,
          totalMinutes: 0,
          entries: 0,
          projects: new Map(),
          days: new Map(),
        })
      }
      const uStats = userStats.get(entry.userId)!
      uStats.totalMinutes += entry.duration
      uStats.entries += 1
      const dayKey = entry.date.toISOString().split('T')[0]
      uStats.days.set(dayKey, (uStats.days.get(dayKey) || 0) + entry.duration)

      const projectKey = entry.projectId
      if (!uStats.projects.has(projectKey)) {
        uStats.projects.set(projectKey, {
          name: entry.project.name,
          client: entry.project.client.name,
          minutes: 0,
        })
      }
      uStats.projects.get(projectKey)!.minutes += entry.duration

      // Project stats
      if (!projectStats.has(entry.projectId)) {
        projectStats.set(entry.projectId, {
          project: {
            id: entry.project.id,
            name: entry.project.name,
            client: entry.project.client.name,
          },
          totalMinutes: 0,
          entries: 0,
          users: new Map(),
        })
      }
      const pStats = projectStats.get(entry.projectId)!
      pStats.totalMinutes += entry.duration
      pStats.entries += 1
      if (!pStats.users.has(entry.userId)) {
        pStats.users.set(entry.userId, { name: entry.user.name, minutes: 0 })
      }
      pStats.users.get(entry.userId)!.minutes += entry.duration
    }

    const report = {
      summary: {
        totalEntries: timeEntries.length,
        totalMinutes: timeEntries.reduce((sum: number, e: { duration: number }) => sum + e.duration, 0),
        totalHours: timeEntries.reduce((sum: number, e: { duration: number }) => sum + e.duration, 0) / 60,
        uniqueUsers: userStats.size,
        uniqueProjects: projectStats.size,
        dateRange: { start: startDate, end: endDate },
      },
      byUser: Array.from(userStats.values()).map(u => ({
        user: u.user,
        totalHours: u.totalMinutes / 60,
        totalFormatted: formatDuration(u.totalMinutes),
        entries: u.entries,
        projects: Array.from(u.projects.entries()).map(([id, p]) => ({
          projectId: id,
          ...p,
          hours: p.minutes / 60,
          formatted: formatDuration(p.minutes),
        })),
        daysWorked: u.days.size,
        averageHoursPerDay: u.days.size > 0 ? (u.totalMinutes / 60) / u.days.size : 0,
      })),
      byProject: Array.from(projectStats.values()).map(p => ({
        project: p.project,
        totalHours: p.totalMinutes / 60,
        totalFormatted: formatDuration(p.totalMinutes),
        entries: p.entries,
        users: Array.from(p.users.entries()).map(([id, u]) => ({
          userId: id,
          ...u,
          hours: u.minutes / 60,
          formatted: formatDuration(u.minutes),
        })),
      })),
      rawEntries: timeEntries.map((e: any) => ({
        id: e.id,
        user: e.user.name,
        userEmail: e.user.email,
        date: e.date.toISOString().split('T')[0],
        startTime: e.startTime.toISOString().substr(11, 5),
        endTime: e.endTime.toISOString().substr(11, 5),
        duration: e.duration,
        formattedDuration: formatDuration(e.duration),
        project: e.project.name,
        client: e.project.client.name,
        description: e.description,
        status: e.status,
        submittedAt: e.submittedAt?.toISOString(),
        approvedAt: e.approvedAt?.toISOString(),
      })),
    }

    if (format === 'csv') {
      return generateCSV(report)
    }

    if (format === 'pdf') {
      return generatePDF(report)
    }

    return NextResponse.json(report)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Reports error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateCSV(report: any) {
  const headers = [
    'Date', 'User', 'User Email', 'Client', 'Project', 
    'Start Time', 'End Time', 'Duration (min)', 'Duration', 
    'Description', 'Status'
  ]
  
  const rows = report.rawEntries.map((e: any) => [
    e.date,
    e.user,
    e.userEmail,
    e.client,
    e.project,
    e.startTime,
    e.endTime,
    e.duration,
    e.formattedDuration,
    e.description || '',
    e.status,
  ])

  const csv = [headers.join(','), ...rows.map((r: any) => r.map((v: any) => `"${v}"`).join(','))].join('\n')
  
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="time-report-${report.summary.dateRange.start}-to-${report.summary.dateRange.end}.csv"`,
    },
  })
}

function generatePDF(report: any) {
  // This would require a PDF generation library
  // For now, return JSON with a note
  return NextResponse.json({ 
    ...report, 
    note: 'PDF generation not implemented. Use CSV export or implement with jsPDF.' 
  })
}