import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { clientSchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'

async function authorizeClientAccess(id: string, userId: string, role: string) {
  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) return null
  if (role === 'ADMIN' && !client.isPersonal) return client
  if (client.managerId === userId && client.isPersonal) return client
  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const client = await authorizeClientAccess(id, session.userId, session.role)
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    const fullClient = await prisma.client.findUnique({
      where: { id },
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
        projects: {
          where: { isActive: true },
          include: {
            manager: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ client: fullClient })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const validated = clientSchema.parse(body)

    const existingClient = await authorizeClientAccess(id, session.userId, session.role)
    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description,
      },
    })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.UPDATE,
      entity: AuditEntities.CLIENT,
      entityId: client.id,
      oldData: { name: existingClient.name, description: existingClient.description },
      newData: { name: client.name, description: client.description },
    })

    return NextResponse.json({ client })
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
    console.error('Update client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const existingClient = await authorizeClientAccess(id, session.userId, session.role)
    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    const withProjects = await prisma.client.findUnique({
      where: { id },
      include: { projects: true },
    })

    if (withProjects && withProjects.projects.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete client with active projects' },
        { status: 400 }
      )
    }

    await prisma.client.update({
      where: { id },
      data: { isActive: false },
    })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.DELETE,
      entity: AuditEntities.CLIENT,
      entityId: id,
      oldData: { name: existingClient.name, description: existingClient.description },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Delete client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
