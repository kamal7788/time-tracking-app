import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getWeekStart, getWeekEnd, formatDate } from '@/lib/utils'
import AdminTimeEntriesList from '@/components/admin-time-entries-list'

export default async function AdminTimeEntriesPage() {
  const session = await getSession()
  if (!session) return null

  const timeEntries = await prisma.timeEntry.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      project: { include: { client: true } },
    },
    orderBy: [
      { date: 'desc' },
      { user: { name: 'asc' } },
    ],
  })

  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  const projects = await prisma.project.findMany({
    where: { isActive: true },
    include: { client: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Time Entries</h1>
        <p className="text-gray-600">Review and manage employee time entries</p>
      </div>
      <AdminTimeEntriesList 
        timeEntries={timeEntries} 
        users={users} 
        projects={projects} 
      />
    </div>
  )
}