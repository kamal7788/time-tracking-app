import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import LeaveRequestForm from '@/components/leave-request-form'
import LeaveBalanceList from '@/components/leave-balance-list'
import LeaveRequestsList from '@/components/leave-requests-list'

export default async function LeavesPage() {
  const session = await getSession()
  if (!session) return null

  const currentYear = new Date().getFullYear()

  const leaveTypes = await prisma.leaveType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  const balances = await prisma.leaveBalance.findMany({
    where: {
      userId: session.userId,
      year: currentYear,
    },
    include: { leaveType: true },
    orderBy: { leaveType: { sortOrder: 'asc' } },
  })

  const leaveRequests = await prisma.leaveRequest.findMany({
    where: { userId: session.userId },
    include: { leaveType: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Leaves</h1>
          <p className="text-gray-600">Request time off and view your leave balances</p>
        </div>
        <LeaveRequestForm leaveTypes={leaveTypes} />
      </div>

      <LeaveBalanceList balances={balances} year={currentYear} />

      <LeaveRequestsList requests={leaveRequests} />
    </div>
  )
}