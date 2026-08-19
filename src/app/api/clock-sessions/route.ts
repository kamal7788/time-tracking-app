import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { timeToStoredDate, timeStringToMinutes, parseEntryDate } from '@/lib/utils'
import { handleApiError, parseDateParam } from '@/lib/api'
import { assertProjectAccess } from '@/lib/projects'
import { findTimeEntryOverlap } from '@/lib/time-entries'

const clockActionSchema = z.object({
  action: z.enum(['clockIn', 'clockOut']),
  projectId: z.string().max(64).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
})

/** Returns the wall-clock "HH:MM" and local "YYYY-MM-DD" for an instant in a timezone. */
function wallClockInZone(date: Date, timeZone: string): { hhmm: string; dateKey: string } {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date)
    const get = (type: string) => parts.find((p) => p.type === type)?.value || ''
    const hour = get('hour') === '24' ? '00' : get('hour')
    return {
      hhmm: `${hour}:${get('minute')}`,
      dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    }
  } catch {
    // Unknown/invalid timezone — fall back to UTC
    return {
      hhmm: date.toISOString().slice(11, 16),
      dateKey: date.toISOString().slice(0, 10),
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const startDate = parseDateParam(searchParams.get('startDate'))
    const endDate = parseDateParam(searchParams.get('endDate'))

    const where: Record<string, unknown> = { userId: session.userId }

    if (status && ['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
      where.status = status
    }

    if (startDate && endDate) {
      const endInclusive = new Date(endDate)
      endInclusive.setUTCDate(endInclusive.getUTCDate() + 1)
      where.clockIn = { gte: startDate, lt: endInclusive }
    }

    const clockSessions = await prisma.clockSession.findMany({
      where,
      include: {
        project: {
          include: { client: true },
        },
      },
      orderBy: { clockIn: 'desc' },
      take: 500,
    })

    return NextResponse.json({ clockSessions })
  } catch (error) {
    return handleApiError(error, 'Get clock sessions')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { action, projectId, description } = clockActionSchema.parse(body)

    if (action === 'clockIn') {
      if (projectId) {
        const access = await assertProjectAccess(projectId, session)
        if (!access.ok) {
          return NextResponse.json({ error: access.error }, { status: access.status })
        }
      }

      // Get user's timezone
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { timeZone: true },
      })

      try {
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
      } catch (error) {
        // Partial unique index (one ACTIVE session per user) guards against races
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return NextResponse.json(
            { error: 'You already have an active clock-in session' },
            { status: 400 }
          )
        }
        throw error
      }
    }

    if (action === 'clockOut') {
      const clockOut = new Date()

      const activeSession = await prisma.clockSession.findFirst({
        where: { userId: session.userId, status: 'ACTIVE' },
        include: { project: { include: { client: true } } },
      })

      if (!activeSession) {
        return NextResponse.json(
          { error: 'No active clock-in session found' },
          { status: 400 }
        )
      }

      // Atomically claim the session — guards against double clock-out races
      const claimed = await prisma.clockSession.updateMany({
        where: { id: activeSession.id, status: 'ACTIVE' },
        data: { clockOut, status: 'COMPLETED' },
      })

      if (claimed.count === 0) {
        return NextResponse.json(
          { error: 'No active clock-in session found' },
          { status: 400 }
        )
      }

      // Real elapsed minutes from timestamps, rounded to the nearest 15 minutes
      const elapsed = Math.round((clockOut.getTime() - activeSession.clockIn.getTime()) / 60000)
      const duration = Math.max(15, Math.round(elapsed / 15) * 15)

      const clockSession = await prisma.clockSession.update({
        where: { id: activeSession.id },
        data: { duration },
        include: { project: { include: { client: true } } },
      })

      let warning: string | undefined

      // Create a time entry from the clock session
      if (activeSession.projectId) {
        const tz = activeSession.timeZone || 'Asia/Kathmandu'
        const startWall = wallClockInZone(activeSession.clockIn, tz)
        const endWall = wallClockInZone(clockOut, tz)
        const entryDate = parseEntryDate(startWall.dateKey)
        const startTime = timeToStoredDate(startWall.hhmm)
        const endTime = timeToStoredDate(endWall.hhmm)

        if (entryDate && startTime && endTime) {
          const startMin = timeStringToMinutes(startWall.hhmm)
          let endMin = timeStringToMinutes(endWall.hhmm)
          if (startWall.dateKey !== endWall.dateKey || endMin <= startMin) endMin += 1440

          const overlap = await findTimeEntryOverlap(session.userId, entryDate, startMin, endMin)

          if (overlap.overlaps) {
            warning =
              'Clock-out completed, but no time entry was created because it overlaps an existing entry. Please add it manually.'
          } else {
            const timeEntry = await prisma.timeEntry.create({
              data: {
                userId: session.userId,
                projectId: activeSession.projectId,
                date: entryDate,
                startTime,
                endTime,
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
        }
      }

      await createAuditLog({
        userId: session.userId,
        action: AuditActions.UPDATE,
        entity: 'ClockSession',
        entityId: clockSession.id,
        oldData: { status: 'ACTIVE', clockOut: null },
        newData: { status: 'COMPLETED', clockOut, duration },
      })

      return NextResponse.json({ clockSession, warning })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return handleApiError(error, 'Clock session')
  }
}
