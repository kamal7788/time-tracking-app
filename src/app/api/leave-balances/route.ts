import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { handleApiError } from '@/lib/api'
import { z } from 'zod'

const allocateBalanceSchema = z.object({
  userId: z.string().min(1).max(64),
  leaveTypeId: z.string().min(1).max(64),
  year: z.number().int().min(2000).max(2100),
  allocatedDays: z.number().min(0).max(365),
  carriedOverDays: z.number().min(0).max(365).default(0),
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
    return handleApiError(error, 'Get leave balances error:')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const validated = allocateBalanceSchema.parse(body)

    // Validate referenced records exist and are usable
    const [targetUser, leaveType] = await Promise.all([
      prisma.user.findUnique({ where: { id: validated.userId }, select: { id: true, isActive: true } }),
      prisma.leaveType.findUnique({ where: { id: validated.leaveTypeId }, select: { id: true, isActive: true } }),
    ])
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (!leaveType || !leaveType.isActive) {
      return NextResponse.json({ error: 'Invalid leave type' }, { status: 400 })
    }

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
      entity: AuditEntities.LEAVE_BALANCE,
      entityId: balance.id,
      newData: validated,
    })

    return NextResponse.json({ balance }, { status: existing ? 200 : 201 })
  } catch (error) {
    return handleApiError(error, 'Allocate leave balance')
  }
}