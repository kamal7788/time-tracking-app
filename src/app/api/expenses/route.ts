import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { expenseSchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {
      userId: session.userId,
    }

    if (status) {
      where.status = status
    }

    const expenses = await prisma.expense.findMany({
      where,
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
    console.error('Get expenses error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const formData = await request.formData()

    const itemName = formData.get('itemName') as string
    const amount = parseFloat(formData.get('amount') as string)
    const date = formData.get('date') as string
    const description = (formData.get('description') as string) || null
    const receipt = formData.get('receipt') as File | null

    const validated = expenseSchema.parse({ itemName, amount, date, description })

    let receiptPath: string | null = null

    // Handle file upload
    if (receipt && receipt.size > 0) {
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'expenses')
      await mkdir(uploadsDir, { recursive: true })

      const ext = receipt.name.split('.').pop() || 'jpg'
      const filename = `${randomUUID()}.${ext}`
      const filepath = join(uploadsDir, filename)

      const bytes = await receipt.arrayBuffer()
      await writeFile(filepath, Buffer.from(bytes))

      receiptPath = `/uploads/expenses/${filename}`
    }

    const expense = await prisma.expense.create({
      data: {
        userId: session.userId,
        itemName: validated.itemName,
        amount: validated.amount,
        date: new Date(validated.date),
        receiptPath,
        description: validated.description,
        status: 'DRAFT',
      },
    })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.CREATE,
      entity: AuditEntities.TIME_ENTRY, // Reusing entity type
      entityId: expense.id,
      newData: {
        itemName: expense.itemName,
        amount: expense.amount,
        date: expense.date,
        receiptPath: expense.receiptPath,
      },
    })

    return NextResponse.json({ expense }, { status: 201 })
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
    console.error('Create expense error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
