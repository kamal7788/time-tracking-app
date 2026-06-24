import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { expenseApprovalSchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { sendNotification } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')

    const where: Record<string, unknown> = {}

    if (status) {
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
    })

    return NextResponse.json({ expenses })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get admin expenses error:', error)
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

    const now = new Date()
    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'

    await prisma.expense.updateMany({
      where: { id: { in: expenseIds } },
      data: {
        status: newStatus,
        [action === 'approve' ? 'approvedAt' : 'rejectedAt']: now,
        [action === 'approve' ? 'approvedBy' : 'rejectedBy']: session.userId,
        ...(action === 'reject' ? { rejectReason } : {}),
      },
    })

    for (const expense of expenses) {
      await createAuditLog({
        userId: session.userId,
        action: action === 'approve' ? AuditActions.APPROVE : AuditActions.REJECT,
        entity: AuditEntities.TIME_ENTRY,
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
        message: `Your expense for ${expense.itemName} ($${expense.amount}) was ${action === 'approve' ? 'approved' : 'rejected'}${action === 'reject' && rejectReason ? `. Reason: ${rejectReason}` : ''}.`,
        senderId: session.userId,
        metadata: { expenseId: expense.id, action },
      })
    }

    return NextResponse.json({
      success: true,
      processedCount: expenses.length,
    })
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
    console.error('Admin expense approval error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
