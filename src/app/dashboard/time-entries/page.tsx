import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getWeekBoundsUTC, parseWeekParam, entryDateKey } from '@/lib/utils'
import TimeEntriesList from '@/components/time-entries-list'
import Link from 'next/link'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons'

export default async function TimeEntriesPage({
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
        lte: new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000),
      },
    },
    include: {
      project: { include: { client: true } },
    },
    orderBy: { clockIn: 'desc' },
  })

  const isCurrentWeek = entryDateKey(weekStart) === entryDateKey(getWeekBoundsUTC(new Date()).start)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy tracking-tight">Time Entries</h1>
          <div className="flex items-center gap-3 mt-2">
            <Link
              href={`/dashboard/time-entries?week=${prevWeekParam}`}
              aria-label="Previous week"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-brand-border bg-white text-brand-gray hover:bg-brand-surface transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </Link>
            <p className="text-brand-gray font-medium text-sm sm:text-base">
              Week of {entryDateKey(weekStart)} — {entryDateKey(weekEnd)}
            </p>
            <Link
              href={`/dashboard/time-entries?week=${nextWeekParam}`}
              aria-label="Next week"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-brand-border bg-white text-brand-gray hover:bg-brand-surface transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </Link>
            {!isCurrentWeek && (
              <Link
                href="/dashboard/time-entries"
                className="text-sm text-brand-blue hover:text-brand-blue-dark font-medium transition-colors"
              >
                Current week
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
        weekStart={entryDateKey(weekStart)}
        weekEnd={entryDateKey(weekEnd)}
      />
    </div>
  )
}
