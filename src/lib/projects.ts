import { prisma } from './prisma'
import type { JWTPayload } from './auth'

/**
 * Verifies a user may log time against a project:
 * - project must exist and be active
 * - admins: any project
 * - users: company projects (not personal) or their own personal projects
 */
export async function assertProjectAccess(
  projectId: string,
  session: JWTPayload
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, isActive: true, isPersonal: true, managerId: true },
  })

  if (!project) {
    return { ok: false, status: 404, error: 'Project not found' }
  }
  if (!project.isActive) {
    return { ok: false, status: 400, error: 'Project is inactive' }
  }
  if (session.role !== 'ADMIN' && project.isPersonal && project.managerId !== session.userId) {
    return { ok: false, status: 404, error: 'Project not found' }
  }
  return { ok: true }
}
