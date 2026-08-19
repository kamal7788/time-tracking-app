import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireAuth } from '@/lib/auth'
import { commonWorkSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const commonWork = await prisma.commonWork.findFirst({
      where: { id, userId: session.userId },
      include: {
        project: {
          include: { client: true },
        },
      },
    })

    if (!commonWork) {
      return NextResponse.json(
        { error: 'Common work not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ commonWork })
  } catch (error) {
    return handleApiError(error, 'Get common work error:')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const validated = commonWorkSchema.parse(body)

    const existingWork = await prisma.commonWork.findFirst({
      where: { id, userId: session.userId },
    })

    if (!existingWork) {
      return NextResponse.json(
        { error: 'Common work not found' },
        { status: 404 }
      )
    }

    const commonWork = await prisma.commonWork.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description,
        projectId: validated.projectId,
        defaultDuration: validated.defaultDuration,
      },
      include: {
        project: {
          include: { client: true },
        },
      },
    })

    return NextResponse.json({ commonWork })
  } catch (error) {
    return handleApiError(error, 'Update common work error:')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const existingWork = await prisma.commonWork.findFirst({
      where: { id, userId: session.userId },
    })

    if (!existingWork) {
      return NextResponse.json(
        { error: 'Common work not found' },
        { status: 404 }
      )
    }

    await prisma.commonWork.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'Delete common work error:')
  }
}