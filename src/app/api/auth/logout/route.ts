import { NextResponse } from 'next/server'
import { clearAuthCookie, getSession } from '@/lib/auth'
import { createAuditLog, AuditActions, AuditEntities } from '@/lib/audit'

export async function POST() {
  try {
    const session = await getSession()
    if (session) {
      await createAuditLog({
        userId: session.userId,
        action: AuditActions.LOGOUT,
        entity: AuditEntities.USER,
        entityId: session.userId,
      })
    }

    await clearAuthCookie()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}