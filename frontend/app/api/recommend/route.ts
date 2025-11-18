import { NextResponse } from 'next/server'

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

export async function POST(request: Request) {
  let allItemsInCategory: FashionItem[] = []
  
  try {
    const body = await request.json()
    allItemsInCategory = body.allItemsInCategory
    const { wishlist, category } = body

    if (!allItemsInCategory || !Array.isArray(allItemsInCategory)) {
      return NextResponse.json(
        { error: 'All items in category are required' },
        { status: 400 }
      )
    }

    // If no wishlist or empty wishlist, return 3 random items
    if (!wishlist || wishlist.length === 0) {
      const shuffled = [...allItemsInCategory].sort(() => Math.random() - 0.5)
      const randomThree = shuffled.slice(0, 3).map((item: FashionItem) => item.id)
      return NextResponse.json({ 
        recommendedIds: randomThree,
        method: 'random'
      })
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY
    if (!GROQ_API_KEY) {
      // Fallback to random if no API key
      const shuffled = [...allItemsInCategory].sort(() => Math.random() - 0.5)
      const randomThree = shuffled.slice(0, 3).map((item: FashionItem) => item.id)
      return NextResponse.json({ 
        recommendedIds: randomThree,
        method: 'random'
      })
    }

    // Build prompt for Groq
    const wishlistSummary = wishlist.map((item: FashionItem) => ({
      category: item.category,
      brand: item.brand,
      style: item.style,
      material: item.material,
      tags: item.tags,
      description: item.description,
      price: item.price
    }))

    const categoryItemsSummary = allItemsInCategory.map((item: FashionItem) => ({
      id: item.id,
      category: item.category,
      brand: item.brand,
      style: item.style,
      material: item.material,
      tags: item.tags,
      description: item.description,
      price: item.price
    }))

    const prompt = `You are a fashion recommendation AI. Based on the user's wishlist preferences, select exactly 3 items from the ${category || 'current'} category that best match their style preferences.

User's wishlist (showing their preferences):
${JSON.stringify(wishlistSummary, null, 2)}

All available items in ${category || 'current'} category:
${JSON.stringify(categoryItemsSummary, null, 2)}

Analyze the user's wishlist to understand their preferences (style, material, brand, tags, price range, etc.) and select exactly 3 items from the category that best match those preferences.

Return ONLY a JSON array of exactly 3 item IDs in order of recommendation priority (most recommended first). Format: ["id1", "id2", "id3"]

Do not include any explanation, just the JSON array with exactly 3 IDs.`

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a fashion recommendation AI. Always respond with valid JSON only, no explanations. Return exactly 3 item IDs.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Groq API error:', errorText)
      // Fallback to random selection
      const shuffled = [...allItemsInCategory].sort(() => Math.random() - 0.5)
      const randomThree = shuffled.slice(0, 3).map((item: FashionItem) => item.id)
      return NextResponse.json({ 
        recommendedIds: randomThree,
        method: 'random'
      })
    }

    const data = await response.json()
    const recommendationText = data.choices[0]?.message?.content?.trim() || '[]'

    // Parse the JSON response
    let recommendedIds: string[] = []
    try {
      // Try to extract JSON array from response (handle markdown code blocks)
      const jsonMatch = recommendationText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        recommendedIds = JSON.parse(jsonMatch[0])
      } else {
        recommendedIds = JSON.parse(recommendationText)
      }
    } catch (parseError) {
      console.error('Failed to parse Groq response:', recommendationText)
      // Fallback: return 3 random items
      const shuffled = [...allItemsInCategory].sort(() => Math.random() - 0.5)
      recommendedIds = shuffled.slice(0, 3).map((item: FashionItem) => item.id)
    }

    // Validate that all recommended IDs exist in allItemsInCategory
    const validIds = allItemsInCategory.map((item: FashionItem) => item.id)
    recommendedIds = recommendedIds.filter((id: string) => validIds.includes(id))

    // Ensure we have exactly 3 items
    if (recommendedIds.length < 3) {
      // Fill with random items if needed
      const remainingIds = validIds.filter((id: string) => !recommendedIds.includes(id))
      const shuffled = remainingIds.sort(() => Math.random() - 0.5)
      recommendedIds = [...recommendedIds, ...shuffled.slice(0, 3 - recommendedIds.length)]
    } else if (recommendedIds.length > 3) {
      // Take only first 3
      recommendedIds = recommendedIds.slice(0, 3)
    }

    return NextResponse.json({ 
      recommendedIds,
      method: 'groq'
    })
  } catch (error) {
    console.error('Error in recommendation API:', error)
    // Fallback to random selection - use allItemsInCategory from outer scope
    if (allItemsInCategory && Array.isArray(allItemsInCategory)) {
      const shuffled = [...allItemsInCategory].sort(() => Math.random() - 0.5)
      const randomThree = shuffled.slice(0, 3).map((item: FashionItem) => item.id)
      return NextResponse.json({ 
        recommendedIds: randomThree,
        method: 'random'
      })
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

