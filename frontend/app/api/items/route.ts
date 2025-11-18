import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
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

function parseCSV(csvContent: string): FashionItem[] {
  const lines = csvContent.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  
  const items: FashionItem[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    
    // Split by comma, but handle the last field (productDisplayName) which might contain commas
    const parts = line.split(',')
    
    // We expect 10 columns, so if we have more, the last field contains commas
    // Take first 9 fields as-is, and join the rest as the productDisplayName
    if (parts.length < headers.length) continue
    
    const values: string[] = []
    for (let j = 0; j < headers.length - 1; j++) {
      values.push(parts[j]?.trim() || '')
    }
    // Last field is productDisplayName - join all remaining parts
    values.push(parts.slice(headers.length - 1).join(',').trim())
    
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    // Create tags from available data
    const tags: string[] = []
    if (row.baseColour) tags.push(row.baseColour.toLowerCase())
    if (row.season) tags.push(row.season.toLowerCase())
    if (row.usage) tags.push(row.usage.toLowerCase())
    if (row.articleType) tags.push(row.articleType.toLowerCase())
    
    // Generate a price based on category (since CSV doesn't have prices)
    const priceMap: Record<string, string> = {
      'Shirts': '$49',
      'Tshirts': '$29',
      'Jeans': '$79',
      'Track Pants': '$39',
      'Watches': '$129',
      'Socks': '$12',
      'Casual Shoes': '$89',
      'Flip Flops': '$19',
      'Belts': '$35',
      'Handbags': '$59',
      'Tops': '$35',
      'Bra': '$25',
    }
    
    const price = priceMap[row.articleType] || '$49'
    
    // Extract brand from productDisplayName if possible
    const productName = row.productDisplayName || ''
    const brandMatch = productName.match(/^([A-Za-z\s&]+)/)
    const brand = brandMatch ? brandMatch[1].trim() : 'Fashion Brand'
    
    const item: FashionItem = {
      id: row.id,
      name: row.productDisplayName || 'Fashion Item',
      category: row.subCategory || row.articleType || row.masterCategory || 'Apparel',
      price,
      image: `/api/images/${row.id}`,
      brand,
      tags: tags.slice(0, 5), // Limit to 5 tags
      gender: row.gender,
      masterCategory: row.masterCategory,
      subCategory: row.subCategory,
      articleType: row.articleType,
      baseColour: row.baseColour,
      season: row.season,
      year: row.year,
      usage: row.usage,
    }
    
    items.push(item)
  }
  
  return items
}

function imageExists(imageId: string): boolean {
  const possiblePaths = [
    join(process.cwd(), 'dataset', 'images', `${imageId}.jpg`),
    join(process.cwd(), '..', 'dataset', 'images', `${imageId}.jpg`),
    join(process.cwd(), '..', '..', 'dataset', 'images', `${imageId}.jpg`),
  ]
  
  return possiblePaths.some(path => existsSync(path))
}

export async function GET() {
  try {
    const csvPath = join(process.cwd(), '..', 'dataset', 'styles.csv')
    const csvContent = readFileSync(csvPath, 'utf-8')
    const items = parseCSV(csvContent)
    
    // Filter out items that don't have corresponding images
    const itemsWithImages = items.filter(item => imageExists(item.id))
    
    console.log(`Loaded ${itemsWithImages.length} items with images (filtered from ${items.length} total)`)
    
    return NextResponse.json({ items: itemsWithImages })
  } catch (error) {
    console.error('Error reading CSV:', error)
    return NextResponse.json(
      { error: 'Failed to load items' },
      { status: 500 }
    )
  }
}

