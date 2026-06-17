import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import LeaveTypesManager from '@/components/leave-types-manager'

export default async function LeaveTypesPage() {
  const session = await getSession()
  if (!session) return null

  const leaveTypes = await prisma.leaveType.findMany({
    include: {
      _count: {
        select: { leaveBalances: true, leaveRequests: true },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave Types</h1>
        <p className="text-gray-600">Manage available leave types for your organization</p>
      </div>
      <LeaveTypesManager leaveTypes={leaveTypes} />
    </div>
  )
}