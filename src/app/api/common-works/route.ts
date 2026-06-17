import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireAuth } from '@/lib/auth'
import { commonWorkSchema } from '@/lib/validations'

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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get common works error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }
    console.error('Create common work error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}