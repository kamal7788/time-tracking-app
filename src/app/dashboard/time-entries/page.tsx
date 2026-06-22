import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getWeekStart, getWeekEnd, formatDate } from '@/lib/utils'
import TimeEntriesList from '@/components/time-entries-list'
import Link from 'next/link'

export default async function TimeEntriesPage({
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
      { date: 'desc' },
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

  const clockSessions = await prisma.clockSession.findMany({
    where: {
      userId: session.userId,
      clockIn: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    include: {
      project: { include: { client: true } },
    },
    orderBy: { clockIn: 'desc' },
  })

  const isCurrentWeek = weekStart.toISOString().split('T')[0] === getWeekStart(new Date()).toISOString().split('T')[0]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy tracking-tight">Time Entries</h1>
          <div className="flex items-center gap-3 mt-2">
            <Link
              href={`/dashboard/time-entries?week=${prevWeekParam}`}
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
              href={`/dashboard/time-entries?week=${nextWeekParam}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 border-gray-200 bg-white text-brand-gray hover:bg-brand-surface hover:border-gray-300 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            {!isCurrentWeek && (
              <Link
                href="/dashboard/time-entries"
                className="text-sm text-brand-blue hover:text-brand-blue-dark font-semibold transition-colors"
              >
                Current Week
              </Link>
            )}
          </div>
        </div>
      </div>

      <TimeEntriesList 
        timeEntries={timeEntries} 
        clockSessions={clockSessions}
        projects={projects}
        commonWorks={commonWorks}
        weekStart={weekStart.toISOString()}
        weekEnd={weekEnd.toISOString()}
      />
    </div>
  )
}
