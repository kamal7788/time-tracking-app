import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined, formatStr: string = 'PPP'): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return format(d, formatStr)
}

/** 12-hour display format, e.g. "09:30 AM". For display only — never parse this. */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * 24-hour "HH:MM" format. Safe to parse with timeStringToMinutes and to feed
 * <input type="time"> values.
 */
export function formatTime24(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Extracts the stored "HH:MM" wall-clock time from a Time of day column value.
 * TimeEntry startTime/endTime are stored on the 1970-01-01 epoch date in UTC,
 * so we read the UTC hours/minutes to get the intended wall time back
 * regardless of the server's timezone.
 */
export function storedTimeToHHMM(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  const hours = d.getUTCHours().toString().padStart(2, '0')
  const minutes = d.getUTCMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`
  } else if (hours > 0) {
    return `${hours}h`
  }
  return `${mins}m`
}

export function getWeekDates(date: Date = new Date()): Date[] {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  start.setHours(0, 0, 0, 0)

  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d)
  }
  return dates
}

export function getWeekStart(date: Date = new Date()): Date {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  start.setHours(0, 0, 0, 0)
  return start
}

export function getWeekEnd(date: Date = new Date()): Date {
  const end = new Date(date)
  end.setDate(end.getDate() + (6 - end.getDay()))
  end.setHours(23, 59, 59, 999)
  return end
}

export function roundTo15Minutes(minutes: number): number {
  return Math.round(minutes / 15) * 15
}

export function isValid15MinuteIncrement(minutes: number): boolean {
  return minutes % 15 === 0
}

/** Strict "HH:MM" → minutes since midnight. Returns NaN for invalid input. */
export function timeStringToMinutes(timeStr: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim())
  if (!match) return NaN
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return NaN
  return hours * 60 + minutes
}

export function minutesToTimeString(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440
  const hours = Math.floor(wrapped / 60)
  const mins = wrapped % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Duration in minutes between two "HH:MM" times.
 * Supports overnight ranges: if end <= start, the end is treated as the next day.
 * Returns 0 for identical times.
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const start = timeStringToMinutes(startTime)
  const end = timeStringToMinutes(endTime)
  if (isNaN(start) || isNaN(end)) return 0
  if (end === start) return 0
  if (end < start) return 1440 - start + end // overnight
  return end - start
}

export function addMinutesToTime(timeStr: string, minutes: number): string {
  const totalMinutes = timeStringToMinutes(timeStr) + minutes
  return minutesToTimeString(totalMinutes)
}

/** Parses a "YYYY-MM-DD" string into a Date at UTC midnight. Returns null if invalid. */
export function parseEntryDate(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim())
  if (!match) return null
  const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return isNaN(d.getTime()) ? null : d
}

/** Formats a Date as "YYYY-MM-DD" in local time (for <input type="date"> values). */
export function toLocalDateInputValue(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Builds the epoch-based Date used for Time-of-day columns (stored as UTC wall time). */
export function timeToStoredDate(timeStr: string): Date | null {
  const minutes = timeStringToMinutes(timeStr)
  if (isNaN(minutes)) return null
  return new Date(Date.UTC(1970, 0, 1, Math.floor(minutes / 60), minutes % 60, 0))
}

/** 12-hour display of a stored time-of-day value (reads the UTC wall clock). */
export function formatStoredTime(date: Date | string | null | undefined): string {
  const hhmm = storedTimeToHHMM(date)
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`
}

/**
 * Day key ("YYYY-MM-DD") for a TimeEntry date column value.
 * Dates are stored at UTC midnight, so the UTC date is the canonical key.
 */
export function entryDateKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

/**
 * Week bounds (Sunday–Saturday) in UTC, matching the UTC-midnight date storage.
 * Returns { start, end } inclusive UTC-midnight Dates.
 */
export function getWeekBoundsUTC(reference: Date = new Date()): { start: Date; end: Date } {
  const day = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()))
  day.setUTCDate(day.getUTCDate() - day.getUTCDay())
  const end = new Date(day)
  end.setUTCDate(end.getUTCDate() + 6)
  return { start: day, end }
}

/** Parses a ?week=YYYY-MM-DD param; returns null when absent/invalid. */
export function parseWeekParam(value: string | undefined): Date | null {
  if (!value) return null
  return parseEntryDate(value)
}
