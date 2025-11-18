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
  style?: string
  material?: string
  description?: string
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

// Parse CSV content
function parseCSV(csvContent: string): Map<string, any> {
  const csvMap = new Map()
  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) return csvMap
  
  const headers = lines[0].split(',').map(h => h.trim())
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // Parse CSV line (handle quoted fields with commas)
    const values: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim()) // Add last value
    
    if (values.length < headers.length) continue
    
    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    // Use image_id as key (format: uuid)
    const imageId = row.image_id
    if (imageId) {
      csvMap.set(imageId, row)
    }
  }
  
  return csvMap
}

// Load CSV data for a category
function loadCSVData(category: string, datasetPath: string): Map<string, any> {
  const csvPath = join(datasetPath, `${category}_analysis.csv`)
  
  if (!existsSync(csvPath)) {
    return new Map()
  }
  
  try {
    const csvContent = readFileSync(csvPath, 'utf-8')
    return parseCSV(csvContent)
  } catch (error) {
    console.error(`Error reading CSV for ${category}:`, error)
    return new Map()
  }
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
    // Load CSV data for this category - CSV is the source of truth
    const csvData = loadCSVData(category, datasetPath)
    
    if (csvData.size === 0) continue
    
    // Iterate through CSV entries (not image files)
    for (const [uuid, csvRow] of csvData.entries()) {
      // Verify image exists
      const categoryPath = join(datasetPath, category)
      const imageFile = `${uuid}.jpg`
      const imagePath = join(categoryPath, imageFile)
      
      if (!existsSync(imagePath)) {
        // Try .jpeg extension
        const imagePathJpeg = join(categoryPath, `${uuid}.jpeg`)
        if (!existsSync(imagePathJpeg)) {
          continue // Skip if image doesn't exist
        }
      }
      
      const imageId = `${category}/${uuid}`
      
      // Parse tags from CSV (comma-separated string)
      const tagsString = csvRow.tags || ''
      const tags = tagsString ? tagsString.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [category, 'fashion']
      
      // Use description from CSV for name, or generate from category
      const description = csvRow.description || ''
      const name = description 
        ? `${categoryNames[category] || category} - ${description.substring(0, 60)}`
        : `${categoryNames[category] || category} - ${uuid.substring(0, 8)}`
      
      // Use exact CSV values
      const item: FashionItem = {
        id: imageId,
        name: name.length > 80 ? name.substring(0, 77) + '...' : name,
        category: csvRow.category || categoryNames[category] || category,
        price: generatePrice(category, uuid),
        image: `/api/images/${imageId}`,
        brand: csvRow.brand || 'Fashion Brand',
        tags: tags,
        style: csvRow.style || '',
        material: csvRow.material || '',
        description: description,
      }
      
      items.push(item)
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

