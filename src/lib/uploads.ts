import { writeFile, mkdir, unlink } from 'fs/promises'
import { join, resolve, sep } from 'path'
import { randomUUID } from 'crypto'

export const MAX_RECEIPT_SIZE = 5 * 1024 * 1024 // 5 MB

const ALLOWED_TYPES: Record<string, { ext: string; mime: string; magic: number[][] }> = {
  jpeg: {
    ext: 'jpg',
    mime: 'image/jpeg',
    magic: [[0xff, 0xd8, 0xff]],
  },
  png: {
    ext: 'png',
    mime: 'image/png',
    magic: [[0x89, 0x50, 0x4e, 0x47]],
  },
  gif: {
    ext: 'gif',
    mime: 'image/gif',
    magic: [[0x47, 0x49, 0x46, 0x38]],
  },
  webp: {
    ext: 'webp',
    mime: 'image/webp',
    magic: [[0x52, 0x49, 0x46, 0x46]], // RIFF....WEBP checked separately
  },
  pdf: {
    ext: 'pdf',
    mime: 'application/pdf',
    magic: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  },
}

function matchesMagic(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false
  return signature.every((byte, i) => buffer[i] === byte)
}

export type DetectedFileType = keyof typeof ALLOWED_TYPES

/**
 * Validates an uploaded receipt file:
 * - size cap
 * - declared MIME type must be allowed
 * - content must match a known magic-byte signature (no extension spoofing)
 *
 * Returns the detected file type, or null when invalid.
 */
export function validateReceiptFile(
  file: File,
  buffer: Buffer
): { type: DetectedFileType; ext: string } | null {
  if (file.size <= 0 || file.size > MAX_RECEIPT_SIZE) return null

  const declaredMime = (file.type || '').toLowerCase()
  const allowedMimes = Object.values(ALLOWED_TYPES).map((t) => t.mime)
  if (!allowedMimes.includes(declaredMime)) return null

  for (const [type, config] of Object.entries(ALLOWED_TYPES)) {
    if (config.mime !== declaredMime) continue
    if (config.magic.some((sig) => matchesMagic(buffer, sig))) {
      if (type === 'webp') {
        // RIFF header must be followed by "WEBP" at offset 8
        if (buffer.length < 12 || buffer.toString('ascii', 8, 12) !== 'WEBP') continue
      }
      return { type: type as DetectedFileType, ext: config.ext }
    }
  }
  return null
}

export function getUploadsDir(): string {
  return join(process.cwd(), 'public', 'uploads')
}

/**
 * Saves a validated receipt buffer. Returns the public API path.
 */
export async function saveReceipt(buffer: Buffer, ext: string): Promise<string> {
  const uploadsDir = join(getUploadsDir(), 'expenses')
  await mkdir(uploadsDir, { recursive: true })
  const filename = `${randomUUID()}.${ext}`
  await writeFile(join(uploadsDir, filename), buffer)
  return `/api/uploads/expenses/${filename}`
}

/** Deletes a receipt file given its public path ("/api/uploads/..."). Silently ignores errors. */
export async function deleteReceipt(publicPath: string | null | undefined): Promise<void> {
  if (!publicPath || !publicPath.startsWith('/api/uploads/')) return
  
  try {
    const uploadsDir = getUploadsDir()
    // Normalize the uploads directory path for comparison
    const normalizedUploadsDir = resolve(process.cwd(), 'public', 'uploads')
    
    const relative = publicPath.replace('/api/uploads/', '')
    // Validate the relative path doesn't contain path traversal components
    if (relative.includes('..') || relative.startsWith('/')) {
      console.error('Path traversal attempt detected in deleteReceipt:', relative)
      return
    }
    
    // Resolve the full path
    const fullPath = resolve(normalizedUploadsDir, relative)
    
    // Security check: ensure the resolved path is within the uploads directory
    if (!fullPath.startsWith(normalizedUploadsDir + sep)) {
      console.error('Security violation in deleteReceipt: path outside uploads directory')
      return
    }
    
    // Additional check: ensure the file exists and is within the expected structure
    const expensesDir = resolve(normalizedUploadsDir, 'expenses')
    if (!fullPath.startsWith(expensesDir + sep)) {
      console.error('Security violation in deleteReceipt: path outside expenses directory')
      return
    }
    
    await unlink(fullPath).catch(() => {})
  } catch (error) {
    console.error('Error in deleteReceipt:', error)
  }
}
