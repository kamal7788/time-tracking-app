import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireAuth } from '@/lib/auth'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { calculateDuration } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = { userId: session.userId }

    if (status) {
      where.status = status
    }

    if (startDate && endDate) {
      where.clockIn = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const clockSessions = await prisma.clockSession.findMany({
      where,
      include: {
        project: {
          include: { client: true },
        },
      },
      orderBy: { clockIn: 'desc' },
    })

    return NextResponse.json({ clockSessions })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get clock sessions error:', error)
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
    const { action, projectId, description } = body

    if (action === 'clockIn') {
      // Check if user already has an active session
      const activeSession = await prisma.clockSession.findFirst({
        where: {
          userId: session.userId,
          status: 'ACTIVE',
        },
      })

      if (activeSession) {
        return NextResponse.json(
          { error: 'You already have an active clock-in session' },
          { status: 400 }
        )
      }

      // Get user's timezone
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { timeZone: true },
      })

      const clockSession = await prisma.clockSession.create({
        data: {
          userId: session.userId,
          projectId: projectId || null,
          clockIn: new Date(),
          description: description || null,
          timeZone: user?.timeZone || 'Asia/Kathmandu',
          status: 'ACTIVE',
        },
        include: {
          project: {
            include: { client: true },
          },
        },
      })

      await createAuditLog({
        userId: session.userId,
        action: AuditActions.CREATE,
        entity: 'ClockSession',
        entityId: clockSession.id,
        newData: { clockIn: clockSession.clockIn, projectId: clockSession.projectId },
      })

      return NextResponse.json({ clockSession }, { status: 201 })
    }

    if (action === 'clockOut') {
      const activeSession = await prisma.clockSession.findFirst({
        where: {
          userId: session.userId,
          status: 'ACTIVE',
        },
      })

      if (!activeSession) {
        return NextResponse.json(
          { error: 'No active clock-in session found' },
          { status: 400 }
        )
      }

      const clockOut = new Date()
      const duration = calculateDuration(
        activeSession.clockIn.toISOString().substr(11, 5),
        clockOut.toISOString().substr(11, 5)
      )

      const clockSession = await prisma.clockSession.update({
        where: { id: activeSession.id },
        data: {
          clockOut,
          duration,
          status: 'COMPLETED',
        },
        include: {
          project: {
            include: { client: true },
          },
        },
      })

      // Create a time entry from the clock session
      if (activeSession.projectId) {
        const timeEntry = await prisma.timeEntry.create({
          data: {
            userId: session.userId,
            projectId: activeSession.projectId,
            date: activeSession.clockIn,
            startTime: new Date(`1970-01-01T${activeSession.clockIn.toISOString().substr(11, 5)}:00`),
            endTime: new Date(`1970-01-01T${clockOut.toISOString().substr(11, 5)}:00`),
            duration,
            description: activeSession.description || 'Clock in/out session',
            status: 'DRAFT',
          },
        })

        await createAuditLog({
          userId: session.userId,
          action: AuditActions.CREATE,
          entity: AuditEntities.TIME_ENTRY,
          entityId: timeEntry.id,
          newData: { 
            clockSessionId: activeSession.id,
            projectId: timeEntry.projectId,
            date: timeEntry.date,
            duration: timeEntry.duration,
          },
        })
      }

      await createAuditLog({
        userId: session.userId,
        action: AuditActions.UPDATE,
        entity: 'ClockSession',
        entityId: clockSession.id,
        oldData: { status: 'ACTIVE', clockOut: null },
        newData: { status: 'COMPLETED', clockOut, duration },
      })

      return NextResponse.json({ clockSession })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Clock session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}