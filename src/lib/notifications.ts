import { prisma } from './prisma'

export interface NotificationData {
  userId: string
  type: string
  title: string
  message: string
  senderId?: string
  metadata?: Record<string, unknown>
}

export async function sendNotification(data: NotificationData) {
  try {
    await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        senderId: data.senderId,
        metadata: data.metadata,
      },
    })
  } catch (error) {
    console.error('Notification error:', error)
  }
}

export async function getNotifications(userId: string, unreadOnly = false) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function markNotificationRead(notificationId: string, userId: string) {
  return prisma.notification.update({
    where: { id: notificationId, userId },
    data: { isRead: true },
  })
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  })
}