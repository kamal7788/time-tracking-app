import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import AdminLeaveRequests from '@/components/admin-leave-requests'

export default async function AdminLeavesPage() {
  const session = await getSession()
  if (!session) return null

  const leaveRequests = await prisma.leaveRequest.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      leaveType: true,
      approvedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
        <p className="text-gray-600">Review and manage employee leave requests</p>
      </div>
      <AdminLeaveRequests requests={leaveRequests} users={users} />
    </div>
  )
}