import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getWeekStart, getWeekEnd, formatDate, formatDuration } from '@/lib/utils'
import AdminStats from '@/components/admin-stats'

export default async function AdminDashboardPage() {
  const session = await getSession()
  if (!session) return null

  const weekStart = getWeekStart()
  const weekEnd = getWeekEnd()

  const [pendingEntries, pendingLeaves, totalUsers, recentEntries] = await Promise.all([
    prisma.timeEntry.count({
      where: { status: 'SUBMITTED' },
    }),
    prisma.leaveRequest.count({
      where: { status: 'PENDING' },
    }),
    prisma.user.count({
      where: { role: 'USER' },
    }),
    prisma.timeEntry.findMany({
      where: {
        status: 'SUBMITTED',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { include: { client: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 10,
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Overview of time tracking and leave requests</p>
      </div>

      <AdminStats
        pendingEntries={pendingEntries}
        pendingLeaves={pendingLeaves}
        totalUsers={totalUsers}
        recentEntries={recentEntries}
      />
    </div>
  )
}