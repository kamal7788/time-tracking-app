import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { clientSchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { handleApiError } from '@/lib/api'

export async function GET() {
  try {
    const session = await requireAuth()

    const where: Record<string, unknown> = { isActive: true }
    if (session.role !== 'ADMIN') {
      where.OR = [
        { isPersonal: false },
        { managerId: session.userId },
      ]
    } else {
      where.isPersonal = false
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ clients })
  } catch (error) {
    return handleApiError(error, 'Get clients error:')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const validated = clientSchema.parse(body)

    const isPersonal = session.role !== 'ADMIN'

    const client = await prisma.client.create({
      data: {
        name: validated.name,
        description: validated.description,
        managerId: session.userId,
        isPersonal,
      },
    })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.CREATE,
      entity: AuditEntities.CLIENT,
      entityId: client.id,
      newData: { name: client.name, description: client.description, isPersonal },
    })

    return NextResponse.json({ client }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Create client error:')
  }
}
