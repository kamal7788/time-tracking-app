import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { expenseSchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { handleApiError, parseDateParam } from '@/lib/api'
import { validateReceiptFile, saveReceipt } from '@/lib/uploads'
import { parseEntryDate } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {
      userId: session.userId,
    }

    if (status && ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 500,
    })

    return NextResponse.json({ expenses })
  } catch (error) {
    return handleApiError(error, 'Get expenses')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const formData = await request.formData()

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

    const buffer = Buffer.from(await receipt.arrayBuffer())
    const detected = validateReceiptFile(receipt, buffer)
    if (!detected) {
      return NextResponse.json(
        { error: 'Invalid receipt file. Allowed: JPG, PNG, GIF, WebP or PDF up to 5 MB.' },
        { status: 400 }
      )
    }

    const entryDate = parseEntryDate(validated.date)
    if (!entryDate) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }

    const receiptPath = await saveReceipt(buffer, detected.ext)

    const expense = await prisma.expense.create({
      data: {
        userId: session.userId,
        itemName: validated.itemName,
        amount: validated.amount,
        date: entryDate,
        receiptPath,
        description: validated.description,
        status: 'DRAFT',
      },
    })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.CREATE,
      entity: AuditEntities.EXPENSE,
      entityId: expense.id,
      newData: {
        itemName: expense.itemName,
        amount: expense.amount.toString(),
        date: expense.date,
        receiptPath: expense.receiptPath,
      },
    })

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Create expense')
  }
}
