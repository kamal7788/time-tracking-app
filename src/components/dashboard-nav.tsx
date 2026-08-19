'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import NotificationBell from './notification-bell'
import {
  ClockIcon, CalendarIcon, HomeIcon, ReceiptIcon,
  SettingsIcon, LogoutIcon, MenuIcon, XIcon, BriefcaseIcon, FolderIcon,
} from '@/components/ui/icons'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, exact: true },
  { name: 'Time Entries', href: '/dashboard/time-entries', icon: ClockIcon },
  { name: 'Leaves', href: '/dashboard/leaves', icon: UmbrellaIconFallback },
  { name: 'My Templates', href: '/dashboard/clients', icon: BriefcaseIcon },
  { name: 'Common Works', href: '/dashboard/common-works', icon: FolderIcon },
  { name: 'Expenses', href: '/dashboard/expenses', icon: ReceiptIcon },
]

// Umbrella icon alias kept inline to avoid circular imports
function UmbrellaIconFallback(props: { className?: string }) {
  return (
    <svg className={cn('w-5 h-5', props.className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7" />
    </svg>
  )
}

const bottomNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: SettingsIcon },
]

interface DashboardNavProps {
  userName?: string
  userEmail?: string
}

export default function DashboardNav({ userName, userEmail }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const displayName = userName || userEmail || 'User'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const isItemActive = (item: { href: string; exact?: boolean }) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/')

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-brand-navy px-4 py-3 flex items-center justify-between shadow-sidebar">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="text-white p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
        <span className="text-white font-semibold text-lg tracking-tight">TimeTracker</span>
        <NotificationBell notificationsHref="/dashboard/notifications" />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'sidebar w-72',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-brand-blue flex items-center justify-center">
            <ClockIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-white font-semibold text-lg tracking-tight">TimeTracker</span>
            <p className="text-slate-400 text-xs">Workspace</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="lg:hidden ml-auto text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Main navigation">
          {navigation.map((item) => {
            const Icon = item.icon
            const active = isItemActive(item)
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(active ? 'sidebar-link-active' : 'sidebar-link-inactive')}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
          {bottomNavigation.map((item) => {
            const Icon = item.icon
            const active = isItemActive(item)
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(active ? 'sidebar-link-active' : 'sidebar-link-inactive')}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            )
          })}

          {/* User profile */}
          <div className="mt-2 px-2 py-2.5 rounded-lg bg-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{displayName}</p>
              {userEmail && <p className="text-slate-400 text-xs truncate">{userEmail}</p>}
            </div>
            <div className="hidden lg:block">
              <NotificationBell notificationsHref="/dashboard/notifications" />
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogoutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
