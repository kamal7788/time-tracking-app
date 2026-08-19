import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/**
 * Idempotent seed:
 * 1. Admin user from ADMIN_EMAIL / ADMIN_PASSWORD env vars
 * 2. Company "Internal" client + "Break" project (required by the submit flow)
 * 3. Default leave types
 */
async function main() {
  // ---------- 1. Admin user ----------
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminName = process.env.ADMIN_NAME || 'Administrator'

  let adminId: string | null = null

  if (adminEmail && adminPassword) {
    if (adminPassword.length < 8) {
      console.warn('ADMIN_PASSWORD must be at least 8 characters — skipping admin creation')
    } else {
      const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail },
      })

      if (existingAdmin) {
        adminId = existingAdmin.id
        if (existingAdmin.role !== 'ADMIN') {
          await prisma.user.update({
            where: { email: adminEmail },
            data: { role: 'ADMIN' },
          })
          console.log(`Updated ${adminEmail} to ADMIN role`)
        } else {
          console.log(`Admin ${adminEmail} already exists`)
        }
      } else {
        const passwordHash = await bcrypt.hash(adminPassword, 12)
        const created = await prisma.user.create({
          data: {
            email: adminEmail,
            name: adminName,
            passwordHash,
            role: 'ADMIN',
            emailVerified: new Date(),
          },
        })
        adminId = created.id
        console.log(`Created admin user: ${adminEmail}`)
      }
    }
  } else {
    console.log('ADMIN_EMAIL and ADMIN_PASSWORD not set, skipping admin creation')
    const anyAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    adminId = anyAdmin?.id || null
  }

  if (!adminId) {
    console.log('No admin user available — skipping client/project/leave-type seed')
    return
  }

  // ---------- 2. Internal client + Break project ----------
  let internalClient = await prisma.client.findFirst({
    where: { name: 'Internal', isPersonal: false },
  })
  if (!internalClient) {
    internalClient = await prisma.client.create({
      data: {
        name: 'Internal',
        description: 'Internal company time (breaks, meetings, admin work)',
        managerId: adminId,
        isPersonal: false,
      },
    })
    console.log('Created "Internal" client')
  }

  const breakProject = await prisma.project.findFirst({
    where: { name: 'Break', isPersonal: false },
  })
  if (!breakProject) {
    await prisma.project.create({
      data: {
        name: 'Break',
        description: 'Daily break time',
        clientId: internalClient.id,
        managerId: adminId,
        isPersonal: false,
      },
    })
    console.log('Created "Break" project')
  }

  // ---------- 3. Default leave types ----------
  const defaultLeaveTypes = [
    { name: 'Annual Leave', color: '#0ea5e9', sortOrder: 1, requiresApproval: true, carryoverAllowed: true, maxCarryoverDays: 5 },
    { name: 'Sick Leave', color: '#ef4444', sortOrder: 2, requiresApproval: false },
    { name: 'Personal Leave', color: '#8b5cf6', sortOrder: 3, requiresApproval: true },
    { name: 'Unpaid Leave', color: '#6b7280', sortOrder: 4, requiresApproval: true },
  ]

  for (const lt of defaultLeaveTypes) {
    const existing = await prisma.leaveType.findFirst({ where: { name: lt.name } })
    if (!existing) {
      await prisma.leaveType.create({ data: lt })
      console.log(`Created leave type: ${lt.name}`)
    }
  }

  console.log('Seed complete')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
