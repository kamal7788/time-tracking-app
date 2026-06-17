import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import PersonalTemplatesManager from '@/components/personal-templates-manager'

export default async function MyTemplatesPage() {
  const session = await getSession()
  if (!session) return null

  const clients = await prisma.client.findMany({
    where: { isActive: true, isPersonal: true, managerId: session.userId },
    include: {
      projects: {
        where: { isActive: true, isPersonal: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Templates</h1>
        <p className="text-gray-600">Create personal clients and projects to use as templates for time entries</p>
      </div>
      <PersonalTemplatesManager clients={clients} />
    </div>
  )
}
