import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, hashPassword } from '@/lib/auth'
import { adminUpdateUserSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/api'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const validated = adminUpdateUserSchema.parse(body)

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Guard: an admin cannot demote or deactivate themselves
    if (target.id === session.userId) {
      if (validated.role && validated.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'You cannot change your own role' },
          { status: 400 }
        )
      }
      if (validated.isActive === false) {
        return NextResponse.json(
          { error: 'You cannot deactivate your own account' },
          { status: 400 }
        )
      }
    }

    const data: Record<string, unknown> = {}
    if (validated.name !== undefined) data.name = validated.name
    if (validated.role !== undefined) data.role = validated.role
    if (validated.isActive !== undefined) data.isActive = validated.isActive
    if (validated.password !== undefined) data.passwordHash = await hashPassword(validated.password)

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.UPDATE,
      entity: AuditEntities.USER,
      entityId: id,
      oldData: { name: target.name, role: target.role, isActive: target.isActive },
      newData: { ...data, passwordHash: data.passwordHash ? '[redacted]' : undefined },
    })

    return NextResponse.json({ user })
  } catch (error) {
    return handleApiError(error, 'Admin update user')
  }
}
