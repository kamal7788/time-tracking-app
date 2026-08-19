import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { AuthError } from './auth'

/**
 * Central API error handler. Maps known error types to clean HTTP responses
 * without leaking internals, and logs unexpected errors.
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  if (error instanceof ZodError) {
    const first = error.errors[0]
    return NextResponse.json(
      {
        error: first?.message || 'Invalid input',
        field: first?.path?.join('.') || undefined,
      },
      { status: 400 }
    )
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A record with these values already exists' }, { status: 409 })
    }
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Referenced record does not exist' }, { status: 400 })
    }
  }

  // Legacy string-message auth errors (thrown by older code paths)
  if (error instanceof Error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  console.error(`${context} error:`, error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

/** Parses and clamps pagination params. */
export function getPagination(searchParams: URLSearchParams, defaultLimit = 20, maxLimit = 100) {
  const rawPage = parseInt(searchParams.get('page') || '1', 10)
  const rawLimit = parseInt(searchParams.get('limit') || String(defaultLimit), 10)
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, maxLimit) : defaultLimit
  return { page, limit, skip: (page - 1) * limit }
}

/** Parses a YYYY-MM-DD param into a UTC-midnight Date, or null when absent/invalid. */
export function parseDateParam(value: string | null): Date | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return isNaN(d.getTime()) ? null : d
}
