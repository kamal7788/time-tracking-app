import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireAuth } from '@/lib/auth'
import { commonWorkSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/api'

export async function GET() {
  try {
    const session = await requireAuth()

    const commonWorks = await prisma.commonWork.findMany({
      where: { userId: session.userId },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ commonWorks })
  } catch (error) {
    return handleApiError(error, 'Get common works error:')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const validated = commonWorkSchema.parse(body)

    const commonWork = await prisma.commonWork.create({
      data: {
        userId: session.userId,
        name: validated.name,
        description: validated.description,
        projectId: validated.projectId,
        defaultDuration: validated.defaultDuration,
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
    })

    return NextResponse.json({ commonWork }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Create common work error:')
  }
}