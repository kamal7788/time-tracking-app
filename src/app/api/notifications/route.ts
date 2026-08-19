import { NextRequest, NextResponse } from 'next/server'
import { getSession, requireAuth } from '@/lib/auth'
import { getNotifications, getUnreadCount, markAllNotificationsRead } from '@/lib/notifications'
import { handleApiError } from '@/lib/api'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const [notifications, unreadCount] = await Promise.all([
      getNotifications(session.userId, unreadOnly),
      getUnreadCount(session.userId),
    ])

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    return handleApiError(error, 'Get notifications error:')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { action } = body

    if (action === 'markAllRead') {
      await markAllNotificationsRead(session.userId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return handleApiError(error, 'Notifications action error:')
  }
}