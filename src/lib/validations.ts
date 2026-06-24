import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const timeEntrySchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  description: z.string().optional(),
}).refine((data) => {
  const start = data.startTime.split(':').map(Number)
  const end = data.endTime.split(':').map(Number)
  const startMinutes = start[0] * 60 + start[1]
  const endMinutes = end[0] * 60 + end[1]
  return endMinutes > startMinutes
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
}).refine((data) => {
  const start = data.startTime.split(':').map(Number)
  const end = data.endTime.split(':').map(Number)
  const startMinutes = start[0] * 60 + start[1]
  const endMinutes = end[0] * 60 + end[1]
  const duration = endMinutes - startMinutes
  return duration % 15 === 0
}, {
  message: 'Duration must be in 15-minute increments',
  path: ['endTime'],
})

export const clientSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(100),
  description: z.string().optional(),
})

export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().optional(),
  clientId: z.string().min(1, 'Client is required'),
})

export const commonWorkSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  projectId: z.string().min(1, 'Project is required'),
  defaultDuration: z.number().min(15).max(480).optional(), // 15 min to 8 hours
})

export const approvalSchema = z.object({
  timeEntryIds: z.array(z.string()).min(1, 'At least one entry required'),
  action: z.enum(['approve', 'reject']),
  rejectReason: z.string().optional(),
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
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.number().min(1).max(65535),
  smtpUser: z.string().min(1, 'SMTP user is required'),
  smtpPass: z.string().min(1, 'SMTP password is required'),
  fromEmail: z.string().email('Invalid from email'),
  fromName: z.string().min(1, 'From name is required'),
})

export const expenseSchema = z.object({
  itemName: z.string().min(1, 'Item name is required').max(255),
  amount: z.number().positive('Amount must be positive').max(999999.99, 'Amount is too large'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
})

export const expenseApprovalSchema = z.object({
  expenseIds: z.array(z.string()).min(1, 'At least one expense required'),
  action: z.enum(['approve', 'reject']),
  rejectReason: z.string().optional(),
}).refine((data) => {
  if (data.action === 'reject' && !data.rejectReason) {
    return false
  }
  return true
}, {
  message: 'Rejection reason is required',
  path: ['rejectReason'],
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