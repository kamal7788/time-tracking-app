import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { sendNotification } from '@/lib/notifications'
import { handleApiError, getPagination, parseDateParam } from '@/lib/api'
import {
  workingDaysBetween,
  splitWorkingDaysByYear,
  debitLeaveBalance,
  refundLeaveBalance,
  getAvailableLeaveDays,
} from '@/lib/leave'
import { z } from 'zod'
import { formatDate } from '@/lib/utils'

const leaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1).max(64),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  reason: z.string().max(2000).optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date must be after or equal to start date',
  path: ['endDate'],
})

const approveRejectSchema = z.object({
  requestIds: z.array(z.string().max(64)).min(1).max(200),
  action: z.enum(['approve', 'reject']),
  rejectReason: z.string().max(1000).optional(),
}).refine((data) => data.action !== 'reject' || data.rejectReason, {
  message: 'Rejection reason is required',
  path: ['rejectReason'],
})

const cancelSchema = z.object({
  requestIds: z.array(z.string().max(64)).min(1).max(200),
  action: z.literal('cancel'),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const yearParam = searchParams.get('year')
    const { page, limit, skip } = getPagination(searchParams)

    const where: Record<string, unknown> = {}

    if (session.role !== 'ADMIN') {
      where.userId = session.userId
    } else {
      const userId = searchParams.get('userId')
      if (userId) where.userId = userId
    }

    if (status && ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      where.status = status
    }

    const year = yearParam ? parseInt(yearParam, 10) : NaN
    if (Number.isFinite(year) && year >= 2000 && year <= 2100) {
      where.startDate = {
        gte: new Date(Date.UTC(year, 0, 1)),
        lte: new Date(Date.UTC(year, 11, 31)),
      }
    }

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          leaveType: true,
          approvedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.leaveRequest.count({ where }),
    ])

    return NextResponse.json({
      requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return handleApiError(error, 'Get leave requests')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const validated = leaveRequestSchema.parse(body)

    const leaveType = await prisma.leaveType.findUnique({
      where: { id: validated.leaveTypeId },
    })

    if (!leaveType || !leaveType.isActive) {
      return NextResponse.json(
        { error: 'Invalid leave type' },
        { status: 400 }
      )
    }

    const start = parseDateParam(validated.startDate)!
    const end = parseDateParam(validated.endDate)!
    const totalDays = workingDaysBetween(start, end)

    if (totalDays === 0) {
      return NextResponse.json(
        { error: 'The selected range contains no working days (weekends are not counted as leave)' },
        { status: 400 }
      )
    }

    // Prevent double-booking: no overlapping pending/approved requests
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        userId: session.userId,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    })
    if (overlapping) {
      return NextResponse.json(
        { error: 'You already have a leave request overlapping these dates' },
        { status: 400 }
      )
    }

    // Split days across calendar years (handles Dec→Jan requests correctly)
    const daysByYear = splitWorkingDaysByYear(start, end)

    // Check balances if not admin
    if (session.role !== 'ADMIN') {
      for (const [year, days] of daysByYear) {
        const available = await getAvailableLeaveDays(session.userId, validated.leaveTypeId, year)
        if (available === null) {
          return NextResponse.json(
            { error: `No leave balance allocated for ${year}` },
            { status: 400 }
          )
        }
        if (available < days) {
          return NextResponse.json(
            { error: `Insufficient leave balance for ${year}. Available: ${available} day(s), requested: ${days}` },
            { status: 400 }
          )
        }
      }
    }

    const autoApprove = !leaveType.requiresApproval

    // Create the request and debit balances atomically
    const leaveRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.leaveRequest.create({
        data: {
          userId: session.userId,
          leaveTypeId: validated.leaveTypeId,
          startDate: start,
          endDate: end,
          totalDays,
          reason: validated.reason,
          status: autoApprove ? 'APPROVED' : 'PENDING',
          approvedAt: autoApprove ? new Date() : null,
          approvedById: autoApprove ? session.userId : null,
        },
        include: {
          leaveType: true,
          user: { select: { id: true, name: true, email: true } },
        },
      })

      if (autoApprove) {
        for (const [year, days] of daysByYear) {
          await debitLeaveBalance(tx, session.userId, validated.leaveTypeId, year, days)
        }
      }

      return created
    })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.CREATE,
      entity: AuditEntities.LEAVE_REQUEST,
      entityId: leaveRequest.id,
      newData: { ...validated, totalDays },
    })

    // Notify admins if requires approval
    if (leaveType.requiresApproval) {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true },
      })
      const requesterName = leaveRequest.user?.name || leaveRequest.user?.email || 'A user'
      await Promise.allSettled(
        admins.map((admin) =>
          sendNotification({
            userId: admin.id,
            type: 'LEAVE_REQUEST',
            title: 'New Leave Request',
            message: `${requesterName} requested ${totalDays} working day(s) of ${leaveType.name} (${validated.startDate} → ${validated.endDate})`,
            senderId: session.userId,
            metadata: { leaveRequestId: leaveRequest.id },
          })
        )
      )
    }

    return NextResponse.json({ request: leaveRequest }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Create leave request')
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    // Cancel flow — the requester withdraws their own request
    const cancelParsed = cancelSchema.safeParse(body)
    if (cancelParsed.success) {
      return await handleCancel(request, cancelParsed.data.requestIds)
    }

    // Approve/reject flow — admin only
    const session = await requireAdmin()
    const validated = approveRejectSchema.parse(body)

    const requests = await prisma.leaveRequest.findMany({
      where: { id: { in: validated.requestIds }, status: 'PENDING' },
      include: { leaveType: true, user: true },
    })

    if (requests.length === 0) {
      return NextResponse.json(
        { error: 'No valid pending requests found' },
        { status: 400 }
      )
    }

    const results = []
    for (const req of requests) {
      const newStatus = validated.action === 'approve' ? 'APPROVED' : 'REJECTED'
      const now = new Date()
      const daysByYear = splitWorkingDaysByYear(req.startDate, req.endDate)

      const updated = await prisma.$transaction(async (tx) => {
        // Atomically claim the pending request
        const claimed = await tx.leaveRequest.updateMany({
          where: { id: req.id, status: 'PENDING' },
          data: {
            status: newStatus,
            approvedAt: now,
            approvedById: session.userId,
            rejectReason: validated.action === 'reject' ? validated.rejectReason : null,
          },
        })
        if (claimed.count === 0) {
          throw new Error('ALREADY_PROCESSED')
        }

        if (validated.action === 'approve') {
          for (const [year, days] of daysByYear) {
            await debitLeaveBalance(tx, req.userId, req.leaveTypeId, year, days)
          }
        }

        return tx.leaveRequest.findUniqueOrThrow({
          where: { id: req.id },
          include: { leaveType: true, user: true },
        })
      })

      await createAuditLog({
        userId: session.userId,
        action: validated.action === 'approve' ? AuditActions.APPROVE : AuditActions.REJECT,
        entity: AuditEntities.LEAVE_REQUEST,
        entityId: req.id,
        oldData: { status: 'PENDING' },
        newData: { status: newStatus, approvedAt: now, approvedById: session.userId },
      })

      await sendNotification({
        userId: req.userId,
        type: `LEAVE_${validated.action.toUpperCase()}`,
        title: `Leave Request ${validated.action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: `Your ${req.leaveType.name} request for ${formatDate(req.startDate, 'PP')} - ${formatDate(req.endDate, 'PP')} was ${validated.action === 'approve' ? 'approved' : 'rejected'}.`,
        senderId: session.userId,
        metadata: { leaveRequestId: req.id },
      })

      results.push(updated)
    }

    return NextResponse.json({ requests: results, action: validated.action })
  } catch (error) {
    if (error instanceof Error && error.message === 'ALREADY_PROCESSED') {
      return NextResponse.json(
        { error: 'One or more requests were already processed' },
        { status: 409 }
      )
    }
    return handleApiError(error, 'Approve/reject leave request')
  }
}

/** Owner cancels their own PENDING or APPROVED request; approved days are refunded. */
async function handleCancel(request: NextRequest, requestIds: string[]) {
  const session = await requireAuth()

  const requests = await prisma.leaveRequest.findMany({
    where: {
      id: { in: requestIds },
      userId: session.userId,
      status: { in: ['PENDING', 'APPROVED'] },
    },
    include: { leaveType: true },
  })

  if (requests.length === 0) {
    return NextResponse.json(
      { error: 'No cancellable requests found' },
      { status: 400 }
    )
  }

  const results = []
  for (const req of requests) {
    const daysByYear = splitWorkingDaysByYear(req.startDate, req.endDate)

    const updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.leaveRequest.updateMany({
        where: { id: req.id, status: { in: ['PENDING', 'APPROVED'] } },
        data: { status: 'CANCELLED' },
      })
      if (claimed.count === 0) throw new Error('ALREADY_PROCESSED')

      // Refund the balance if the request had been approved (days were debited)
      if (req.status === 'APPROVED') {
        for (const [year, days] of daysByYear) {
          await refundLeaveBalance(tx, req.userId, req.leaveTypeId, year, days)
        }
      }

      return tx.leaveRequest.findUniqueOrThrow({
        where: { id: req.id },
        include: { leaveType: true },
      })
    })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.UPDATE,
      entity: AuditEntities.LEAVE_REQUEST,
      entityId: req.id,
      oldData: { status: req.status },
      newData: { status: 'CANCELLED' },
    })

    results.push(updated)
  }

  return NextResponse.json({ requests: results, action: 'cancel' })
}
