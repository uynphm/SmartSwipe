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
  style?: string
  material?: string
  description?: string
}

// Load image features from JSON file
function loadImageFeatures(): Map<string, number[]> {
  const featuresMap = new Map<string, number[]>()
  
  const path = join(process.cwd(), '..', 'dataset', 'image_features.json')
  
  
  if (existsSync(path)) {
    const featuresData = JSON.parse(readFileSync(path, 'utf-8'))
    for (const [imageId, features] of Object.entries(featuresData)) {
      featuresMap.set(imageId, features as number[])
    }
    console.log(`[loadImageFeatures] Loaded ${featuresMap.size} image features from ${path}`)
    // Log sample keys to verify format
    const sampleKeys = Array.from(featuresMap.keys()).slice(0, 3)
    console.log(`[loadImageFeatures] Sample feature keys: ${sampleKeys.join(', ')}`)
    return featuresMap
  }
  
  console.warn('[loadImageFeatures] Image features file not found. Using fallback recommendation method.')
  return featuresMap
}

// Calculate cosine similarity between two feature vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Get feature vectors for wishlist items
function getWishlistFeatures(wishlist: FashionItem[], featuresMap: Map<string, number[]>): Array<{ item: FashionItem, features: number[] }> {
  if (!wishlist || wishlist.length === 0) {
    console.log('[getWishlistFeatures] No wishlist provided')
    return []
  }
  
  const wishlistFeatures: Array<{ item: FashionItem, features: number[] }> = []
  const missingItems: string[] = []
  
  for (const item of wishlist) {
    // Extract image ID from item (format: category/uuid)
    // item.image is like "/api/images/dress/1234" -> "dress/1234"
    const imageId = item.image.replace('/api/images/', '').replace(/\.(jpg|jpeg)$/i, '')
    const features = featuresMap.get(imageId)
    
    if (features) {
      wishlistFeatures.push({ item, features })
      console.log(`[getWishlistFeatures] Found features for wishlist item: ${imageId}`)
    } else {
      missingItems.push(imageId)
      console.log(`[getWishlistFeatures] Missing features for wishlist item: ${imageId}`)
    }
  }
  
  if (wishlistFeatures.length === 0) {
    console.log(`[getWishlistFeatures] No valid features found. Missing: ${missingItems.join(', ')}`)
    console.log(`[getWishlistFeatures] Features map has ${featuresMap.size} entries`)
    // Log first few keys to see format
    const sampleKeys = Array.from(featuresMap.keys()).slice(0, 5)
    console.log(`[getWishlistFeatures] Sample feature keys: ${sampleKeys.join(', ')}`)
  } else {
    console.log(`[getWishlistFeatures] Using ${wishlistFeatures.length} wishlist items for similarity search`)
  }
  
  return wishlistFeatures
}

// Get feature vectors for rejected items
function getRejectedFeatures(rejectedItems: FashionItem[], featuresMap: Map<string, number[]>): Array<{ item: FashionItem, features: number[] }> {
  if (!rejectedItems || rejectedItems.length === 0) {
    return []
  }
  
  const rejectedFeatures: Array<{ item: FashionItem, features: number[] }> = []
  
  for (const item of rejectedItems) {
    const imageId = item.image.replace('/api/images/', '').replace(/\.(jpg|jpeg)$/i, '')
    const features = featuresMap.get(imageId)
    
    if (features) {
      rejectedFeatures.push({ item, features })
    }
  }
  
  return rejectedFeatures
}

// Find similar items based on visual features
// For each liked item, compute similarity to all candidate items, then aggregate scores
// Penalize items similar to rejected items
function findSimilarItems(
  allItems: FashionItem[],
  wishlistFeatures: Array<{ item: FashionItem, features: number[] }>,
  rejectedFeatures: Array<{ item: FashionItem, features: number[] }>,
  featuresMap: Map<string, number[]>,
  excludeIds: Set<string>
): Array<{ id: string, score: number }> {
  // If no wishlist, return items with low scores (will be sorted to end)
  if (wishlistFeatures.length === 0) {
    const items: Array<{ id: string, score: number }> = []
    for (const item of allItems) {
      if (excludeIds.has(item.id)) continue
      const imageId = item.image.replace('/api/images/', '').replace(/\.(jpg|jpeg)$/i, '')
      const itemFeatures = featuresMap.get(imageId)
      // Items with features get score -1, without features get -2
      items.push({ id: item.id, score: itemFeatures ? -1 : -2 })
    }
    return items
  }
  
  // Map to store aggregated similarity scores for each candidate item
  // Key: item ID, Value: object with similarities array and penalty
  const itemScores = new Map<string, { similarities: number[], penalty: number }>()
  
  let itemsWithFeatures = 0
  let itemsWithoutFeatures = 0
  
  // For each candidate item, compute similarity to each liked item
  for (const candidateItem of allItems) {
    if (excludeIds.has(candidateItem.id)) continue
    
    // Extract image ID (remove /api/images/ prefix and any file extension)
    const candidateImageId = candidateItem.image.replace('/api/images/', '').replace(/\.(jpg|jpeg)$/i, '')
    const candidateFeatures = featuresMap.get(candidateImageId)
    
    if (!candidateFeatures) {
      // Item has no features - assign very low score
      itemScores.set(candidateItem.id, { similarities: [-2], penalty: 0 })
      itemsWithoutFeatures++
      continue
    }
    
    itemsWithFeatures++
    
    // ============================================
    // CALCULATE SIMILARITY BASED ON WISHLIST ITEMS
    // ============================================
    // For this candidate item, compute cosine similarity to EACH liked item in wishlist
    // This is where the wishlist-based recommendation happens
    const similarities: number[] = []
    for (const { item: likedItem, features: likedFeatures } of wishlistFeatures) {
      // Skip if comparing to itself
      if (candidateItem.id === likedItem.id) {
        similarities.push(1.0) // Perfect match
        continue
      }
      
      // Calculate cosine similarity between liked item's features and candidate item's features
      // Higher similarity = more visually similar to what user likes
      const similarity = cosineSimilarity(likedFeatures, candidateFeatures)
      similarities.push(similarity)
    }
    
    // Calculate penalty for similarity to rejected items
    let penalty = 0
    if (rejectedFeatures.length > 0) {
      const rejectSimilarities: number[] = []
      for (const { item: rejectedItem, features: rejectedItemFeatures } of rejectedFeatures) {
        // Skip if comparing to itself
        if (candidateItem.id === rejectedItem.id) {
          rejectSimilarities.push(1.0) // Perfect match = full penalty
          continue
        }
        
        const rejectSimilarity = cosineSimilarity(rejectedItemFeatures, candidateFeatures)
        rejectSimilarities.push(rejectSimilarity)
      }
      
      // Average similarity to rejected items = penalty
      // Higher similarity to rejected items = higher penalty
      penalty = rejectSimilarities.reduce((sum, score) => sum + score, 0) / rejectSimilarities.length
    }
    
    // Store all similarity scores for this candidate item
    // Each candidate will have an array of scores, one for each liked item
    // Also store penalty for rejected items
    itemScores.set(candidateItem.id, { similarities, penalty })
  }
  
  // ============================================
  // AGGREGATE SCORES FROM ALL WISHLIST ITEMS
  // ============================================
  // For each candidate item, we have multiple similarity scores (one per liked item)
  // Average them to get a single score representing overall similarity to user's preferences
  // Then subtract penalty for similarity to rejected items
  const aggregatedScores: Array<{ id: string, score: number }> = []
  for (const [itemId, scoreData] of itemScores.entries()) {
    const { similarities, penalty } = scoreData
    
    // Average similarity across all liked items
    // Example: If user liked 3 items, and candidate has similarities [0.85, 0.72, 0.91]
    // Then base score = (0.85 + 0.72 + 0.91) / 3 = 0.827
    const avgSimilarity = similarities.reduce((sum, score) => sum + score, 0) / similarities.length
    
    // Apply penalty: subtract similarity to rejected items
    // Items similar to rejected items get lower scores
    // Penalty weight: 0.5 means if item is 80% similar to rejected item, score is reduced by 0.4
    const penaltyWeight = 0.5
    const finalScore = avgSimilarity - (penalty * penaltyWeight)
    
    aggregatedScores.push({ id: itemId, score: finalScore })
  }
  
  console.log(`[findSimilarItems] Scored ${itemsWithFeatures} items with features, ${itemsWithoutFeatures} without`)
  if (aggregatedScores.length > 0) {
    const validScores = aggregatedScores.map(s => s.score).filter(s => s > -1)
    if (validScores.length > 0) {
      const minScore = Math.min(...validScores)
      const maxScore = Math.max(...validScores)
      const avgScore = validScores.reduce((a, b) => a + b, 0) / validScores.length
      console.log(`[findSimilarItems] Score range: ${minScore.toFixed(4)} to ${maxScore.toFixed(4)}, avg: ${avgScore.toFixed(4)}`)
      console.log(`[findSimilarItems] Liked items: ${wishlistFeatures.length}, Computing similarity to each candidate`)
    }
  }
  
  // Sort by similarity (highest first)
  aggregatedScores.sort((a, b) => b.score - a.score)
  
  // Filter: Only return items with meaningful similarity scores
  // Items with negative scores (no wishlist or no features) are filtered out
  // Only show items that are actually similar to user's preferences
  const filteredScores = aggregatedScores.filter(item => item.score > 0)
  
  // If we have wishlist but no good matches, return top items anyway (they're still sorted)
  // This handles edge cases where similarity scores are low but still meaningful
  return filteredScores.length > 0 ? filteredScores : aggregatedScores.filter(item => item.score > -1)
}

// Load features once when module loads
let imageFeatures: Map<string, number[]> | null = null

function getImageFeatures(): Map<string, number[]> {
  if (!imageFeatures) {
    imageFeatures = loadImageFeatures()
  }
  return imageFeatures
}

export async function POST(request: Request) {
  let allItemsInCategory: FashionItem[] = []
  
  try {
    const body = await request.json()
    allItemsInCategory = body.allItemsInCategory
    const { wishlist, rejectedItems, category } = body

    if (!allItemsInCategory || !Array.isArray(allItemsInCategory)) {
      return NextResponse.json(
        { error: 'All items in category are required' },
        { status: 400 }
      )
    }

    // Get image features
    const featuresMap = getImageFeatures()
    
    // If no features available, fallback to random (but still return all items)
    if (featuresMap.size === 0) {
      const shuffled = [...allItemsInCategory].sort(() => Math.random() - 0.5)
      const randomItems = shuffled.map((item: FashionItem, index) => ({
        id: item.id,
        score: 1 - (index / shuffled.length) // Decreasing scores for random order
      }))
      return NextResponse.json({ 
        items: randomItems,
        method: 'random'
      })
    }

    // Get wishlist feature vectors (recalculate for each category)
    const wishlistFeatures = getWishlistFeatures(wishlist || [], featuresMap)
    
    // Get rejected items feature vectors
    const rejectedFeatures = getRejectedFeatures(rejectedItems || [], featuresMap)
    
    console.log(`[POST /api/recommend] Category: ${category}, Items: ${allItemsInCategory.length}, Wishlist: ${wishlist?.length || 0}, Rejected: ${rejectedItems?.length || 0}, Valid wishlist features: ${wishlistFeatures.length}, Valid rejected features: ${rejectedFeatures.length}`)
    
    // Find similar items - returns ALL items sorted by score
    // For each liked item, compute similarity to all candidates, then aggregate
    // Penalize items similar to rejected items
    const scoredItems = findSimilarItems(
      allItemsInCategory,
      wishlistFeatures,
      rejectedFeatures,
      featuresMap,
      new Set() // No exclusions at this level (handled in frontend)
    )

    // Log top 5 items with their scores for debugging
    if (scoredItems.length > 0) {
      const top5 = scoredItems.slice(0, 5)
      console.log(`[POST /api/recommend] Top 5 items by score:`)
      top5.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.id}: ${item.score.toFixed(4)}`)
      })
    }

    // Return ALL items with their scores, sorted by similarity
    return NextResponse.json({ 
      items: scoredItems, // Array of { id, score }
      method: wishlistFeatures.length > 0 ? 'visual-similarity' : 'random'
    })
  } catch (error) {
    console.error('Error in recommendation API:', error)
    // Fallback to random selection (but still return all items)
    if (allItemsInCategory && Array.isArray(allItemsInCategory)) {
      const shuffled = [...allItemsInCategory].sort(() => Math.random() - 0.5)
      const randomItems = shuffled.map((item: FashionItem, index) => ({
        id: item.id,
        score: 1 - (index / shuffled.length) // Decreasing scores for random order
      }))
      return NextResponse.json({ 
        items: randomItems,
        method: 'random'
      })
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


