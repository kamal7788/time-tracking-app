import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getWeekBoundsUTC, parseWeekParam, entryDateKey, formatDuration } from '@/lib/utils'
import DashboardWeekView from '@/components/dashboard-week-view'
import QuickAddTimeEntry from '@/components/quick-add-time-entry'
import ClockInOut from '@/components/clock-in-out'
import Link from 'next/link'
import { ClockIcon, CalendarIcon, ChartIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getSession()

  if (!session) return null

  const params = await searchParams
  const weekParam = typeof params.week === 'string' ? params.week : undefined
  const referenceDate = parseWeekParam(weekParam) || new Date()

  const { start: weekStart, end: weekEnd } = getWeekBoundsUTC(referenceDate)

  const prevWeekDate = new Date(weekStart)
  prevWeekDate.setUTCDate(prevWeekDate.getUTCDate() - 7)
  const nextWeekDate = new Date(weekStart)
  nextWeekDate.setUTCDate(nextWeekDate.getUTCDate() + 7)

  const prevWeekParam = entryDateKey(prevWeekDate)
  const nextWeekParam = entryDateKey(nextWeekDate)

  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      userId: session.userId,
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    include: {
      project: {
        include: { client: true },
      },
    },
    orderBy: [
      { date: 'asc' },
      { startTime: 'asc' },
    ],
  })

  const projects = await prisma.project.findMany({
    where: {
      isActive: true,
      OR: [
        { isPersonal: false },
        { managerId: session.userId },
      ],
    },
    include: { client: true },
    orderBy: { name: 'asc' },
  })

  const commonWorks = await prisma.commonWork.findMany({
    where: { userId: session.userId },
    include: { project: { include: { client: true } } },
    orderBy: { name: 'asc' },
  })

  interface DashboardEntry {
    id: string
    date: string
    startTime: string
    endTime: string
    duration: number
    description: string | null
    status: string
    project: {
      name: string
      client: { name: string }
    }
  }

  const entriesByDay = new Map<string, DashboardEntry[]>()
  for (const entry of timeEntries) {
    const dayKey = entryDateKey(entry.date)
    if (!entriesByDay.has(dayKey)) {
      entriesByDay.set(dayKey, [])
    }
    entriesByDay.get(dayKey)!.push({
      id: entry.id,
      date: entryDateKey(entry.date),
      startTime: entry.startTime,
      endTime: entry.endTime,
      duration: entry.duration,
      description: entry.description,
      status: entry.status,
      project: {
        name: entry.project.name,
        client: { name: entry.project.client.name },
      },
    })
  }

  const totalMinutes = timeEntries.reduce((sum: number, e: { duration: number }) => sum + e.duration, 0)
  const dayTotals = new Map<string, number>()
  for (const [day, entries] of entriesByDay) {
    dayTotals.set(day, entries.reduce((sum: number, e: { duration: number }) => sum + e.duration, 0))
  }

  const weekDates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setUTCDate(d.getUTCDate() + i)
    weekDates.push(d)
  }

  const isCurrentWeek = entryDateKey(weekStart) === entryDateKey(getWeekBoundsUTC(new Date()).start)

  const stats = [
    { label: 'Total Hours', value: formatDuration(totalMinutes), Icon: ClockIcon },
    { label: 'Entries', value: timeEntries.length.toString(), Icon: CalendarIcon },
    { label: 'Days Worked', value: entriesByDay.size.toString(), Icon: CalendarIcon },
    { label: 'Avg/Day', value: entriesByDay.size > 0 ? formatDuration(Math.round(totalMinutes / entriesByDay.size)) : '0h', Icon: ChartIcon },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-3 mt-2">
            <Link
              href={`/dashboard?week=${prevWeekParam}`}
              aria-label="Previous week"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-brand-border bg-white text-brand-gray hover:bg-brand-surface transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </Link>
            <p className="text-brand-gray font-medium text-sm sm:text-base">
              Week of {entryDateKey(weekStart)} — {entryDateKey(weekEnd)}
            </p>
            <Link
              href={`/dashboard?week=${nextWeekParam}`}
              aria-label="Next week"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-brand-border bg-white text-brand-gray hover:bg-brand-surface transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </Link>
            {!isCurrentWeek && (
              <Link
                href="/dashboard"
                className="text-sm text-brand-blue hover:text-brand-blue-dark font-medium transition-colors"
              >
                Current week
              </Link>
            )}
          </div>
        </div>
        <QuickAddTimeEntry projects={projects} commonWorks={commonWorks} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="card-body flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                <stat.Icon className="w-5 h-5 text-brand-blue" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-brand-gray font-medium uppercase tracking-wide">{stat.label}</p>
                <p className="text-xl font-semibold text-brand-navy tracking-tight tabular-nums">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Clock In/Out + Week View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ClockInOut projects={projects} />
        </div>
        <div className="lg:col-span-2">
          <DashboardWeekView
            weekDates={weekDates}
            entriesByDay={entriesByDay}
            dayTotals={dayTotals}
          />
        </div>
      </div>
    </div>
  )
}
