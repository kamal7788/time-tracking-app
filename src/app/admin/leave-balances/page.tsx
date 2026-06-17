import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import LeaveBalanceAllocator from '@/components/leave-balance-allocator'

export default async function LeaveBalancesPage() {
  const session = await getSession()
  if (!session) return null

  const currentYear = new Date().getFullYear()

  const [users, leaveTypes, balances] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    prisma.leaveType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.leaveBalance.findMany({
      where: { year: currentYear },
      include: {
        user: { select: { id: true, name: true, email: true } },
        leaveType: true,
      },
      orderBy: [
        { user: { name: 'asc' } },
        { leaveType: { sortOrder: 'asc' } },
      ],
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave Balances</h1>
        <p className="text-gray-600">Allocate leave balances to employees</p>
      </div>
      <LeaveBalanceAllocator 
        users={users} 
        leaveTypes={leaveTypes} 
        balances={balances}
        year={currentYear}
      />
    </div>
  )
}