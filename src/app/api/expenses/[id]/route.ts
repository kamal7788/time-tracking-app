import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { expenseSchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { handleApiError } from '@/lib/api'
import { validateReceiptFile, saveReceipt, deleteReceipt } from '@/lib/uploads'
import { parseEntryDate } from '@/lib/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const expense = await prisma.expense.findFirst({
      where: session.role === 'ADMIN' ? { id } : { id, userId: session.userId },
    })

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ expense })
  } catch (error) {
    return handleApiError(error, 'Get expense')
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

    const itemName = formData.get('itemName') as string
    const amount = parseFloat(formData.get('amount') as string)
    const date = formData.get('date') as string
    const description = formData.get('description') as string
    const receipt = formData.get('receipt') as File | null

    const validated = expenseSchema.parse({ itemName, amount, date, description })

    const entryDate = parseEntryDate(validated.date)
    if (!entryDate) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }

    // Receipt is optional on edit — only replace when a new file is provided
    let receiptPath = existingExpense.receiptPath
    let oldReceiptPath: string | null = null

    if (receipt && receipt.size > 0) {
      const buffer = Buffer.from(await receipt.arrayBuffer())
      const detected = validateReceiptFile(receipt, buffer)
      if (!detected) {
        return NextResponse.json(
          { error: 'Invalid receipt file. Allowed: JPG, PNG, GIF, WebP or PDF up to 5 MB.' },
          { status: 400 }
        )
      }
      // Write the new receipt BEFORE touching the old one
      receiptPath = await saveReceipt(buffer, detected.ext)
      oldReceiptPath = existingExpense.receiptPath
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        itemName: validated.itemName,
        amount: validated.amount,
        date: entryDate,
        receiptPath,
        description: validated.description,
      },
    })

    // Only delete the old receipt after the update succeeded
    if (oldReceiptPath) {
      await deleteReceipt(oldReceiptPath)
    }

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.UPDATE,
      entity: AuditEntities.EXPENSE,
      entityId: expense.id,
      oldData: {
        itemName: existingExpense.itemName,
        amount: existingExpense.amount.toString(),
        date: existingExpense.date,
      },
      newData: {
        itemName: expense.itemName,
        amount: expense.amount.toString(),
        date: expense.date,
      },
    })

    return NextResponse.json({ expense })
  } catch (error) {
    return handleApiError(error, 'Update expense')
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
      },
    })

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    // Only allow owner to delete DRAFT, admin can delete any
    if (existingExpense.userId !== session.userId && session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    if (existingExpense.status !== 'DRAFT' && session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot delete submitted expenses' },
        { status: 400 }
      )
    }

    await prisma.expense.delete({ where: { id } })
    await deleteReceipt(existingExpense.receiptPath)

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.DELETE,
      entity: AuditEntities.EXPENSE,
      entityId: id,
      oldData: {
        itemName: existingExpense.itemName,
        amount: existingExpense.amount.toString(),
        date: existingExpense.date,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'Delete expense')
  }
}
