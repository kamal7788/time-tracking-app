import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminName = process.env.ADMIN_NAME || 'Admin'

  if (!adminEmail || !adminPassword) {
    console.log('ADMIN_EMAIL and ADMIN_PASSWORD not set, skipping admin creation')
    return
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (existingAdmin) {
    if (existingAdmin.role !== 'ADMIN') {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: 'ADMIN' },
      })
      console.log(`Updated ${adminEmail} to ADMIN role`)
    } else {
      console.log(`Admin ${adminEmail} already exists`)
    }
    return
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12)

  await prisma.user.create({
    data: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  })

  console.log(`Created admin user: ${adminEmail}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })