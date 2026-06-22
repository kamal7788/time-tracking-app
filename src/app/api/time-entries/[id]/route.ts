import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireAuth } from '@/lib/auth'
import { timeEntrySchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { calculateDuration, timeStringToMinutes, formatTime } from '@/lib/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id,
        userId: session.userId,
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
    })

    if (!timeEntry) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ timeEntry })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get time entry error:', error)
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
    const validated = timeEntrySchema.parse(body)

    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        id,
        userId: session.userId,
      },
    })

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    if (existingEntry.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot edit submitted time entries' },
        { status: 400 }
      )
    }

    const duration = calculateDuration(validated.startTime, validated.endTime)

    // Check for overlapping entries on the same date (excluding self)
    const entryDate = new Date(validated.date)
    const newStartMinutes = timeStringToMinutes(validated.startTime)
    const newEndMinutes = timeStringToMinutes(validated.endTime)

    const existingEntries = await prisma.timeEntry.findMany({
      where: {
        userId: session.userId,
        date: entryDate,
        id: { not: id },
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

    const timeEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        projectId: validated.projectId,
        date: new Date(validated.date),
        startTime: new Date(`1970-01-01T${validated.startTime}:00`),
        endTime: new Date(`1970-01-01T${validated.endTime}:00`),
        duration,
        description: validated.description,
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
      action: AuditActions.UPDATE,
      entity: AuditEntities.TIME_ENTRY,
      entityId: timeEntry.id,
      oldData: {
        projectId: existingEntry.projectId,
        date: existingEntry.date,
        startTime: existingEntry.startTime,
        endTime: existingEntry.endTime,
        duration: existingEntry.duration,
        description: existingEntry.description,
      },
      newData: {
        projectId: timeEntry.projectId,
        date: timeEntry.date,
        startTime: timeEntry.startTime,
        endTime: timeEntry.endTime,
        duration: timeEntry.duration,
        description: timeEntry.description,
      },
    })

    return NextResponse.json({ timeEntry })
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
    console.error('Update time entry error:', error)
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

    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        id,
        userId: session.userId,
      },
    })

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    if (existingEntry.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot delete submitted time entries' },
        { status: 400 }
      )
    }

    await prisma.timeEntry.delete({ where: { id } })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.DELETE,
      entity: AuditEntities.TIME_ENTRY,
      entityId: id,
      oldData: {
        projectId: existingEntry.projectId,
        date: existingEntry.date,
        startTime: existingEntry.startTime,
        endTime: existingEntry.endTime,
        duration: existingEntry.duration,
        description: existingEntry.description,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Delete time entry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}