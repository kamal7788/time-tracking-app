import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireAuth, requireAdmin } from '@/lib/auth'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { z } from 'zod'

const allocateBalanceSchema = z.object({
  userId: z.string(),
  leaveTypeId: z.string(),
  year: z.number().int().min(2020).max(2030),
  allocatedDays: z.number().positive(),
  carriedOverDays: z.number().min(0).default(0),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

    const where: Record<string, unknown> = { year }
    
    if (session.role !== 'ADMIN') {
      where.userId = session.userId
    } else {
      const userId = searchParams.get('userId')
      if (userId) where.userId = userId
    }

    const balances = await prisma.leaveBalance.findMany({
      where,
      include: {
        leaveType: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { user: { name: 'asc' } },
        { leaveType: { sortOrder: 'asc' } },
      ],
    })

    return NextResponse.json({ balances })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get leave balances error:', error)
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
    const validated = allocateBalanceSchema.parse(body)

    const existing = await prisma.leaveBalance.findUnique({
      where: {
        userId_leaveTypeId_year: {
          userId: validated.userId,
          leaveTypeId: validated.leaveTypeId,
          year: validated.year,
        },
      },
    })

    let balance
    if (existing) {
      balance = await prisma.leaveBalance.update({
        where: { id: existing.id },
        data: {
          allocatedDays: validated.allocatedDays,
          carriedOverDays: validated.carriedOverDays,
        },
        include: { leaveType: true, user: true },
      })
    } else {
      balance = await prisma.leaveBalance.create({
        data: {
          userId: validated.userId,
          leaveTypeId: validated.leaveTypeId,
          year: validated.year,
          allocatedDays: validated.allocatedDays,
          carriedOverDays: validated.carriedOverDays,
          usedDays: 0,
        },
        include: { leaveType: true, user: true },
      })
    }

    await createAuditLog({
      userId: session.userId,
      action: existing ? AuditActions.UPDATE : AuditActions.CREATE,
      entity: 'LeaveBalance',
      entityId: balance.id,
      newData: validated,
    })

    return NextResponse.json({ balance }, { status: existing ? 200 : 201 })
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
    console.error('Allocate leave balance error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}