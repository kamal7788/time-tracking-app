import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword, createToken, setAuthCookie } from '@/lib/auth'
import { registerSchema } from '@/lib/validations'
import { rateLimitRedis, getClientIp } from '@/lib/rate-limit-redis'
import { handleApiError } from '@/lib/api'

// 10 registrations per hour per IP
const REGISTER_LIMIT = 10
const REGISTER_WINDOW_MS = 60 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    if (process.env.DISABLE_PUBLIC_REGISTRATION === 'true') {
      return NextResponse.json(
        { error: 'Public registration is disabled. Contact your administrator for an account.' },
        { status: 403 }
      )
    }

    const ip = getClientIp(request)
    const rl = await rateLimitRedis(`register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS)
    if (!rl.success) {
      const retryAfterSec = Math.ceil((rl.resetAt - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
      )
    }

    const body = await request.json()
    const validated = registerSchema.parse(body)

    const email = validated.email.toLowerCase()
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(validated.password)

    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email,
        passwordHash,
      },
    })

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    await setAuthCookie(token)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
