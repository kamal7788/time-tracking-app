import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireAuth } from '@/lib/auth'
import { createAuditLog, AuditActions } from '@/lib/audit'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { action } = body

    const clockSession = await prisma.clockSession.findFirst({
      where: { id, userId: session.userId },
    })

    if (!clockSession) {
      return NextResponse.json(
        { error: 'Clock session not found' },
        { status: 404 }
      )
    }

    if (action === 'cancel' && clockSession.status === 'ACTIVE') {
      const updated = await prisma.clockSession.update({
        where: { id },
        data: { status: 'CANCELLED' },
      })

      await createAuditLog({
        userId: session.userId,
        action: AuditActions.UPDATE,
        entity: 'ClockSession',
        entityId: id,
        oldData: { status: 'ACTIVE' },
        newData: { status: 'CANCELLED' },
      })

      return NextResponse.json({ clockSession: updated })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Cancel clock session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const clockSession = await prisma.clockSession.findFirst({
      where: { id, userId: session.userId },
      include: {
        project: {
          include: { client: true },
        },
      },
    })

    if (!clockSession) {
      return NextResponse.json(
        { error: 'Clock session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ clockSession })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get clock session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}