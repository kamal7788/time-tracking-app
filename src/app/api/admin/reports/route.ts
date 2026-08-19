import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { formatDuration, storedTimeToHHMM, entryDateKey } from '@/lib/utils'
import { handleApiError, parseDateParam } from '@/lib/api'

const MAX_REPORT_ROWS = 10000

/** Escapes a CSV cell: quotes embedded quotes and neutralizes formula injection. */
function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value)
  // Neutralize spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

function safeFilenamePart(value: string | null): string {
  if (!value) return 'all'
  const cleaned = value.replace(/[^0-9a-zA-Z-]/g, '')
  return cleaned || 'all'
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const startDateRaw = searchParams.get('startDate')
    const endDateRaw = searchParams.get('endDate')
    const startDate = parseDateParam(startDateRaw)
    const endDate = parseDateParam(endDateRaw)
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')
    const format = searchParams.get('format') // 'json', 'csv', 'pdf'

    if ((startDateRaw && !startDate) || (endDateRaw && !endDate)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 })
    }

    const where: Record<string, unknown> = {
      status: { in: ['SUBMITTED', 'APPROVED'] },
    }

    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate }
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
      take: MAX_REPORT_ROWS,
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
      const dayKey = entryDateKey(entry.date)
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
        totalMinutes: timeEntries.reduce((sum, e) => sum + e.duration, 0),
        totalHours: timeEntries.reduce((sum, e) => sum + e.duration, 0) / 60,
        uniqueUsers: userStats.size,
        uniqueProjects: projectStats.size,
        dateRange: { start: startDateRaw, end: endDateRaw },
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
      rawEntries: timeEntries.map((e) => ({
        id: e.id,
        user: e.user.name,
        userEmail: e.user.email,
        date: entryDateKey(e.date),
        startTime: storedTimeToHHMM(e.startTime),
        endTime: storedTimeToHHMM(e.endTime),
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
      return await generatePDF(report)
    }

    return NextResponse.json(report)
  } catch (error) {
    return handleApiError(error, 'Reports')
  }
}

type ReportData = {
  summary: { dateRange: { start: string | null; end: string | null }; totalHours: number; totalEntries: number }
  rawEntries: Array<{
    date: string; user: string; userEmail: string; client: string; project: string
    startTime: string; endTime: string; duration: number; formattedDuration: string
    description: string | null; status: string
  }>
}

function generateCSV(report: ReportData) {
  const headers = [
    'Date', 'User', 'User Email', 'Client', 'Project',
    'Start Time', 'End Time', 'Duration (min)', 'Duration',
    'Description', 'Status'
  ]

  const rows = report.rawEntries.map((e) => [
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

  const csv = [
    headers.map(csvCell).join(','),
    ...rows.map((r) => r.map(csvCell).join(',')),
  ].join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="time-report-${safeFilenamePart(report.summary.dateRange.start)}-to-${safeFilenamePart(report.summary.dateRange.end)}.csv"`,
    },
  })
}

async function generatePDF(report: ReportData) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'landscape' })

  doc.setFontSize(16)
  doc.text('Time Report', 14, 15)
  doc.setFontSize(10)
  doc.text(
    `Period: ${report.summary.dateRange.start || 'all'} to ${report.summary.dateRange.end || 'all'}  |  Total: ${report.summary.totalHours.toFixed(1)}h across ${report.summary.totalEntries} entries`,
    14,
    23
  )

  autoTable(doc, {
    startY: 28,
    head: [[
      'Date', 'User', 'Client', 'Project', 'Start', 'End', 'Duration', 'Description', 'Status',
    ]],
    body: report.rawEntries.map((e) => [
      e.date,
      e.user,
      e.client,
      e.project,
      e.startTime,
      e.endTime,
      e.formattedDuration,
      (e.description || '').slice(0, 80),
      e.status,
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [5, 63, 181] },
    alternateRowStyles: { fillColor: [244, 246, 249] },
  })

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="time-report-${safeFilenamePart(report.summary.dateRange.start)}-to-${safeFilenamePart(report.summary.dateRange.end)}.pdf"`,
    },
  })
}
