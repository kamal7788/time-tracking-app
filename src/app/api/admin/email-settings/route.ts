import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { emailSettingsSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/api'
import { resolveEmailConfig } from '@/lib/email'

export async function GET() {
  try {
    await requireAdmin()

    // Global settings: single row, most recently updated wins
    const settings = await prisma.emailSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    if (!settings) {
      return NextResponse.json({ settings: null })
    }

    // Don't return password — only whether one is stored
    const { smtpPass, ...safeSettings } = settings
    return NextResponse.json({
      settings: { ...safeSettings, hasPassword: Boolean(smtpPass) },
    })
  } catch (error) {
    return handleApiError(error, 'Get email settings')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const validated = emailSettingsSchema.parse(body)

    const existing = await prisma.emailSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    // Blank password keeps the stored one
    const smtpPass =
      validated.smtpPass && validated.smtpPass.length > 0
        ? validated.smtpPass
        : existing?.smtpPass || null

    const data = {
      smtpHost: validated.smtpHost,
      smtpPort: validated.smtpPort,
      smtpUser: validated.smtpUser,
      smtpPass,
      fromEmail: validated.fromEmail,
      fromName: validated.fromName,
    }

    const settings = existing
      ? await prisma.emailSettings.update({ where: { id: existing.id }, data })
      : await prisma.emailSettings.create({ data: { ...data, userId: session.userId } })

    const { smtpPass: _omit, ...safeSettings } = settings
    return NextResponse.json({
      settings: { ...safeSettings, hasPassword: Boolean(smtpPass) },
    })
  } catch (error) {
    return handleApiError(error, 'Email settings')
  }
}

const testEmailSchema = z.object({
  to: z.string().email('Invalid recipient email'),
})

/** Sends a test email using the resolved configuration. */
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { to } = testEmailSchema.parse(body)

    const config = await resolveEmailConfig()
    if (!config) {
      return NextResponse.json(
        { error: 'Email is not configured. Save SMTP settings first.' },
        { status: 400 }
      )
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    })

    await transporter.sendMail({
      from: `"${config.fromName.replace(/"/g, '')}" <${config.fromEmail}>`,
      to,
      subject: 'Test email from Time Tracking App',
      text: 'If you received this, your SMTP settings are working.',
      html: '<p>If you received this, your <strong>SMTP settings</strong> are working.</p>',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'Test email')
  }
}
