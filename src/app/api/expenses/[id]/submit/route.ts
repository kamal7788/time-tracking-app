import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { sendNotification } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const expense = await prisma.expense.findFirst({
      where: {
        id,
        userId: session.userId,
      },
    })

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    if (expense.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Expense has already been submitted' },
        { status: 400 }
      )
    }

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.SUBMIT,
      entity: AuditEntities.TIME_ENTRY,
      entityId: expense.id,
      oldData: { status: 'DRAFT' },
      newData: { status: 'SUBMITTED', submittedAt: new Date() },
    })

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
    })

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    })

    for (const admin of admins) {
      await sendNotification({
        userId: admin.id,
        type: 'EXPENSE_SUBMITTED',
        title: 'New Expense Submission',
        message: `${user?.name || user?.email} submitted an expense for ${expense.itemName} (NPR ${expense.amount})`,
        senderId: session.userId,
        metadata: { expenseId: expense.id, amount: expense.amount },
      })
    }

    return NextResponse.json({ expense: updatedExpense })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Submit expense error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
