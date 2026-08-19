import { z } from 'zod'

const TIME_REGEX = /^([01][0-9]|2[0-3]):[0-5][0-9]$/
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required').max(200),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(200)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

function durationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const start = sh * 60 + sm
  const end = eh * 60 + em
  if (end === start) return 0
  if (end < start) return 1440 - start + end // overnight crosses midnight
  return end - start
}

export const timeEntrySchema = z.object({
  projectId: z.string().min(1, 'Project is required').max(64),
  date: z.string().regex(DATE_REGEX, 'Date must be in YYYY-MM-DD format'),
  startTime: z.string().regex(TIME_REGEX, 'Invalid time format (HH:MM, 24-hour)'),
  endTime: z.string().regex(TIME_REGEX, 'Invalid time format (HH:MM, 24-hour)'),
  description: z.string().max(2000).optional(),
}).refine((data) => durationMinutes(data.startTime, data.endTime) > 0, {
  message: 'End time must be different from start time (overnight entries are allowed)',
  path: ['endTime'],
}).refine((data) => durationMinutes(data.startTime, data.endTime) % 15 === 0, {
  message: 'Duration must be in 15-minute increments',
  path: ['endTime'],
})

export const clientSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(100),
  description: z.string().max(1000).optional(),
})

export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().max(1000).optional(),
  clientId: z.string().min(1, 'Client is required').max(64),
})

export const commonWorkSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(1000).optional(),
  projectId: z.string().min(1, 'Project is required').max(64),
  defaultDuration: z
    .number()
    .min(15)
    .max(480)
    .refine((v) => v % 15 === 0, { message: 'Duration must be in 15-minute increments' })
    .optional(),
})

export const approvalSchema = z.object({
  timeEntryIds: z.array(z.string().max(64)).min(1, 'At least one entry required').max(500),
  action: z.enum(['approve', 'reject']),
  rejectReason: z.string().max(1000).optional(),
}).refine((data) => {
  if (data.action === 'reject' && !data.rejectReason) {
    return false
  }
  return true
}, {
  message: 'Rejection reason is required',
  path: ['rejectReason'],
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .max(200)
    .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'New password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'New password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').max(255),
})

export const timezoneSchema = z.object({
  timeZone: z.string().min(1).max(100),
})

export const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP host is required').max(255),
  smtpPort: z.number().min(1).max(65535),
  smtpUser: z.string().min(1, 'SMTP user is required').max(255),
  smtpPass: z.string().max(500).optional().or(z.literal('')),
  fromEmail: z.string().email('Invalid from email').max(255),
  fromName: z.string().min(1, 'From name is required').max(100),
})

export const expenseSchema = z.object({
  itemName: z.string().min(1, 'Item name is required').max(255),
  amount: z.number().positive('Amount must be positive').max(999999.99, 'Amount is too large'),
  date: z.string().regex(DATE_REGEX, 'Date must be in YYYY-MM-DD format'),
  description: z.string().min(1, 'Description is required').max(2000),
})

export const expenseApprovalSchema = z.object({
  expenseIds: z.array(z.string().max(64)).min(1, 'At least one expense required').max(500),
  action: z.enum(['approve', 'reject']),
  rejectReason: z.string().max(1000).optional(),
}).refine((data) => {
  if (data.action === 'reject' && !data.rejectReason) {
    return false
  }
  return true
}, {
  message: 'Rejection reason is required',
  path: ['rejectReason'],
})

export const adminCreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(200)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  role: z.enum(['ADMIN', 'USER']).optional(),
})

export const adminUpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(['ADMIN', 'USER']).optional(),
  isActive: z.boolean().optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(200)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
    .optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type TimeEntryInput = z.infer<typeof timeEntrySchema>
export type ClientInput = z.infer<typeof clientSchema>
export type ProjectInput = z.infer<typeof projectSchema>
export type CommonWorkInput = z.infer<typeof commonWorkSchema>
export type ApprovalInput = z.infer<typeof approvalSchema>
export type EmailSettingsInput = z.infer<typeof emailSettingsSchema>
export type ExpenseInput = z.infer<typeof expenseSchema>
export type ExpenseApprovalInput = z.infer<typeof expenseApprovalSchema>
