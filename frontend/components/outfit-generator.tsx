'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/auth-context'
import { authenticatedFetch } from '@/lib/api-client'

interface OutfitGeneratorProps {
  likedItems: any[]
}

export function OutfitGenerator({ likedItems }: OutfitGeneratorProps) {
  const { token, isAuthenticated } = useAuth()
  const [currentOutfit, setCurrentOutfit] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [outfitReasoning, setOutfitReasoning] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [generationKey, setGenerationKey] = useState(0)
  const prevLikedItemsLengthRef = useRef(likedItems.length)

  const generateOutfit = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setError('Please login to generate outfits')
      return
    }

    if (likedItems.length < 2) {
      setError('At least 2 items are required')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await authenticatedFetch(
        '/api/generate-outfit',
        {
          method: 'POST',
          body: JSON.stringify({
            likedItems: likedItems,
          }),
        },
        token
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: ${response.statusText}`
        console.error('Outfit generation error:', errorMessage, errorData)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (data.outfit && Array.isArray(data.outfit) && data.outfit.length > 0) {
        setCurrentOutfit(data.outfit)
        setOutfitReasoning(data.reasoning || 'AI-generated coordinated outfit combination')
        setGenerationKey(prev => prev + 1) // Force re-render with new key
      } else {
        throw new Error('Invalid outfit response')
      }
    } catch (err) {
      console.error('Error generating outfit:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate outfit')
      // Fallback to simple random selection
      const shuffled = [...likedItems].sort(() => Math.random() - 0.5)
      setCurrentOutfit(shuffled.slice(0, Math.min(3, shuffled.length)))
      setGenerationKey(prev => prev + 1) // Force re-render with new key
    } finally {
      setIsGenerating(false)
    }
  }, [likedItems, isAuthenticated, token])

  useEffect(() => {
    // Only regenerate when the number of liked items changes
    if (prevLikedItemsLengthRef.current !== likedItems.length) {
      prevLikedItemsLengthRef.current = likedItems.length
      if (likedItems.length >= 2) {
        generateOutfit()
      } else {
        setCurrentOutfit([])
        setOutfitReasoning('')
      }
    }
  }, [likedItems.length, generateOutfit])

  if (likedItems.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Sparkles className="w-20 h-20 text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Not Enough Items</h2>
        <p className="text-muted-foreground max-w-md">
          Like at least 2 items to start generating personalized outfit combinations!
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">AI Outfit Generator</h2>
          <p className="text-muted-foreground">AI-powered outfit combinations from your liked items</p>
        </div>
        <Button
          onClick={generateOutfit}
          disabled={isGenerating || likedItems.length < 2}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate New
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {currentOutfit.length > 0 && (
        <motion.div
          key={`${currentOutfit.map(i => i.id).join('-')}-${generationKey}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold text-foreground">Today's Outfit</h3>
          </div>

          {outfitReasoning && (
            <div className="mb-6 p-4 bg-secondary/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground italic">{outfitReasoning}</p>
          </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {currentOutfit.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-secondary rounded-2xl overflow-hidden shadow-md"
              >
                <div className="relative aspect-[3/4]">
                  <img
                    src={item.image || "/placeholder.svg"}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-foreground/90 backdrop-blur-sm px-3 py-1 rounded-full">
                    <p className="text-xs text-background font-medium">{item.category.toUpperCase()}</p>
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-foreground mb-1">{item.category.toUpperCase()}</h4>
                  <p className="text-sm text-muted-foreground">{item.brand}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
