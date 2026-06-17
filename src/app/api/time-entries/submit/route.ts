import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireAuth } from '@/lib/auth'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'
import { sendTimeEntrySubmittedEmail, sendAdminNewSubmissionEmail } from '@/lib/email'
import { sendNotification } from '@/lib/notifications'

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

    const start = new Date(startDate)
    const end = new Date(endDate)

    const draftEntries = await prisma.timeEntry.findMany({
      where: {
        userId: session.userId,
        date: {
          gte: start,
          lte: end,
        },
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

    // Check if user has logged break for each day
    const daysWithEntries = new Set(draftEntries.map(e => e.date.toISOString().split('T')[0]))

    // Verify break entries exist for each day with work
    const breakProject = await prisma.project.findFirst({
      where: { name: 'Break' },
    })

    if (breakProject) {
      for (const day of daysWithEntries) {
        const hasBreak = draftEntries.some(e => 
          e.projectId === breakProject.id && 
          e.date.toISOString().split('T')[0] === day
        )
        if (!hasBreak) {
          return NextResponse.json(
            { error: `Break time not logged for ${day}. Please log your 1-hour break.` },
            { status: 400 }
          )
        }
      }
    }

    const updatedEntries = await prisma.timeEntry.updateMany({
      where: {
        userId: session.userId,
        date: {
          gte: start,
          lte: end,
        },
        status: 'DRAFT',
      },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    })

    for (const entry of draftEntries) {
      await createAuditLog({
        userId: session.userId,
        action: AuditActions.SUBMIT,
        entity: AuditEntities.TIME_ENTRY,
        entityId: entry.id,
        oldData: { status: 'DRAFT' },
        newData: { status: 'SUBMITTED', submittedAt: new Date() },
      })
    }

    // Get user for email
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    })

    if (user) {
      await sendTimeEntrySubmittedEmail(user.email, user.name, start, end)
      
      // Notify admins
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
      })
      
      for (const admin of admins) {
        await sendAdminNewSubmissionEmail(admin.email, admin.name, user.name, start, end)
        await sendNotification({
          userId: admin.id,
          type: 'TIME_ENTRY_SUBMITTED',
          title: 'New Time Entry Submission',
          message: `${user.name} submitted time entries for ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
          senderId: session.userId,
          metadata: { weekStart: start.toISOString(), weekEnd: end.toISOString(), submitterId: user.id },
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      submittedCount: updatedEntries.count 
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Submit time entries error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}