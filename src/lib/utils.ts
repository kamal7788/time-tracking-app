import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string, formatStr: string = 'PPP'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, formatStr)
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
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

export function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

export function calculateDuration(startTime: string, endTime: string): number {
  const start = timeStringToMinutes(startTime)
  const end = timeStringToMinutes(endTime)
  if (end <= start) return 0
  return end - start
}

export function addMinutesToTime(timeStr: string, minutes: number): string {
  const totalMinutes = timeStringToMinutes(timeStr) + minutes
  return minutesToTimeString(totalMinutes)
}