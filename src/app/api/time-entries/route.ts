import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireAuth } from '@/lib/auth'
import { timeEntrySchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { calculateDuration, timeStringToMinutes, formatTime } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')
    const projectId = searchParams.get('projectId')

    const where: Record<string, unknown> = {
      userId: session.userId,
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    if (status) {
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
    })

    return NextResponse.json({ timeEntries })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get time entries error:', error)
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
    const validated = timeEntrySchema.parse(body)

    const duration = calculateDuration(validated.startTime, validated.endTime)

    // Check for overlapping entries on the same date
    const entryDate = new Date(validated.date)
    const newStartMinutes = timeStringToMinutes(validated.startTime)
    const newEndMinutes = timeStringToMinutes(validated.endTime)

    const existingEntries = await prisma.timeEntry.findMany({
      where: {
        userId: session.userId,
        date: entryDate,
        status: { not: 'REJECTED' },
      },
    })

    for (const existing of existingEntries) {
      const existStartMinutes = timeStringToMinutes(formatTime(existing.startTime))
      const existEndMinutes = timeStringToMinutes(formatTime(existing.endTime))
      
      if (newStartMinutes < existEndMinutes && existStartMinutes < newEndMinutes) {
        return NextResponse.json(
          { error: `Time entry overlaps with existing entry from ${formatTime(existing.startTime)} to ${formatTime(existing.endTime)}` },
          { status: 400 }
        )
      }
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId: session.userId,
        projectId: validated.projectId,
        date: new Date(validated.date),
        startTime: new Date(`1970-01-01T${validated.startTime}:00`),
        endTime: new Date(`1970-01-01T${validated.endTime}:00`),
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
        startTime: timeEntry.startTime,
        endTime: timeEntry.endTime,
        duration: timeEntry.duration,
        description: timeEntry.description,
      },
    })

    return NextResponse.json({ timeEntry }, { status: 201 })
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
    console.error('Create time entry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}