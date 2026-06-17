import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import ClientsProjectsManager from '@/components/clients-projects-manager'

export default async function ClientsPage() {
  const session = await getSession()
  if (!session) return null

  const clients = await prisma.client.findMany({
    where: { isActive: true, isPersonal: false },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      projects: {
        where: { isActive: true, isPersonal: false },
        include: {
          manager: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clients & Projects</h1>
        <p className="text-gray-600">Manage clients and their projects</p>
      </div>
      <ClientsProjectsManager clients={clients} />
    </div>
  )
}