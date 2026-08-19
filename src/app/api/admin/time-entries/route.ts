import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { approvalSchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { sendTimeEntryApprovedEmail, sendTimeEntryRejectedEmail } from '@/lib/email'
import { sendNotification } from '@/lib/notifications'
import { handleApiError, getPagination, parseDateParam } from '@/lib/api'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const startDate = parseDateParam(searchParams.get('startDate'))
    const endDate = parseDateParam(searchParams.get('endDate'))
    const projectId = searchParams.get('projectId')
    const { page, limit, skip } = getPagination(searchParams, 50, 200)

    const where: Record<string, unknown> = {}

    if (userId) {
      where.userId = userId
    }

    if (status && ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status
    }

    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate }
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
        skip,
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
    return handleApiError(error, 'Admin get time entries')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const { timeEntryIds, action, rejectReason } = approvalSchema.parse(body)

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

    const validIds = entries.map((e) => e.id)
    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'
    const now = new Date()

    // Only flip rows that are still SUBMITTED — prevents smuggled IDs of other statuses
    await prisma.timeEntry.updateMany({
      where: { id: { in: validIds }, status: 'SUBMITTED' },
      data: {
        status: newStatus,
        [action === 'approve' ? 'approvedAt' : 'rejectedAt']: now,
        [action === 'approve' ? 'approvedBy' : 'rejectedBy']: session.userId,
        ...(action === 'reject' ? { rejectReason } : {}),
      },
    })

    const sideEffects = entries.map(async (entry) => {
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

      if (entry.user) {
        const dateStr = entry.date.toISOString().split('T')[0]
        if (action === 'approve') {
          await sendTimeEntryApprovedEmail(entry.user.email, entry.user.name, entry.date, entry.date)
        } else {
          await sendTimeEntryRejectedEmail(entry.user.email, entry.user.name, entry.date, entry.date, rejectReason || '')
        }

        await sendNotification({
          userId: entry.user.id,
          type: action === 'approve' ? 'TIME_ENTRY_APPROVED' : 'TIME_ENTRY_REJECTED',
          title: `Time Entry ${action === 'approve' ? 'Approved' : 'Rejected'}`,
          message: `Your time entry for ${entry.project.client.name} - ${entry.project.name} on ${dateStr} was ${action === 'approve' ? 'approved' : 'rejected'}.`,
          senderId: session.userId,
          metadata: { timeEntryId: entry.id, projectId: entry.projectId },
        })
      }
    })

    // Side effects must not fail the whole request after the state change succeeded
    await Promise.allSettled(sideEffects)

    return NextResponse.json({
      success: true,
      updatedCount: entries.length,
      action,
    })
  } catch (error) {
    return handleApiError(error, 'Admin approve/reject')
  }
}
