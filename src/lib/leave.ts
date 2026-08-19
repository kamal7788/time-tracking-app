import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

/** Counts working days (Mon–Fri) between two date strings, inclusive. */
export function workingDaysBetween(start: Date, end: Date): number {
  let count = 0
  const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))
  while (current <= last) {
    const day = current.getUTCDay()
    if (day !== 0 && day !== 6) count++
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return count
}

/** Splits an inclusive date range into per-year working-day counts. */
export function splitWorkingDaysByYear(start: Date, end: Date): Map<number, number> {
  const result = new Map<number, number>()
  const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))
  while (current <= last) {
    const day = current.getUTCDay()
    if (day !== 0 && day !== 6) {
      const year = current.getUTCFullYear()
      result.set(year, (result.get(year) || 0) + 1)
    }
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return result
}

/**
 * Debits leave days from the balance for a given year.
 * Creates the balance row if it does not exist (records the usage even when
 * no allocation was made, so admins can see the overdraft).
 */
export async function debitLeaveBalance(
  tx: Prisma.TransactionClient,
  userId: string,
  leaveTypeId: string,
  year: number,
  days: number
) {
  await tx.leaveBalance.upsert({
    where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
    create: { userId, leaveTypeId, year, allocatedDays: 0, usedDays: days },
    update: { usedDays: { increment: days } },
  })
}

/** Refunds leave days to the balance for a given year (floors at 0). */
export async function refundLeaveBalance(
  tx: Prisma.TransactionClient,
  userId: string,
  leaveTypeId: string,
  year: number,
  days: number
) {
  const balance = await tx.leaveBalance.findUnique({
    where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
  })
  if (!balance) return
  await tx.leaveBalance.update({
    where: { id: balance.id },
    data: { usedDays: Math.max(0, balance.usedDays - days) },
  })
}

/** Returns available days (allocated + carriedOver - used) for a year, or null when no balance row exists. */
export async function getAvailableLeaveDays(
  userId: string,
  leaveTypeId: string,
  year: number
): Promise<number | null> {
  const balance = await prisma.leaveBalance.findUnique({
    where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
  })
  if (!balance) return null
  return balance.allocatedDays + balance.carriedOverDays - balance.usedDays
}
