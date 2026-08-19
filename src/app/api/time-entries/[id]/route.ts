import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { timeEntrySchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { calculateDuration, timeStringToMinutes, parseEntryDate, timeToStoredDate } from '@/lib/utils'
import { handleApiError } from '@/lib/api'
import { assertProjectAccess } from '@/lib/projects'
import { findTimeEntryOverlap } from '@/lib/time-entries'

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
    return handleApiError(error, 'Get time entry')
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
      newEndMinutes,
      id
    )
    if (overlap.overlaps) {
      return NextResponse.json({ error: overlap.message }, { status: 400 })
    }

    const timeEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        projectId: validated.projectId,
        date: entryDate,
        startTime,
        endTime,
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
        duration: existingEntry.duration,
        description: existingEntry.description,
      },
      newData: {
        projectId: timeEntry.projectId,
        date: timeEntry.date,
        startTime: validated.startTime,
        endTime: validated.endTime,
        duration: timeEntry.duration,
        description: timeEntry.description,
      },
    })

    return NextResponse.json({ timeEntry })
  } catch (error) {
    return handleApiError(error, 'Update time entry')
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
      },
    })

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    // Only allow owner to delete DRAFT, admin can delete any
    if (existingEntry.userId !== session.userId && session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }

    if (existingEntry.status !== 'DRAFT' && session.role !== 'ADMIN') {
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
        duration: existingEntry.duration,
        description: existingEntry.description,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'Delete time entry')
  }
}
