import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getWeekDates, formatDate, formatDuration, getWeekStart, getWeekEnd } from '@/lib/utils'
import DashboardWeekView from '@/components/dashboard-week-view'
import QuickAddTimeEntry from '@/components/quick-add-time-entry'

export default async function DashboardPage() {
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

  const weekDates = getWeekDates()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Week of {formatDate(weekStart)} - {formatDate(weekEnd)}
          </p>
        </div>
        <QuickAddTimeEntry projects={projects} commonWorks={commonWorks} />
      </div>

      {/* Weekly Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Week View */}
      <DashboardWeekView 
        weekDates={weekDates} 
        entriesByDay={entriesByDay}
        dayTotals={dayTotals}
      />
    </div>
  )
}