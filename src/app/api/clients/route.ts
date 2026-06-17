import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { clientSchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'

export async function GET() {
  try {
    await requireAdmin()

    const clients = await prisma.client.findMany({
      where: { isActive: true },
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
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
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
    const session = await requireAdmin()
    const body = await request.json()
    const validated = clientSchema.parse(body)

    const client = await prisma.client.create({
      data: {
        name: validated.name,
        description: validated.description,
        managerId: session.userId,
      },
    })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.CREATE,
      entity: AuditEntities.CLIENT,
      entityId: client.id,
      newData: { name: client.name, description: client.description },
    })

    return NextResponse.json({ client }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
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