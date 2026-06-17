import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { projectSchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    const where: Record<string, unknown> = { isActive: true }
    if (clientId) {
      where.clientId = clientId
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: true,
        manager: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { timeEntries: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ projects })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get projects error:', error)
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
    const validated = projectSchema.parse(body)

    const project = await prisma.project.create({
      data: {
        name: validated.name,
        description: validated.description,
        clientId: validated.clientId,
        managerId: session.userId,
      },
      include: {
        client: true,
      },
    })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.CREATE,
      entity: AuditEntities.PROJECT,
      entityId: project.id,
      newData: { name: project.name, description: project.description, clientId: project.clientId },
    })

    return NextResponse.json({ project }, { status: 201 })
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
    console.error('Create project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}