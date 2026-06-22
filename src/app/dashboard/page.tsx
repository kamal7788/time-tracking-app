import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getWeekDates, formatDate, formatDuration, getWeekStart, getWeekEnd } from '@/lib/utils'
import DashboardWeekView from '@/components/dashboard-week-view'
import QuickAddTimeEntry from '@/components/quick-add-time-entry'
import ClockInOut from '@/components/clock-in-out'
import Link from 'next/link'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getSession()
  
  if (!session) return null

  const params = await searchParams
  const weekParam = typeof params.week === 'string' ? params.week : undefined
  const referenceDate = weekParam ? new Date(weekParam) : new Date()

  const weekStart = getWeekStart(referenceDate)
  const weekEnd = getWeekEnd(referenceDate)

  // Calculate prev/week week dates for navigation
  const prevWeekDate = new Date(weekStart)
  prevWeekDate.setDate(prevWeekDate.getDate() - 7)
  const nextWeekDate = new Date(weekStart)
  nextWeekDate.setDate(nextWeekDate.getDate() + 7)

  const prevWeekParam = prevWeekDate.toISOString().split('T')[0]
  const nextWeekParam = nextWeekDate.toISOString().split('T')[0]

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

  // Group entries by day
  const entriesByDay = new Map<string, typeof timeEntries>()
  for (const entry of timeEntries) {
    const dayKey = entry.date.toISOString().split('T')[0]
    if (!entriesByDay.has(dayKey)) {
      entriesByDay.set(dayKey, [])
    }
    entriesByDay.get(dayKey)!.push(entry)
  }

  // Calculate totals
  const totalMinutes = timeEntries.reduce((sum: number, e: { duration: number }) => sum + e.duration, 0)
  const dayTotals = new Map<string, number>()
  for (const [day, entries] of entriesByDay) {
    dayTotals.set(day, entries.reduce((sum: number, e: { duration: number }) => sum + e.duration, 0))
  }

  const weekDates = getWeekDates(referenceDate)

  const isCurrentWeek = weekStart.toISOString().split('T')[0] === getWeekStart(new Date()).toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-3 mt-1">
            <Link
              href={`/dashboard?week=${prevWeekParam}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <p className="text-gray-600">
              Week of {formatDate(weekStart)} - {formatDate(weekEnd)}
            </p>
            <Link
              href={`/dashboard?week=${nextWeekParam}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            {!isCurrentWeek && (
              <Link
                href="/dashboard"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Current Week
              </Link>
            )}
          </div>
        </div>
        <QuickAddTimeEntry projects={projects} commonWorks={commonWorks} />
      </div>

      {/* Clock In/Out + Weekly Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ClockInOut projects={projects} />
        </div>
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card">
              <div className="card-body">
                <p className="text-sm text-gray-600">Total Hours This Week</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{formatDuration(totalMinutes)}</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="text-sm text-gray-600">Entries This Week</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{timeEntries.length}</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="text-sm text-gray-600">Days Worked</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{entriesByDay.size}</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="text-sm text-gray-600">Average Hours/Day</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {entriesByDay.size > 0 ? formatDuration(Math.round(totalMinutes / entriesByDay.size)) : '0h'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Week View */}
      <DashboardWeekView 
        weekDates={weekDates} 
        entriesByDay={entriesByDay}
        dayTotals={dayTotals}
      />
    </div>
  )
}
