import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { sendTimeEntryApprovedEmail, sendTimeEntryRejectedEmail } from '@/lib/email'
import { sendNotification } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const projectId = searchParams.get('projectId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}

    if (userId) {
      where.userId = userId
    }

    if (status) {
      where.status = status
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    if (projectId) {
      where.projectId = projectId
    }

    const [timeEntries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          project: {
            include: {
              client: true,
            },
          },
        },
        orderBy: [
          { date: 'desc' },
          { user: { name: 'asc' } },
          { startTime: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.timeEntry.count({ where }),
    ])

    return NextResponse.json({
      timeEntries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Admin get time entries error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const { timeEntryIds, action, rejectReason } = body

    if (!timeEntryIds || !Array.isArray(timeEntryIds) || timeEntryIds.length === 0) {
      return NextResponse.json(
        { error: 'Time entry IDs are required' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    if (action === 'reject' && !rejectReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    const entries = await prisma.timeEntry.findMany({
      where: {
        id: { in: timeEntryIds },
        status: 'SUBMITTED',
      },
      include: {
        user: true,
        project: {
          include: { client: true },
        },
      },
    })

    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'No valid submitted entries found' },
        { status: 400 }
      )
    }

    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'
    const now = new Date()

    await prisma.timeEntry.updateMany({
      where: { id: { in: timeEntryIds } },
      data: {
        status: newStatus,
        [action === 'approve' ? 'approvedAt' : 'rejectedAt']: now,
        [action === 'approve' ? 'approvedBy' : 'rejectedBy']: session.userId,
        ...(action === 'reject' ? { rejectReason } : {}),
      },
    })

    for (const entry of entries) {
      await createAuditLog({
        userId: session.userId,
        action: action === 'approve' ? AuditActions.APPROVE : AuditActions.REJECT,
        entity: AuditEntities.TIME_ENTRY,
        entityId: entry.id,
        oldData: { status: 'SUBMITTED' },
        newData: { 
          status: newStatus, 
          [action === 'approve' ? 'approvedAt' : 'rejectedAt']: now,
          [action === 'approve' ? 'approvedBy' : 'rejectedBy']: session.userId,
          rejectReason: action === 'reject' ? rejectReason : undefined,
        },
      })

      // Send email to user
      if (entry.user) {
        if (action === 'approve') {
          await sendTimeEntryApprovedEmail(entry.user.email, entry.user.name, entry.date, entry.date)
        } else {
          await sendTimeEntryRejectedEmail(entry.user.email, entry.user.name, entry.date, entry.date, rejectReason || '')
        }

        await sendNotification({
          userId: entry.user.id,
          type: action === 'approve' ? 'TIME_ENTRY_APPROVED' : 'TIME_ENTRY_REJECTED',
          title: `Time Entry ${action === 'approve' ? 'Approved' : 'Rejected'}`,
          message: `Your time entry for ${entry.project.client.name} - ${entry.project.name} on ${entry.date.toLocaleDateString()} was ${action === 'approve' ? 'approved' : 'rejected'}.`,
          senderId: session.userId,
          metadata: { timeEntryId: entry.id, projectId: entry.projectId },
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      updatedCount: entries.length,
      action,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Admin approve/reject error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}