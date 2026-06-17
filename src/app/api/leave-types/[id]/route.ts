import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { z } from 'zod'

const leaveTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
  carryoverAllowed: z.boolean().optional(),
  maxCarryoverDays: z.number().int().positive().optional().nullable(),
  carryoverExpiryMonths: z.number().int().positive().optional().nullable(),
  requiresApproval: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const leaveType = await prisma.leaveType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { leaveBalances: true, leaveRequests: true },
        },
      },
    })

    if (!leaveType) {
      return NextResponse.json(
        { error: 'Leave type not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ leaveType })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get leave type error:', error)
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
    const session = await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const validated = leaveTypeSchema.parse(body)

    const existingLeaveType = await prisma.leaveType.findUnique({
      where: { id },
    })

    if (!existingLeaveType) {
      return NextResponse.json(
        { error: 'Leave type not found' },
        { status: 404 }
      )
    }

    const leaveType = await prisma.leaveType.update({
      where: { id },
      data: validated,
    })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.UPDATE,
      entity: 'LeaveType',
      entityId: leaveType.id,
      oldData: {
        name: existingLeaveType.name,
        description: existingLeaveType.description,
        color: existingLeaveType.color,
        icon: existingLeaveType.icon,
        isActive: existingLeaveType.isActive,
        carryoverAllowed: existingLeaveType.carryoverAllowed,
        maxCarryoverDays: existingLeaveType.maxCarryoverDays,
        carryoverExpiryMonths: existingLeaveType.carryoverExpiryMonths,
        requiresApproval: existingLeaveType.requiresApproval,
        sortOrder: existingLeaveType.sortOrder,
      },
      newData: validated,
    })

    return NextResponse.json({ leaveType })
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
    console.error('Update leave type error:', error)
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
    const session = await requireAdmin()
    const { id } = await params

    const existingLeaveType = await prisma.leaveType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { leaveBalances: true, leaveRequests: true },
        },
      },
    })

    if (!existingLeaveType) {
      return NextResponse.json(
        { error: 'Leave type not found' },
        { status: 404 }
      )
    }

    if (existingLeaveType._count.leaveBalances > 0 || existingLeaveType._count.leaveRequests > 0) {
      return NextResponse.json(
        { error: 'Cannot delete leave type with existing balances or requests' },
        { status: 400 }
      )
    }

    await prisma.leaveType.delete({ where: { id } })

    await createAuditLog({
      userId: session.userId,
      action: AuditActions.DELETE,
      entity: 'LeaveType',
      entityId: id,
      oldData: { name: existingLeaveType.name },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Delete leave type error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}