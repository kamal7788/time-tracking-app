import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { expenseSchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export async function GET(
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

    return NextResponse.json({ expense })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get expense error:', error)
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

    const existingExpense = await prisma.expense.findFirst({
      where: {
        id,
        userId: session.userId,
      },
    })

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    if (existingExpense.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot edit submitted expenses' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    let receiptPath = existingExpense.receiptPath

    const itemName = formData.get('itemName') as string
    const amount = parseFloat(formData.get('amount') as string)
    const date = formData.get('date') as string
    const description = formData.get('description') as string
    const receipt = formData.get('receipt') as File | null

    const validated = expenseSchema.parse({ itemName, amount, date, description })

    if (!receipt || receipt.size === 0) {
      return NextResponse.json(
        { error: 'Receipt image is required' },
        { status: 400 }
      )
    }

    // Delete old receipt if exists
    if (existingExpense.receiptPath) {
      const oldFilename = existingExpense.receiptPath.split('/').pop()
      if (oldFilename) {
        const oldPath = join(process.cwd(), 'public', 'uploads', 'expenses', oldFilename)
        try {
          await unlink(oldPath)
        } catch {
          // File might not exist, ignore error
        }
      }
    }

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'expenses')
    await mkdir(uploadsDir, { recursive: true })

    const ext = receipt.name.split('.').pop() || 'jpg'
    const filename = `${randomUUID()}.${ext}`
    const filepath = join(uploadsDir, filename)

    const bytes = await receipt.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    receiptPath = `/api/uploads/expenses/${filename}`

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        itemName: validated.itemName,
        amount: validated.amount,
        date: new Date(validated.date),
        receiptPath,
        description: validated.description,
      },
    })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.UPDATE,
      entity: AuditEntities.TIME_ENTRY,
      entityId: expense.id,
      oldData: {
        itemName: existingExpense.itemName,
        amount: existingExpense.amount,
        date: existingExpense.date,
      },
      newData: {
        itemName: expense.itemName,
        amount: expense.amount,
        date: expense.date,
      },
    })

    return NextResponse.json({ expense })
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
    console.error('Update expense error:', error)
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

    const existingExpense = await prisma.expense.findFirst({
      where: {
        id,
        userId: session.userId,
      },
    })

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    if (existingExpense.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot delete submitted expenses' },
        { status: 400 }
      )
    }

    // Delete receipt file if exists
    if (existingExpense.receiptPath) {
      const filename = existingExpense.receiptPath.split('/').pop()
      if (filename) {
        const receiptPath = join(process.cwd(), 'public', 'uploads', 'expenses', filename)
        try {
          await unlink(receiptPath)
        } catch {
          // File might not exist, ignore error
        }
      }
    }

    await prisma.expense.delete({ where: { id } })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.DELETE,
      entity: AuditEntities.TIME_ENTRY,
      entityId: id,
      oldData: {
        itemName: existingExpense.itemName,
        amount: existingExpense.amount,
        date: existingExpense.date,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Delete expense error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
