import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import CommonWorksList from '@/components/common-works-list'

export default async function CommonWorksPage() {
  const session = await getSession()
  if (!session) return null

  const commonWorks = await prisma.commonWork.findMany({
    where: { userId: session.userId },
    include: {
      project: {
        include: { client: true },
      },
    },
    orderBy: { name: 'asc' },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Common Works</h1>
        <p className="text-gray-600">Manage your quick-add task templates</p>
      </div>
      <CommonWorksList commonWorks={commonWorks} projects={projects} />
    </div>
  )
}