'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { changePasswordSchema } from '@/lib/validations'
import { z } from 'zod'

const timeZoneSchema = z.object({
  timeZone: z.string().min(1, 'Time zone is required'),
})

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
})

const TIME_ZONES = [
  { value: 'Pacific/Midway', label: '(UTC-11:00) Midway Island' },
  { value: 'Pacific/Honolulu', label: '(UTC-10:00) Hawaii' },
  { value: 'America/Anchorage', label: '(UTC-09:00) Alaska' },
  { value: 'America/Los_Angeles', label: '(UTC-08:00) Pacific Time (US)' },
  { value: 'America/Denver', label: '(UTC-07:00) Mountain Time (US)' },
  { value: 'America/Chicago', label: '(UTC-06:00) Central Time (US)' },
  { value: 'America/New_York', label: '(UTC-05:00) Eastern Time (US)' },
  { value: 'America/Caracas', label: '(UTC-04:30) Caracas' },
  { value: 'America/Halifax', label: '(UTC-04:00) Atlantic Time' },
  { value: 'America/St_Johns', label: '(UTC-03:30) Newfoundland' },
  { value: 'America/Argentina/Buenos_Aires', label: '(UTC-03:00) Buenos Aires' },
  { value: 'Atlantic/South_Georgia', label: '(UTC-02:00) Mid-Atlantic' },
  { value: 'Atlantic/Azores', label: '(UTC-01:00) Azores' },
  { value: 'UTC', label: '(UTC+00:00) UTC/GMT' },
  { value: 'Europe/London', label: '(UTC+00:00) London' },
  { value: 'Europe/Paris', label: '(UTC+01:00) Paris' },
  { value: 'Europe/Helsinki', label: '(UTC+02:00) Helsinki' },
  { value: 'Europe/Moscow', label: '(UTC+03:00) Moscow' },
  { value: 'Asia/Dubai', label: '(UTC+04:00) Dubai' },
  { value: 'Asia/Kabul', label: '(UTC+04:30) Kabul' },
  { value: 'Asia/Karachi', label: '(UTC+05:00) Karachi' },
  { value: 'Asia/Kathmandu', label: '(UTC+05:45) Kathmandu (Nepal)' },
  { value: 'Asia/Kolkata', label: '(UTC+05:30) Kolkata' },
  { value: 'Asia/Dhaka', label: '(UTC+06:00) Dhaka' },
  { value: 'Asia/Bangkok', label: '(UTC+07:00) Bangkok' },
  { value: 'Asia/Shanghai', label: '(UTC+08:00) Shanghai' },
  { value: 'Asia/Singapore', label: '(UTC+08:00) Singapore' },
  { value: 'Asia/Tokyo', label: '(UTC+09:00) Tokyo' },
  { value: 'Australia/Sydney', label: '(UTC+10:00) Sydney' },
  { value: 'Pacific/Auckland', label: '(UTC+12:00) Auckland' },
]

interface UserSettings {
  id: string
  name: string
  email: string
  role: string
  timeZone: string
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const { register: registerProfile, handleSubmit: handleSubmitProfile, formState: { errors: profileErrors, isSubmitting: profileSubmitting } } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
  })

  const { register: registerTimezone, handleSubmit: handleSubmitTimezone, formState: { errors: tzErrors, isSubmitting: tzSubmitting } } = useForm<z.infer<typeof timeZoneSchema>>({
    resolver: zodResolver(timeZoneSchema),
  })

  const { register: registerPassword, handleSubmit: handleSubmitPassword, reset: resetPassword, formState: { errors: passwordErrors, isSubmitting: passwordSubmitting } } = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
  })

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/user/settings')
      const data = await res.json()
      setUser(data.user)
    } catch (error) {
      console.error('Failed to fetch user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitProfile = async (data: { name: string; email: string }) => {
    setSuccess('')
    setError('')
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setSuccess('Profile updated successfully')
      fetchUser()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update profile')
    }
  }

  const onSubmitPassword = async (data: z.infer<typeof changePasswordSchema>) => {
    setSuccess('')
    setError('')
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setSuccess('Password changed successfully')
      resetPassword()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to change password')
    }
  }

  const onSubmitTimezone = async (data: { timeZone: string }) => {
    setSuccess('')
    setError('')
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setSuccess('Time zone updated successfully')
      fetchUser()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update time zone')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!user) {
    return <div className="text-center py-12 text-gray-500">Failed to load settings</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account settings</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Profile Settings */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input
                {...registerProfile('name')}
                defaultValue={user.name}
                className="input"
              />
              {profileErrors.name && <p className="text-sm text-red-600 mt-1">{profileErrors.name.message}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input
                {...registerProfile('email')}
                type="email"
                defaultValue={user.email}
                className="input"
              />
              {profileErrors.email && <p className="text-sm text-red-600 mt-1">{profileErrors.email.message}</p>}
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={profileSubmitting} className="btn-primary">
                {profileSubmitting ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
          <p className="text-sm text-gray-500 mt-1">Update your account password</p>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input
                type="password"
                {...registerPassword('currentPassword')}
                className="input"
              />
              {passwordErrors.currentPassword && <p className="text-sm text-red-600 mt-1">{passwordErrors.currentPassword.message}</p>}
            </div>
            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                {...registerPassword('newPassword')}
                className="input"
              />
              {passwordErrors.newPassword && <p className="text-sm text-red-600 mt-1">{passwordErrors.newPassword.message}</p>}
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                {...registerPassword('confirmPassword')}
                className="input"
              />
              {passwordErrors.confirmPassword && <p className="text-sm text-red-600 mt-1">{passwordErrors.confirmPassword.message}</p>}
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={passwordSubmitting} className="btn-primary">
                {passwordSubmitting ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Time Zone Settings */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Time Zone</h2>
          <p className="text-sm text-gray-500 mt-1">Select your local time zone</p>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmitTimezone(onSubmitTimezone)} className="space-y-4">
            <div>
              <label className="label">Current Time Zone</label>
              <select
                {...registerTimezone('timeZone')}
                defaultValue={user.timeZone}
                className="input"
              >
                {TIME_ZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              {tzErrors.timeZone && <p className="text-sm text-red-600 mt-1">{tzErrors.timeZone.message}</p>}
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={tzSubmitting} className="btn-primary">
                {tzSubmitting ? 'Saving...' : 'Save Time Zone'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Account Info */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Account</h2>
        </div>
        <div className="card-body">
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-600">Role</dt>
              <dd className="font-medium text-gray-900">{user.role}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Time Zone</dt>
              <dd className="font-medium text-gray-900">{user.timeZone}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}