import { NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

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
  try {
    // Require authentication
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { likedItems } = body

    if (!likedItems || !Array.isArray(likedItems) || likedItems.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 liked items are required' },
        { status: 400 }
      )
    }

    // Get Groq API key from environment
    const groqApiKey = process.env.GROQ_API_KEY
    if (!groqApiKey) {
      console.error('GROQ_API_KEY not found in environment variables')
      return NextResponse.json(
        { error: 'Groq API key not configured' },
        { status: 500 }
      )
    }

    // Prepare minimal items summary (only essential fields)
    const itemsSummary = likedItems.map((item: FashionItem) => ({
      id: item.id,
      name: item.name,
      category: item.category
    }))

    // Create concise prompt with variation instruction
    const prompt = `You are a fashion stylist. Create a coordinated outfit by selecting 2-5 items from the user's liked items list below. 

CRITICAL RULES:
1. You can ONLY select items from this list. Use the exact IDs provided.
2. Return ONLY valid JSON. Do NOT add any explanations, comments, or text inside the JSON structure.
3. The JSON must be parseable. No text between array elements.

Available items (user's liked items):
${itemsSummary.map((item: any, idx: number) => `${idx + 1}. ID: ${item.id}, Name: ${item.name}, Category: ${item.category}`).join('\n')}

Selection rules:
- Select only ONE item per category (e.g., only one shirt, only one pants, etc.)
- Mix and match different categories to create a complete outfit
- Select 2-5 items total that complement each other

Return ONLY this JSON format (no other text):
{"outfit": ["id1", "id2", "id3"], "reasoning": "Detailed explanation (at least 100 words) of why these items work together"}`

    // Call Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a fashion stylist. Return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9,
        max_tokens: 500
      }),
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error('Groq API error:', {
        status: groqResponse.status,
        statusText: groqResponse.statusText,
        error: errorText
      })
      return NextResponse.json(
        { error: 'Failed to generate outfit with Groq', details: errorText },
        { status: 500 }
      )
    }

    const groqData = await groqResponse.json()
    const content = groqData.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: 'No response from Groq' },
        { status: 500 }
      )
    }

    // Parse Groq response
    let outfitData
    try {
      // Try to extract JSON from response (might be wrapped in markdown or code blocks)
      let jsonString = content.trim()
      
      // Remove markdown code blocks if present
      jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      
      // Try to extract valid JSON - handle cases where AI adds text inside JSON
      // First, try to find the JSON object
      let jsonMatch = jsonString.match(/\{[\s\S]*\}/)
      
      if (jsonMatch) {
        let jsonCandidate = jsonMatch[0]
        
        // If JSON parsing fails, try to clean it up
        try {
          outfitData = JSON.parse(jsonCandidate)
        } catch (e) {
          // JSON might have text inside the array - try to extract just the IDs
          // Look for the outfit array pattern: ["id1", "id2", ...]
          const outfitArrayMatch = jsonCandidate.match(/"outfit"\s*:\s*\[([^\]]*)\]/)
          const reasoningMatch = jsonCandidate.match(/"reasoning"\s*:\s*"([^"]*)"/)
          
          if (outfitArrayMatch) {
            // Extract valid quoted strings (item IDs) from the array
            const idMatches = outfitArrayMatch[1].match(/"([^"]+)"/g)
            const outfitIds = idMatches ? idMatches.map((m: string) => m.replace(/"/g, '')) : []
            
            outfitData = {
              outfit: outfitIds,
              reasoning: reasoningMatch ? reasoningMatch[1] : 'AI-generated outfit combination'
            }
          } else {
            throw new Error('Could not extract outfit array')
          }
        }
      } else {
        outfitData = JSON.parse(jsonString)
      }
    } catch (parseError) {
      console.error('Failed to parse Groq response:', {
        error: parseError,
        content: content.substring(0, 1000)
      })
      // Fallback: create a simple outfit from available items (one per category)
      const categoryMap = new Map<string, FashionItem>()
      for (const item of likedItems) {
        const category = item.category.toLowerCase()
        if (!categoryMap.has(category)) {
          categoryMap.set(category, item)
        }
      }
      const fallbackItems = Array.from(categoryMap.values()).slice(0, Math.min(5, categoryMap.size))
      return NextResponse.json({
        outfit: fallbackItems,
        reasoning: 'Fallback outfit - selected one item per category',
        method: 'fallback'
      })
    }

    // Validate outfit IDs exist in liked items (CRITICAL: only select from user's liked items)
    const validItemIds = new Set(likedItems.map((item: FashionItem) => item.id))
    const requestedIds = Array.isArray(outfitData.outfit) ? outfitData.outfit : []
    const outfitIds = requestedIds.filter((id: string) => validItemIds.has(id))
    
    // Filter out invalid item IDs (not in liked items)

    // If no valid outfit IDs, create fallback (one per category)
    if (outfitIds.length === 0) {
      const categoryMap = new Map<string, FashionItem>()
      for (const item of likedItems) {
        const category = item.category.toLowerCase()
        if (!categoryMap.has(category)) {
          categoryMap.set(category, item)
        }
      }
      const fallbackItems = Array.from(categoryMap.values()).slice(0, Math.min(5, categoryMap.size))
      return NextResponse.json({
        outfit: fallbackItems,
        reasoning: 'Fallback outfit - selected one item per category',
        method: 'fallback'
      })
    }

    // Map outfit IDs back to full item objects
    const itemMap = new Map(likedItems.map((item: FashionItem) => [item.id, item]))
    let outfitItems: FashionItem[] = outfitIds
      .map((id: string) => itemMap.get(id))
      .filter((item: FashionItem | undefined): item is FashionItem => item !== undefined)

    // Ensure only one item per category
    const categoryMap = new Map<string, FashionItem>()
    for (const item of outfitItems) {
      const category = item.category.toLowerCase()
      // Keep the first item of each category
      if (!categoryMap.has(category)) {
        categoryMap.set(category, item)
      }
    }
    outfitItems = Array.from(categoryMap.values())

    return NextResponse.json({
      outfit: outfitItems,
      reasoning: outfitData.reasoning || 'AI-generated coordinated outfit combination',
      method: 'groq'
    })

  } catch (error) {
    console.error('Error generating outfit:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

