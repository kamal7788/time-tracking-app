import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, verifyPassword, hashPassword } from '@/lib/auth'
import { changePasswordSchema, profileSchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { rateLimitRedis, getClientIp } from '@/lib/rate-limit-redis'
import { handleApiError } from '@/lib/api'
import { z } from 'zod'

const timeZoneSchema = z.object({
  timeZone: z.string().min(1, 'Time zone is required').max(100),
})

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export async function GET() {
  try {
    const session = await requireAuth()

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        timeZone: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    return handleApiError(error, 'Get user settings')
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update time zone if provided
    if (typeof body.timeZone === 'string' && body.timeZone.length > 0) {
      const validated = timeZoneSchema.parse({ timeZone: body.timeZone })
      if (!isValidTimeZone(validated.timeZone)) {
        return NextResponse.json({ error: 'Invalid time zone' }, { status: 400 })
      }
      await prisma.user.update({
        where: { id: session.userId },
        data: { timeZone: validated.timeZone },
      })
    }

    // Update password if provided (independent of profile fields)
    if (body.currentPassword || body.newPassword || body.confirmPassword) {
      const ip = getClientIp(request)
      const rl = await rateLimitRedis(`password-change:${session.userId}`, 5, 15 * 60 * 1000)
      if (!rl.success) {
        return NextResponse.json(
          { error: 'Too many password change attempts. Please try again later.' },
          { status: 429 }
        )
      }

      const validated = changePasswordSchema.parse({
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        confirmPassword: body.confirmPassword,
      })

      const isValid = await verifyPassword(validated.currentPassword, user.passwordHash)
      if (!isValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        )
      }

      const passwordHash = await hashPassword(validated.newPassword)
      await prisma.user.update({
        where: { id: session.userId },
        data: { passwordHash },
      })

      await createAuditLog({
        userId: session.userId,
        action: AuditActions.UPDATE,
        entity: AuditEntities.USER,
        entityId: session.userId,
        newData: { passwordChanged: true },
      })
    }

    // Update profile if name/email provided
    if (typeof body.name === 'string' || typeof body.email === 'string') {
      const validated = profileSchema.parse({
        name: body.name ?? user.name,
        email: body.email ?? user.email,
      })

      const email = validated.email.toLowerCase()

      // Check if email is being changed and if it already exists
      if (email !== user.email) {
        const existing = await prisma.user.findUnique({
          where: { email },
        })
        if (existing) {
          return NextResponse.json(
            { error: 'Email already exists' },
            { status: 400 }
          )
        }
      }

      await prisma.user.update({
        where: { id: session.userId },
        data: {
          name: validated.name,
          email,
          // Changing email requires re-verification
          ...(email !== user.email ? { emailVerified: null } : {}),
        },
      })
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, role: true, timeZone: true },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    return handleApiError(error, 'Update user settings')
  }
}
