import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { projectSchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'

async function authorizeProjectAccess(id: string, userId: string, role: string) {
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) return null
  if (role === 'ADMIN' && !project.isPersonal) return project
  if (project.managerId === userId && project.isPersonal) return project
  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const project = await authorizeProjectAccess(id, session.userId, session.role)
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const fullProject = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        manager: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json({ project: fullProject })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get project error:', error)
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
    const validated = projectSchema.parse(body)

    const existingProject = await authorizeProjectAccess(id, session.userId, session.role)
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Verify the new client is accessible
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

    const project = await prisma.project.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description,
        clientId: validated.clientId,
      },
      include: {
        client: true,
      },
    })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.UPDATE,
      entity: AuditEntities.PROJECT,
      entityId: project.id,
      oldData: {
        name: existingProject.name,
        description: existingProject.description,
        clientId: existingProject.clientId,
      },
      newData: {
        name: project.name,
        description: project.description,
        clientId: project.clientId,
      },
    })

    return NextResponse.json({ project })
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
    console.error('Update project error:', error)
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

    const existingProject = await authorizeProjectAccess(id, session.userId, session.role)
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const withEntries = await prisma.project.findUnique({
      where: { id },
      include: { timeEntries: true },
    })

    if (withEntries && withEntries.timeEntries.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete project with time entries' },
        { status: 400 }
      )
    }

    await prisma.project.update({
      where: { id },
      data: { isActive: false },
    })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.DELETE,
      entity: AuditEntities.PROJECT,
      entityId: id,
      oldData: { name: existingProject.name, description: existingProject.description, clientId: existingProject.clientId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Delete project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
