import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, getSession } from '@/lib/auth'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { z } from 'zod'

const leaveTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  icon: z.string().optional(),
  carryoverAllowed: z.boolean().default(false),
  maxCarryoverDays: z.number().int().positive().optional().nullable(),
  carryoverExpiryMonths: z.number().int().positive().optional().nullable(),
  requiresApproval: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leaveTypes = await prisma.leaveType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ leaveTypes })
  } catch (error) {
    console.error('Get leave types error:', error)
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
    const validated = leaveTypeSchema.parse(body)

    const leaveType = await prisma.leaveType.create({
      data: {
        name: validated.name,
        description: validated.description,
        color: validated.color || '#0ea5e9',
        icon: validated.icon,
        carryoverAllowed: validated.carryoverAllowed,
        maxCarryoverDays: validated.maxCarryoverDays,
        carryoverExpiryMonths: validated.carryoverExpiryMonths,
        requiresApproval: validated.requiresApproval,
        sortOrder: validated.sortOrder,
      },
    })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.CREATE,
      entity: 'LeaveType',
      entityId: leaveType.id,
      newData: validated,
    })

    return NextResponse.json({ leaveType }, { status: 201 })
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
    console.error('Create leave type error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}