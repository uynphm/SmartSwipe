import { NextResponse } from 'next/server'
import { readdirSync, readFileSync, existsSync, statSync } from 'fs'
import { join } from 'path'

interface FashionItem {
  id: string
  name: string
  category: string
  price: string
  image: string
  brand: string
  tags: string[]
  gender?: string
  masterCategory?: string
  subCategory?: string
  articleType?: string
  baseColour?: string
  season?: string
  year?: string
  usage?: string
}

// Base price ranges for each category (min, max)
const priceRanges: Record<string, [number, number]> = {
  'dress': [45, 149],
  'hat': [15, 59],
  'longsleeve': [29, 89],
  'outwear': [59, 199],
  'pants': [39, 129],
  'shirt': [25, 89],
  'shoes': [49, 199],
  'shorts': [19, 79],
  'skirt': [29, 99],
  't-shirt': [15, 59],
}

// Generate a deterministic but randomized price based on UUID
function generatePrice(category: string, uuid: string): string {
  const range = priceRanges[category] || [25, 99]
  const [min, max] = range
  
  // Use UUID to create a deterministic "random" value
  // Sum up character codes from UUID for pseudo-randomness
  let hash = 0
  for (let i = 0; i < uuid.length; i++) {
    hash = ((hash << 5) - hash) + uuid.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  
  // Generate price between min and max
  const price = min + (Math.abs(hash) % (max - min + 1))
  
  // Round to nearest 5 or 9 for realistic pricing
  const rounded = Math.round(price / 5) * 5
  const finalPrice = rounded % 10 === 0 ? rounded - 1 : rounded // Prefer prices ending in 9
  
  return `$${finalPrice}`
}

// Category display names
const categoryNames: Record<string, string> = {
  'dress': 'Dress',
  'hat': 'Hat',
  'longsleeve': 'Long Sleeve',
  'outwear': 'Outerwear',
  'pants': 'Pants',
  'shirt': 'Shirt',
  'shoes': 'Shoes',
  'shorts': 'Shorts',
  'skirt': 'Skirt',
  't-shirt': 'T-Shirt',
}

function scanImagesDirectory(): FashionItem[] {
  const items: FashionItem[] = []
  
  // Base path for dataset
  const basePaths = [
    join(process.cwd(), '..', 'dataset', 'dataset_clothing_images'),
    join(process.cwd(), 'dataset', 'dataset_clothing_images'),
  ]
  
  let datasetPath: string | null = null
  for (const path of basePaths) {
    if (existsSync(path)) {
      datasetPath = path
      break
    }
  }
  
  if (!datasetPath) {
    console.error('Dataset directory not found')
    return []
  }
  
  // Categories in the dataset
  const categories = ['dress', 'hat', 'longsleeve', 'outwear', 'pants', 'shirt', 'shoes', 'shorts', 'skirt', 't-shirt']
  
  for (const category of categories) {
    const categoryPath = join(datasetPath, category)
    
    if (!existsSync(categoryPath)) continue
    
    try {
      const files = readdirSync(categoryPath)
      const imageFiles = files.filter(file => file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg'))
      
      for (const imageFile of imageFiles) {
        const imagePath = join(categoryPath, imageFile)
        const stats = statSync(imagePath)
        
        // Skip if not a file or too small
        if (!stats.isFile() || stats.size < 1000) continue
        
        const uuid = imageFile.replace(/\.(jpg|jpeg)$/i, '')
        const imageId = `${category}/${uuid}`
        
        const item: FashionItem = {
          id: imageId,
          name: `${categoryNames[category] || category} - ${uuid.substring(0, 8)}`,
          category: categoryNames[category] || category,
          price: generatePrice(category, uuid),
          image: `/api/images/${imageId}`,
          brand: 'Fashion Brand',
          tags: [category, 'fashion'],
          articleType: category,
          masterCategory: 'Apparel',
          subCategory: category,
        }
        
        items.push(item)
      }
    } catch (error) {
      console.error(`Error reading category ${category}:`, error)
    }
  }
  
  return items
}

export async function GET() {
  try {
    const items = scanImagesDirectory()
    
    console.log(`Loaded ${items.length} items from dataset`)
    
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error scanning images:', error)
    return NextResponse.json(
      { error: 'Failed to load items' },
      { status: 500 }
    )
  }
}

