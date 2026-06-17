import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { clientSchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'

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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get clients error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }
    console.error('Create client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
