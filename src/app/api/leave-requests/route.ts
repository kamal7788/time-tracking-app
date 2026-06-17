import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireAuth, requireAdmin } from '@/lib/auth'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { sendNotification } from '@/lib/notifications'
import { z } from 'zod'
import { formatDate } from '@/lib/utils'

const leaveRequestSchema = z.object({
  leaveTypeId: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  reason: z.string().optional(),
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
  message: 'End date must be after or equal to start date',
  path: ['endDate'],
})

const approveRejectSchema = z.object({
  requestIds: z.array(z.string()).min(1),
  action: z.enum(['approve', 'reject']),
  rejectReason: z.string().optional(),
}).refine((data) => data.action !== 'reject' || data.rejectReason, {
  message: 'Rejection reason is required',
  path: ['rejectReason'],
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const year = searchParams.get('year')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}

    if (session.role !== 'ADMIN') {
      where.userId = session.userId
    } else {
      const userId = searchParams.get('userId')
      if (userId) where.userId = userId
    }

    if (status) where.status = status
    if (year) {
      const startOfYear = new Date(parseInt(year), 0, 1)
      const endOfYear = new Date(parseInt(year), 11, 31)
      where.startDate = { gte: startOfYear, lte: endOfYear }
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.leaveRequest.count({ where }),
    ])

    return NextResponse.json({
      requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get leave requests error:', error)
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

    const start = new Date(validated.startDate)
    const end = new Date(validated.endDate)
    const diffTime = end.getTime() - start.getTime()
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    // Check balance if not admin
    if (session.role !== 'ADMIN') {
      const currentYear = start.getFullYear()
      const balance = await prisma.leaveBalance.findUnique({
        where: {
          userId_leaveTypeId_year: {
            userId: session.userId,
            leaveTypeId: validated.leaveTypeId,
            year: currentYear,
          },
        },
      })

      if (!balance) {
        return NextResponse.json(
          { error: 'No leave balance allocated for this year' },
          { status: 400 }
        )
      }

      const availableDays = balance.allocatedDays + balance.carriedOverDays - balance.usedDays
      if (availableDays < totalDays) {
        return NextResponse.json(
          { error: `Insufficient leave balance. Available: ${availableDays} days` },
          { status: 400 }
        )
      }
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId: session.userId,
        leaveTypeId: validated.leaveTypeId,
        startDate: start,
        endDate: end,
        totalDays,
        reason: validated.reason,
        status: leaveType.requiresApproval ? 'PENDING' : 'APPROVED',
        approvedAt: leaveType.requiresApproval ? null : new Date(),
        approvedById: leaveType.requiresApproval ? null : session.userId,
      },
      include: {
        leaveType: true,
        user: { select: { id: true, name: true, email: true } },
      },
    })

    // If auto-approved, update balance
    if (!leaveType.requiresApproval) {
      await updateLeaveBalance(session.userId, validated.leaveTypeId, start.getFullYear(), totalDays)
    }

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.CREATE,
      entity: 'LeaveRequest',
      entityId: leaveRequest.id,
      newData: { ...validated, totalDays },
    })

    // Notify admins if requires approval
    if (leaveType.requiresApproval) {
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } })
      for (const admin of admins) {
        await sendNotification({
          userId: admin.id,
          type: 'LEAVE_REQUEST',
          title: 'New Leave Request',
          message: `${session.userId} requested ${totalDays} day(s) of ${leaveType.name}`,
          senderId: session.userId,
          metadata: { leaveRequestId: leaveRequest.id },
        })
      }
    }

    return NextResponse.json({ request: leaveRequest }, { status: 201 })
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
    console.error('Create leave request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function updateLeaveBalance(userId: string, leaveTypeId: string, year: number, days: number) {
  await prisma.leaveBalance.update({
    where: {
      userId_leaveTypeId_year: { userId, leaveTypeId, year },
    },
    data: { usedDays: { increment: days } },
  })
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
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

      const updated = await prisma.leaveRequest.update({
        where: { id: req.id },
        data: {
          status: newStatus,
          approvedAt: now,
          approvedById: session.userId,
          rejectReason: validated.action === 'reject' ? validated.rejectReason : null,
        },
        include: { leaveType: true, user: true },
      })

      // Update balance if approved
      if (validated.action === 'approve') {
        await updateLeaveBalance(req.userId, req.leaveTypeId, req.startDate.getFullYear(), req.totalDays)
      }

      await createAuditLog({
        userId: session.userId,
        action: validated.action === 'approve' ? AuditActions.APPROVE : AuditActions.REJECT,
        entity: 'LeaveRequest',
        entityId: req.id,
        oldData: { status: 'PENDING' },
        newData: { status: newStatus, approvedAt: now, approvedById: session.userId },
      })

      // Notify user
      await sendNotification({
        userId: req.userId,
        type: `LEAVE_${validated.action.toUpperCase()}`,
        title: `Leave Request ${validated.action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: `Your ${req.leaveType.name} request for ${formatDate(req.startDate)} - ${formatDate(req.endDate)} was ${validated.action === 'approve' ? 'approved' : 'rejected'}.`,
        senderId: session.userId,
        metadata: { leaveRequestId: req.id },
      })

      results.push(updated)
    }

    return NextResponse.json({ requests: results, action: validated.action })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }
    console.error('Approve/reject leave request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}