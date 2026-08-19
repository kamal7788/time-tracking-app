import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { resolve, sep } from 'path'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUploadsDir } from '@/lib/uploads'

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Receipts are sensitive — require authentication and ownership (or admin)
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { path } = await params
    const filePath = path.join('/')

    const uploadsDir = resolve(getUploadsDir())
    const fullPath = resolve(uploadsDir, filePath)

    // Prevent directory traversal (resolve() normalizes ".." segments)
    if (fullPath !== uploadsDir && !fullPath.startsWith(uploadsDir + sep)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only known-safe extensions are served
    const ext = filePath.split('.').pop()?.toLowerCase() || ''
    const contentType = MIME_TYPES[ext]
    if (!contentType) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Ownership check: expense receipts may only be viewed by their owner or an admin
    if (filePath.startsWith('expenses/')) {
      const publicPath = `/api/uploads/${filePath}`
      const expense = await prisma.expense.findFirst({
        where: { receiptPath: publicPath },
        select: { userId: true },
      })
      if (!expense) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      if (expense.userId !== session.userId && session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const fileBuffer = await readFile(fullPath)

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
