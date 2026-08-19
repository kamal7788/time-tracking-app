'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { BellIcon } from '@/components/ui/icons'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const toast = useToast()

  const load = async () => {
    try {
      const res = await fetch(`/api/notifications${filter === 'unread' ? '?unreadOnly=true' : ''}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setNotifications(data.notifications || [])
    } catch {
      toast.error('Could not load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markRead' }),
    })
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
  }

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markAllRead' }),
    })
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    toast.success('All notifications marked as read')
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy tracking-tight">Notifications</h1>
          <p className="text-sm text-brand-gray mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-brand-border overflow-hidden">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                filter === 'all' ? 'bg-brand-blue text-white' : 'bg-white text-brand-gray hover:bg-brand-surface'
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                filter === 'unread' ? 'bg-brand-blue text-white' : 'bg-white text-brand-gray hover:bg-brand-surface'
              )}
            >
              Unread
            </button>
          </div>
          {unreadCount > 0 && (
            <button type="button" onClick={markAllRead} className="btn-outline text-sm">
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <BellIcon className="w-10 h-10 text-brand-gray-muted mx-auto" />
            <p className="mt-3 text-sm text-brand-gray">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-brand-border/60">
            {notifications.map((n) => (
              <li key={n.id} className={cn('px-5 py-4 flex items-start gap-3', !n.isRead && 'bg-brand-blue/[0.03]')}>
                <span
                  className={cn('mt-1.5 w-2 h-2 rounded-full flex-shrink-0', n.isRead ? 'bg-transparent' : 'bg-brand-blue')}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm', n.isRead ? 'text-brand-gray' : 'text-brand-navy font-medium')}>
                    {n.title}
                  </p>
                  <p className="text-sm text-brand-gray mt-0.5">{n.message}</p>
                  <p className="text-xs text-brand-gray-muted mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className="text-xs font-medium text-brand-blue hover:text-brand-blue-dark transition-colors cursor-pointer flex-shrink-0"
                  >
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
