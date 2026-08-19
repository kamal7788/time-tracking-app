import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { sendTimeEntrySubmittedEmail, sendAdminNewSubmissionEmail } from '@/lib/email'
import { sendNotification } from '@/lib/notifications'
import { handleApiError, parseDateParam } from '@/lib/api'
import { entryDateKey } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { startDate, endDate } = body

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    const start = parseDateParam(startDate)
    const end = parseDateParam(endDate)
    if (!start || !end) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      )
    }
    if (start > end) {
      return NextResponse.json(
        { error: 'Start date must be before or equal to end date' },
        { status: 400 }
      )
    }

    const draftEntries = await prisma.timeEntry.findMany({
      where: {
        userId: session.userId,
        date: { gte: start, lte: end },
        status: 'DRAFT',
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
    })

    if (draftEntries.length === 0) {
      return NextResponse.json(
        { error: 'No draft entries to submit' },
        { status: 400 }
      )
    }

    // Break policy: when a company "Break" project exists, each submitted day
    // must include at least 60 minutes logged against it.
    const breakProject = await prisma.project.findFirst({
      where: { name: 'Break', isActive: true, isPersonal: false },
    })

    if (breakProject) {
      const minutesByDay = new Map<string, number>()
      for (const entry of draftEntries) {
        if (entry.projectId !== breakProject.id) continue
        const day = entryDateKey(entry.date)
        minutesByDay.set(day, (minutesByDay.get(day) || 0) + entry.duration)
      }

      const daysWithWork = new Set(
        draftEntries
          .filter((e) => e.projectId !== breakProject.id)
          .map((e) => entryDateKey(e.date))
      )

      for (const day of daysWithWork) {
        const breakMinutes = minutesByDay.get(day) || 0
        if (breakMinutes < 60) {
          return NextResponse.json(
            { error: `Break time not logged for ${day}. Please log your 1-hour break.` },
            { status: 400 }
          )
        }
      }
    }

    const submittedAt = new Date()
    const entryIds = draftEntries.map((e) => e.id)

    // Validate all draft entries belong to the current user
    const unauthorizedEntries = draftEntries.filter(entry => entry.userId !== session.userId)
    if (unauthorizedEntries.length > 0) {
      return NextResponse.json(
        { error: 'Unauthorized access to draft entries' },
        { status: 403 }
      )
    }

    const updatedEntries = await prisma.timeEntry.updateMany({
      where: {
        id: { in: entryIds },
        status: 'DRAFT',
        userId: session.userId, // Additional security check
      },
      data: {
        status: 'SUBMITTED',
        submittedAt,
      },
    })

    if (updatedEntries.count === 0) {
      return NextResponse.json(
        { error: 'No draft entries were submitted' },
        { status: 400 }
      )
    }

    // Side effects — must not fail the request after state change
    const sideEffects = async () => {
      for (const entry of draftEntries) {
        await createAuditLog({
          userId: session.userId,
          action: AuditActions.SUBMIT,
          entity: AuditEntities.TIME_ENTRY,
          entityId: entry.id,
          oldData: { status: 'DRAFT' },
          newData: { status: 'SUBMITTED', submittedAt },
        })
      }

      const user = await prisma.user.findUnique({
        where: { id: session.userId },
      })

      if (user) {
        await sendTimeEntrySubmittedEmail(user.email, user.name, start, end)

        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN', isActive: true },
        })

        await Promise.allSettled(
          admins.map(async (admin) => {
            await sendAdminNewSubmissionEmail(admin.email, admin.name, user.name, start, end)
            await sendNotification({
              userId: admin.id,
              type: 'TIME_ENTRY_SUBMITTED',
              title: 'New Time Entry Submission',
              message: `${user.name} submitted time entries for ${startDate} - ${endDate}`,
              senderId: session.userId,
              metadata: { weekStart: start.toISOString(), weekEnd: end.toISOString(), submitterId: user.id },
            })
          })
        )
      }
    }

    await sideEffects().catch((err) => console.error('Submit side effects error:', err))

    return NextResponse.json({
      success: true,
      submittedCount: updatedEntries.count
    })
  } catch (error) {
    return handleApiError(error, 'Submit time entries')
  }
}
