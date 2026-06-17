import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { projectSchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    const where: Record<string, unknown> = { isActive: true }
    if (session.role !== 'ADMIN') {
      where.OR = [
        { isPersonal: false },
        { managerId: session.userId },
      ]
    } else {
      where.isPersonal = false
    }
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
    const session = await requireAuth()
    const body = await request.json()
    const validated = projectSchema.parse(body)

    // Verify the client belongs to a company-wide client or user's personal client
    const client = await prisma.client.findUnique({
      where: { id: validated.clientId },
    })
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }
    if (client.isPersonal && client.managerId !== session.userId) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }
    if (!client.isPersonal && session.role !== 'ADMIN') {
      // Employees can create personal projects under company-wide clients
    }

    const isPersonal = session.role !== 'ADMIN'

    const project = await prisma.project.create({
      data: {
        name: validated.name,
        description: validated.description,
        clientId: validated.clientId,
        managerId: session.userId,
        isPersonal,
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
      newData: { name: project.name, description: project.description, clientId: project.clientId, isPersonal },
    })

    return NextResponse.json({ project }, { status: 201 })
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
    console.error('Create project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
