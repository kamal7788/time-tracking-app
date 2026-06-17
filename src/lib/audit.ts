import { prisma } from './prisma'
import { headers } from 'next/headers'
import { Prisma } from '@prisma/client'

export interface AuditLogData {
  userId: string
  action: string
  entity: string
  entityId: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
}

export async function createAuditLog(data: AuditLogData) {
  try {
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        oldData: data.oldData as Prisma.InputJsonValue | undefined,
        newData: data.newData as Prisma.InputJsonValue | undefined,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    console.error('Audit log error:', error)
  }
}

export const AuditActions = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  SUBMIT: 'SUBMIT',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
} as const

export const AuditEntities = {
  TIME_ENTRY: 'TimeEntry',
  USER: 'User',
  CLIENT: 'Client',
  PROJECT: 'Project',
  NOTIFICATION: 'Notification',
} as const