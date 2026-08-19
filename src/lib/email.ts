import nodemailer from 'nodemailer'
import { prisma } from './prisma'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/** Escapes user-controlled strings before interpolating into HTML emails. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface ResolvedEmailConfig {
  host: string
  port: number
  user: string
  pass: string
  fromEmail: string
  fromName: string
}

/**
 * Resolves SMTP config: DB settings row (global) takes priority, env vars are
 * the fallback. Returns null when email is not configured.
 */
export async function resolveEmailConfig(): Promise<ResolvedEmailConfig | null> {
  const settings = await prisma.emailSettings.findFirst({
    orderBy: { updatedAt: 'desc' },
  })

  if (settings?.smtpHost && settings?.smtpUser && settings?.smtpPass) {
    return {
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      user: settings.smtpUser,
      pass: settings.smtpPass,
      fromEmail: settings.fromEmail || process.env.SMTP_FROM_EMAIL || 'noreply@timetracking.app',
      fromName: settings.fromName || process.env.SMTP_FROM_NAME || 'Time Tracking App',
    }
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@timetracking.app',
      fromName: process.env.SMTP_FROM_NAME || 'Time Tracking App',
    }
  }

  return null
}

async function getTransporter() {
  const config = await resolveEmailConfig()

  if (config) {
    return {
      transporter: nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: { user: config.user, pass: config.pass },
      }),
      fromEmail: config.fromEmail,
      fromName: config.fromName,
    }
  }

  // Development: use ethereal email for testing
  if (process.env.NODE_ENV === 'development') {
    const testAccount = await nodemailer.createTestAccount()
    return {
      transporter: nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      }),
      fromEmail: 'noreply@timetracking.app',
      fromName: 'Time Tracking App (dev)',
    }
  }

  throw new Error('Email not configured')
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    const { transporter, fromEmail, fromName } = await getTransporter()

    const info = await transporter.sendMail({
      from: `"${fromName.replace(/"/g, '')}" <${fromEmail}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info))
    }

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: String(error) }
  }
}

export async function sendTimeEntrySubmittedEmail(userEmail: string, userName: string, weekStart: Date, weekEnd: Date) {
  const subject = 'Time Entry Submitted for Approval'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0ea5e9;">Time Entry Submitted</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p>Your time entries for the week of <strong>${weekStart.toLocaleDateString()}</strong> to <strong>${weekEnd.toLocaleDateString()}</strong> have been submitted for approval.</p>
      <p>An admin will review your entries shortly.</p>
      <hr style="margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated message from Time Tracking App.</p>
    </div>
  `
  return sendEmail({ to: userEmail, subject, html })
}

export async function sendTimeEntryApprovedEmail(userEmail: string, userName: string, weekStart: Date, weekEnd: Date) {
  const subject = 'Time Entry Approved'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #22c55e;">Time Entry Approved</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p>Your time entries for the week of <strong>${weekStart.toLocaleDateString()}</strong> to <strong>${weekEnd.toLocaleDateString()}</strong> have been <strong>approved</strong>.</p>
      <hr style="margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated message from Time Tracking App.</p>
    </div>
  `
  return sendEmail({ to: userEmail, subject, html })
}

export async function sendTimeEntryRejectedEmail(userEmail: string, userName: string, weekStart: Date, weekEnd: Date, reason: string) {
  const subject = 'Time Entry Rejected'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ef4444;">Time Entry Rejected</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p>Your time entries for the week of <strong>${weekStart.toLocaleDateString()}</strong> to <strong>${weekEnd.toLocaleDateString()}</strong> have been <strong>rejected</strong>.</p>
      <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
      <p>Please review and resubmit your time entries.</p>
      <hr style="margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated message from Time Tracking App.</p>
    </div>
  `
  return sendEmail({ to: userEmail, subject, html })
}

export async function sendWeeklyReminderEmail(userEmail: string, userName: string, weekStart: Date) {
  const subject = 'Weekly Time Entry Reminder'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Weekly Time Entry Reminder</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p>This is a reminder to submit your time entries for the week of <strong>${weekStart.toLocaleDateString()}</strong>.</p>
      <p>Please log your hours and submit for approval before the deadline.</p>
      <hr style="margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated message from Time Tracking App.</p>
    </div>
  `
  return sendEmail({ to: userEmail, subject, html })
}

export async function sendAdminNewSubmissionEmail(adminEmail: string, adminName: string, userName: string, weekStart: Date, weekEnd: Date) {
  const subject = 'New Time Entry Submission for Approval'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0ea5e9;">New Time Entry Submission</h2>
      <p>Hi ${escapeHtml(adminName)},</p>
      <p><strong>${escapeHtml(userName)}</strong> has submitted time entries for the week of <strong>${weekStart.toLocaleDateString()}</strong> to <strong>${weekEnd.toLocaleDateString()}</strong> for your approval.</p>
      <p><a href="${appUrl}/admin/time-entries" style="background: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Review Submissions</a></p>
      <hr style="margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated message from Time Tracking App.</p>
    </div>
  `
  return sendEmail({ to: adminEmail, subject, html })
}
