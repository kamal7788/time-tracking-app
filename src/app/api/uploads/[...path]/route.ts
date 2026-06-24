import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

const MIME_TYPES: Record<string, string> = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'pdf': 'application/pdf',
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join('/')
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    const fullPath = join(uploadsDir, filePath)

    // Prevent directory traversal
    if (!fullPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const fileBuffer = await readFile(fullPath)
    const ext = filePath.split('.').pop()?.toLowerCase() || 'jpg'
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
