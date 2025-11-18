import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import sharp from 'sharp'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: imageId } = await params
    const searchParams = request.nextUrl.searchParams
    // Use 2x resolution for retina/high-DPI displays
    const requestedWidth = parseInt(searchParams.get('w') || '400')
    const width = requestedWidth * 2 // 2x for crisp display on retina screens
    const quality = parseInt(searchParams.get('q') || '95') // 95% quality for high quality
    
    const possiblePaths = [
      join(process.cwd(), '..', 'dataset', 'images', `${imageId}.jpg`),
    ]
    
    let imagePath: string | null = null
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        imagePath = path
        break
      }
    }
    
    if (!imagePath) {
      console.error(`Image not found: ${imageId}.jpg. Tried paths:`, possiblePaths)
      return new NextResponse('Image not found', { status: 404 })
    }
    
    // Resize and optimize image using sharp with high quality settings
    const imageBuffer = await sharp(imagePath)
      .resize(width, null, {
        withoutEnlargement: true,
        fit: 'inside',
        kernel: sharp.kernel.lanczos3, // High-quality resampling
      })
      .jpeg({ 
        quality,
        mozjpeg: true, // Better compression
        progressive: true, // Progressive JPEG for better perceived quality
        optimizeScans: true, // Optimize scans
      })
      .toBuffer()
    
    return new NextResponse(imageBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Accept-Ranges': 'bytes',
      },
    })
  } catch (error) {
    console.error('Error serving image:', error)
    return new NextResponse('Error serving image', { status: 500 })
  }
}

