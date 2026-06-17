import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { emailSettingsSchema } from '@/lib/validations'

export async function GET() {
  try {
    await requireAdmin()

    const settings = await prisma.emailSettings.findFirst()

    if (!settings) {
      return NextResponse.json({ settings: null })
    }

    // Don't return password
    const { smtpPass, ...safeSettings } = settings
    return NextResponse.json({ settings: safeSettings })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get email settings error:', error)
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
    const validated = emailSettingsSchema.parse(body)

    const settings = await prisma.emailSettings.upsert({
      where: { userId: session.userId },
      update: {
        smtpHost: validated.smtpHost,
        smtpPort: validated.smtpPort,
        smtpUser: validated.smtpUser,
        smtpPass: validated.smtpPass,
        fromEmail: validated.fromEmail,
        fromName: validated.fromName,
      },
      create: {
        userId: session.userId,
        smtpHost: validated.smtpHost,
        smtpPort: validated.smtpPort,
        smtpUser: validated.smtpUser,
        smtpPass: validated.smtpPass,
        fromEmail: validated.fromEmail,
        fromName: validated.fromName,
      },
    })

    const { smtpPass, ...safeSettings } = settings
    return NextResponse.json({ settings: safeSettings })
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
    console.error('Email settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}