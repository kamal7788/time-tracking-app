'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.coerce.number().min(1).max(65535),
  smtpUser: z.string().min(1, 'SMTP user is required'),
  smtpPass: z.string().min(1, 'SMTP password is required'),
  fromEmail: z.string().email('Invalid email'),
  fromName: z.string().min(1, 'From name is required'),
})

export default function AdminSettingsPage() {
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof emailSettingsSchema>>({
    resolver: zodResolver(emailSettingsSchema),
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/email-settings')
      const data = await res.json()
      if (data.settings) {
        reset({
          smtpHost: data.settings.smtpHost || '',
          smtpPort: data.settings.smtpPort || 587,
          smtpUser: data.settings.smtpUser || '',
          smtpPass: '',
          fromEmail: data.settings.fromEmail || '',
          fromName: data.settings.fromName || '',
        })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: z.infer<typeof emailSettingsSchema>) => {
    setSuccess('')
    setError('')
    try {
      const res = await fetch('/api/admin/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setSuccess('Settings saved successfully')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save')
    }
  }

  if (isLoading) {
    return <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div></div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure email notifications</p>
      </div>

      {success && <div className="bg-green-50 text-green-700 p-4 rounded-lg">{success}</div>}
      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>}

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Email Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">SMTP settings for sending notifications</p>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">SMTP Host</label>
                <input {...register('smtpHost')} className="input" placeholder="smtp.example.com" />
                {errors.smtpHost && <p className="text-sm text-red-600 mt-1">{errors.smtpHost.message}</p>}
              </div>
              <div>
                <label className="label">SMTP Port</label>
                <input type="number" {...register('smtpPort')} className="input" placeholder="587" />
                {errors.smtpPort && <p className="text-sm text-red-600 mt-1">{errors.smtpPort.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">SMTP Username</label>
                <input {...register('smtpUser')} className="input" placeholder="user@example.com" />
                {errors.smtpUser && <p className="text-sm text-red-600 mt-1">{errors.smtpUser.message}</p>}
              </div>
              <div>
                <label className="label">SMTP Password</label>
                <input type="password" {...register('smtpPass')} className="input" placeholder="Enter password" />
                {errors.smtpPass && <p className="text-sm text-red-600 mt-1">{errors.smtpPass.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">From Email</label>
                <input type="email" {...register('fromEmail')} className="input" placeholder="noreply@yourdomain.com" />
                {errors.fromEmail && <p className="text-sm text-red-600 mt-1">{errors.fromEmail.message}</p>}
              </div>
              <div>
                <label className="label">From Name</label>
                <input {...register('fromName')} className="input" placeholder="Time Tracking App" />
                {errors.fromName && <p className="text-sm text-red-600 mt-1">{errors.fromName.message}</p>}
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}