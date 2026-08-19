import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { timeEntrySchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { calculateDuration, timeStringToMinutes, parseEntryDate, timeToStoredDate } from '@/lib/utils'
import { handleApiError, parseDateParam } from '@/lib/api'
import { assertProjectAccess } from '@/lib/projects'
import { findTimeEntryOverlap } from '@/lib/time-entries'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const startDate = parseDateParam(searchParams.get('startDate'))
    const endDate = parseDateParam(searchParams.get('endDate'))
    const status = searchParams.get('status')
    const projectId = searchParams.get('projectId')

    const where: Record<string, unknown> = {
      userId: session.userId,
    }

    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate }
    }

    if (status && ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status
    }

    if (projectId) {
      where.projectId = projectId
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where,
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { startTime: 'asc' },
      ],
      take: 1000,
    })

    return NextResponse.json({ timeEntries })
  } catch (error) {
    return handleApiError(error, 'Get time entries')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const validated = timeEntrySchema.parse(body)

    const access = await assertProjectAccess(validated.projectId, session)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const entryDate = parseEntryDate(validated.date)
    const startTime = timeToStoredDate(validated.startTime)
    const endTime = timeToStoredDate(validated.endTime)
    if (!entryDate || !startTime || !endTime) {
      return NextResponse.json({ error: 'Invalid date or time' }, { status: 400 })
    }

    const duration = calculateDuration(validated.startTime, validated.endTime)
    const newStartMinutes = timeStringToMinutes(validated.startTime)
    let newEndMinutes = timeStringToMinutes(validated.endTime)
    if (newEndMinutes <= newStartMinutes) newEndMinutes += 1440 // overnight

    const overlap = await findTimeEntryOverlap(
      session.userId,
      entryDate,
      newStartMinutes,
      newEndMinutes
    )
    if (overlap.overlaps) {
      return NextResponse.json({ error: overlap.message }, { status: 400 })
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId: session.userId,
        projectId: validated.projectId,
        date: entryDate,
        startTime,
        endTime,
        duration,
        description: validated.description,
        status: 'DRAFT',
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
    })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.CREATE,
      entity: AuditEntities.TIME_ENTRY,
      entityId: timeEntry.id,
      newData: {
        projectId: timeEntry.projectId,
        date: timeEntry.date,
        startTime: validated.startTime,
        endTime: validated.endTime,
        duration: timeEntry.duration,
        description: timeEntry.description,
      },
    })

    return NextResponse.json({ timeEntry }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Create time entry')
  }
}
