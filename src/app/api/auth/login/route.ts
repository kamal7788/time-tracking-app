import { prisma } from '@/lib/prisma'
import { verifyPassword, createToken, setAuthCookie } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { rateLimitRedis, getClientIp } from '@/lib/rate-limit-redis'
import { handleApiError } from '@/lib/api'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = loginSchema.parse(body)

    const ip = getClientIp(request)
    const rl = await rateLimitRedis(`login:${ip}:${validated.email.toLowerCase()}`, LOGIN_LIMIT, LOGIN_WINDOW_MS)
    if (!rl.success) {
      const retryAfterSec = Math.ceil((rl.resetAt - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    })

    // Run a dummy comparison when the user doesn't exist to reduce timing oracle.
    const isValid = user
      ? await verifyPassword(validated.password, user.passwordHash)
      : await verifyPassword(validated.password, '$2a$12$C6UzMDM.H6dfI/f/IKcEeO7ZDZ1mQfQ2yYQF2FfVmA6y2mR1qFQ6q')

    if (!user || !isValid || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    await setAuthCookie(token)

    await createAuditLog({
      userId: user.id,
      action: AuditActions.LOGIN,
      entity: AuditEntities.USER,
      entityId: user.id,
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
