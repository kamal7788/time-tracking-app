import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireAuth, verifyPassword, hashPassword } from '@/lib/auth'
import { changePasswordSchema } from '@/lib/validations'
import { z } from 'zod'

const timeZoneSchema = z.object({
  timeZone: z.string().min(1, 'Time zone is required'),
})

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
})

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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get user settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { timeZone, ...profileData } = body

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update time zone if provided
    if (timeZone) {
      const validated = timeZoneSchema.parse({ timeZone })
      await prisma.user.update({
        where: { id: session.userId },
        data: { timeZone: validated.timeZone },
      })
    }

    // Update password if provided
    if (body.currentPassword && body.newPassword) {
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
    }

    // Update profile if provided
    if (Object.keys(profileData).length > 0) {
      const validated = profileSchema.parse(profileData)
      
      // Check if email is being changed and if it already exists
      if (validated.email !== user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: validated.email },
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
        data: { name: validated.name, email: validated.email },
      })
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, role: true, timeZone: true },
    })

    return NextResponse.json({ user: updatedUser })
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
    console.error('Update user settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}