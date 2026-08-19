'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircleIcon, AlertIcon, InfoIcon, XIcon } from './icons'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

let nextId = 1

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++
    setToasts((prev) => [...prev.slice(-4), { id, type, message }])
    setTimeout(() => dismiss(id), 5000)
  }, [dismiss])

  const value: ToastContextValue = {
    toast,
    success: (m) => toast(m, 'success'),
    error: (m) => toast(m, 'error'),
    info: (m) => toast(m, 'info'),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const styles: Record<ToastType, { ring: string; icon: React.ReactNode; bar: string }> = {
    success: {
      ring: 'ring-emerald-200',
      bar: 'bg-emerald-500',
      icon: <CheckCircleIcon className="w-5 h-5 text-emerald-500" />,
    },
    error: {
      ring: 'ring-red-200',
      bar: 'bg-red-500',
      icon: <AlertIcon className="w-5 h-5 text-red-500" />,
    },
    info: {
      ring: 'ring-brand-blue/20',
      bar: 'bg-brand-blue',
      icon: <InfoIcon className="w-5 h-5 text-brand-blue" />,
    },
  }

  const s = styles[toast.type]

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto relative overflow-hidden flex items-start gap-3 rounded-lg bg-white pl-4 pr-3 py-3 shadow-lifted ring-1 transition-all duration-200',
        s.ring,
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      )}
    >
      <span className={cn('absolute left-0 top-0 h-full w-1', s.bar)} aria-hidden="true" />
      {s.icon}
      <p className="flex-1 text-sm text-brand-navy leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-brand-gray-muted hover:text-brand-navy transition-colors cursor-pointer"
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
