import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path' 

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string[] }> }
) {
  try {
    const { id } = await params
    // Join the array to handle category/uuid format
    const imageId = Array.isArray(id) ? id.join('/') : id
    
    // Decode URL-encoded image ID (handles slashes in category/uuid format)
    const decodedId = decodeURIComponent(imageId)
    
    // New dataset structure: category/uuid.jpg
    // imageId format: "category/uuid" or just "uuid" (we'll search both)
    const possiblePaths: string[] = []
    
    if (decodedId.includes('/')) {
      // Format: category/uuid
      const [category, uuid] = decodedId.split('/')
      possiblePaths.push(
        join(process.cwd(), '..', 'dataset', 'dataset_clothing_images', category, `${uuid}.jpg`),
        join(process.cwd(), 'dataset', 'dataset_clothing_images', category, `${uuid}.jpg`),
      )
    } else {
      // Just UUID - search all categories
      const categories = ['dress', 'hat', 'longsleeve', 'outwear', 'pants', 'shirt', 'shoes', 'shorts', 'skirt', 't-shirt']
      for (const category of categories) {
        possiblePaths.push(
          join(process.cwd(), '..', 'dataset', 'dataset_clothing_images', category, `${decodedId}.jpg`),
          join(process.cwd(), 'dataset', 'dataset_clothing_images', category, `${decodedId}.jpg`),
        )
      }
    }
    
    let imagePath: string | null = null
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        imagePath = path
        break
      }
    }
    
    if (!imagePath) {
      console.error(`Image not found: ${decodedId}. Tried paths:`, possiblePaths.slice(0, 3))
      return new NextResponse('Image not found', { status: 404 })
    }
    
    // Serve the image directly without processing for now
    const imageBuffer = readFileSync(imagePath)
    
    return new NextResponse(imageBuffer, {
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

