import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getWeekStart, getWeekEnd, formatDate, formatTime, formatDuration } from '@/lib/utils'
import TimeEntriesList from '@/components/time-entries-list'

export default async function TimeEntriesPage() {
  const session = await getSession()
  if (!session) return null

  const weekStart = getWeekStart()
  const weekEnd = getWeekEnd()

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Time Entries</h1>
          <p className="text-gray-600">
            Week of {formatDate(weekStart)} - {formatDate(weekEnd)}
          </p>
        </div>
      </div>

      <TimeEntriesList 
        timeEntries={timeEntries} 
        clockSessions={clockSessions}
        projects={projects}
        commonWorks={commonWorks}
      />
    </div>
  )
}