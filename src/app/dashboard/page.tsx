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

  const entriesByDay = new Map<string, typeof timeEntries>()
  for (const entry of timeEntries) {
    const dayKey = entry.date.toISOString().split('T')[0]
    if (!entriesByDay.has(dayKey)) {
      entriesByDay.set(dayKey, [])
    }
    entriesByDay.get(dayKey)!.push(entry)
  }

  const totalMinutes = timeEntries.reduce((sum: number, e: { duration: number }) => sum + e.duration, 0)
  const dayTotals = new Map<string, number>()
  for (const [day, entries] of entriesByDay) {
    dayTotals.set(day, entries.reduce((sum: number, e: { duration: number }) => sum + e.duration, 0))
  }

  const weekDates = getWeekDates(referenceDate)
  const isCurrentWeek = weekStart.toISOString().split('T')[0] === getWeekStart(new Date()).toISOString().split('T')[0]

  const stats = [
    { label: 'Total Hours', value: formatDuration(totalMinutes), icon: '⏱' },
    { label: 'Entries', value: timeEntries.length.toString(), icon: '📋' },
    { label: 'Days Worked', value: entriesByDay.size.toString(), icon: '📅' },
    { label: 'Avg/Day', value: entriesByDay.size > 0 ? formatDuration(Math.round(totalMinutes / entriesByDay.size)) : '0h', icon: '📊' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-3 mt-2">
            <Link
              href={`/dashboard?week=${prevWeekParam}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 border-gray-200 bg-white text-brand-gray hover:bg-brand-surface hover:border-gray-300 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <p className="text-brand-gray font-medium">
              Week of {formatDate(weekStart)} - {formatDate(weekEnd)}
            </p>
            <Link
              href={`/dashboard?week=${nextWeekParam}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 border-gray-200 bg-white text-brand-gray hover:bg-brand-surface hover:border-gray-300 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            {!isCurrentWeek && (
              <Link
                href="/dashboard"
                className="text-sm text-brand-blue hover:text-brand-blue-dark font-semibold transition-colors"
              >
                Current Week
              </Link>
            )}
          </div>
        </div>
        <QuickAddTimeEntry projects={projects} commonWorks={commonWorks} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card group">
            <div className="card-body flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center text-xl group-hover:bg-brand-blue/15 transition-colors">
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-brand-gray font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-brand-navy tracking-tight">{stat.value}</p>
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
