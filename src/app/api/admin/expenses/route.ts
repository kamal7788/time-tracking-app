import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { expenseApprovalSchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { sendNotification } from '@/lib/notifications'
import { handleApiError } from '@/lib/api'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')

    const where: Record<string, unknown> = {}

    if (status && ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status
    }

    if (userId) {
      where.userId = userId
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 500,
    })

    return NextResponse.json({ expenses })
  } catch (error) {
    return handleApiError(error, 'Get admin expenses')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const validated = expenseApprovalSchema.parse(body)

    const { expenseIds, action, rejectReason } = validated

    const expenses = await prisma.expense.findMany({
      where: {
        id: { in: expenseIds },
        status: 'SUBMITTED',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (expenses.length === 0) {
      return NextResponse.json(
        { error: 'No submitted expenses found' },
        { status: 400 }
      )
    }

    const validIds = expenses.map((e) => e.id)
    const now = new Date()
    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'

    // Only flip rows that are still SUBMITTED — prevents smuggled IDs of other statuses
    await prisma.expense.updateMany({
      where: { id: { in: validIds }, status: 'SUBMITTED' },
      data: {
        status: newStatus,
        [action === 'approve' ? 'approvedAt' : 'rejectedAt']: now,
        [action === 'approve' ? 'approvedBy' : 'rejectedBy']: session.userId,
        ...(action === 'reject' ? { rejectReason } : {}),
      },
    })

    const sideEffects = expenses.map(async (expense) => {
      await createAuditLog({
        userId: session.userId,
        action: action === 'approve' ? AuditActions.APPROVE : AuditActions.REJECT,
        entity: AuditEntities.EXPENSE,
        entityId: expense.id,
        oldData: { status: 'SUBMITTED' },
        newData: {
          status: newStatus,
          [action === 'approve' ? 'approvedAt' : 'rejectedAt']: now,
          ...(action === 'reject' ? { rejectReason } : {}),
        },
      })

      await sendNotification({
        userId: expense.user.id,
        type: action === 'approve' ? 'EXPENSE_APPROVED' : 'EXPENSE_REJECTED',
        title: `Expense ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: `Your expense for ${expense.itemName} (NPR ${expense.amount}) was ${action === 'approve' ? 'approved' : 'rejected'}${action === 'reject' && rejectReason ? `. Reason: ${rejectReason}` : ''}.`,
        senderId: session.userId,
        metadata: { expenseId: expense.id, action },
      })
    })

    await Promise.allSettled(sideEffects)

    return NextResponse.json({
      success: true,
      processedCount: expenses.length,
    })
  } catch (error) {
    return handleApiError(error, 'Admin expense approval')
  }
}
