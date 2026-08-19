import { prisma } from './prisma'
import { storedTimeToHHMM, timeStringToMinutes, formatStoredTime } from './utils'

export interface OverlapResult {
  overlaps: boolean
  message?: string
}

/**
 * Checks whether a proposed entry [startMin, endMin) on `date` (UTC midnight)
 * overlaps any existing non-rejected entry for the user. `endMin` may exceed
 * 1440 for overnight entries. Overnight spill from the previous day is also
 * considered.
 */
export async function findTimeEntryOverlap(
  userId: string,
  date: Date,
  startMin: number,
  endMin: number,
  excludeId?: string
): Promise<OverlapResult> {
  const baseWhere = {
    userId,
    status: { not: 'REJECTED' as const },
    ...(excludeId ? { id: { not: excludeId } } : {}),
  }

  const prevDate = new Date(date)
  prevDate.setUTCDate(prevDate.getUTCDate() - 1)

  const [sameDay, prevDay] = await Promise.all([
    prisma.timeEntry.findMany({ where: { ...baseWhere, date } }),
    prisma.timeEntry.findMany({ where: { ...baseWhere, date: prevDate } }),
  ])

  // Helper to get duration in minutes, handling overnight (end <= start)
  const getDuration = (s: number, e: number): number => e <= s ? e + 1440 - s : e - s

  for (const existing of sameDay) {
    const s = timeStringToMinutes(storedTimeToHHMM(existing.startTime))
    const e = timeStringToMinutes(storedTimeToHHMM(existing.endTime))
    if (isNaN(s) || isNaN(e)) continue
    const existingDuration = getDuration(s, e)
    const duration = getDuration(startMin, endMin)

    // Check if either entry is empty or zero duration
    if (existingDuration === 0 || duration === 0) continue

    // Overlap logic: two intervals overlap if one's start is within the other
    const overlapStart = Math.max(s, startMin)
    const overlapEnd = Math.min(e, endMin)
    if (overlapStart < overlapEnd) {
      return {
        overlaps: true,
        message: `Overlaps with existing entry from ${formatStoredTime(existing.startTime)} to ${formatStoredTime(existing.endTime)}`,
      }
    }
  }

  // Handle overnight entries that started on previous day
  for (const existing of prevDay) {
    const s = timeStringToMinutes(storedTimeToHHMM(existing.startTime))
    const e = timeStringToMinutes(storedTimeToHHMM(existing.endTime))
    if (isNaN(s) || isNaN(e)) continue

    const existingDuration = getDuration(s, e)
    const duration = getDuration(startMin, endMin)


    if (existingDuration === 0 || duration === 0) continue

    // Shift overnight entry into this day's coordinate space
    const s2 = s - 1440
    const e2 = e - 1440

    // Overlap logic for shifted coordinates
    const overlapStart = Math.max(s2, startMin)
    const overlapEnd = Math.min(e2, endMin)
    if (overlapStart < overlapEnd) {
      return {
        overlaps: true,
        message: `Overlaps with overnight entry started the previous day at ${formatStoredTime(existing.startTime)}`,
      }
    }
  }

  return { overlaps: false }
}
