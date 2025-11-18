'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { X, Heart, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface SwipeInterfaceProps {
  onLike: (item: any) => void
}

export function SwipeInterface({ onLike }: SwipeInterfaceProps) {
  const [fashionItems, setFashionItems] = useState<FashionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [swipedItemIds, setSwipedItemIds] = useState<Set<string>>(new Set())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right' | null>(null)
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)

  // Fetch items from API
  useEffect(() => {
    async function fetchItems() {
      try {
        const response = await fetch('/api/items')
        const data = await response.json()
        if (data.items) {
          setFashionItems(data.items)
        }
      } catch (error) {
        console.error('Error fetching items:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchItems()
  }, [])

  // Filter out swiped items
  const availableItems = fashionItems.filter(item => !swipedItemIds.has(item.id))
  // Reset index if current index is out of bounds
  const safeIndex = currentIndex >= availableItems.length ? 0 : currentIndex
  const currentItem = availableItems[safeIndex]

  // Reset index when available items change
  useEffect(() => {
    if (currentIndex >= availableItems.length && availableItems.length > 0) {
      setCurrentIndex(0)
    }
  }, [availableItems.length, currentIndex])

  // Preload images for current and next items
  useEffect(() => {
    if (availableItems.length === 0) return
    
    const imagesToPreload: string[] = []
    
    // Preload current item
    if (currentItem?.image) {
      imagesToPreload.push(`${currentItem.image}`)
    }
    
    // Preload next 2 items
    for (let i = 1; i <= 2; i++) {
      const nextIndex = safeIndex + i
      if (nextIndex < availableItems.length) {
        const nextItem = availableItems[nextIndex]
        if (nextItem?.image) {
          imagesToPreload.push(`${nextItem.image}`)
        }
      }
    }
    
    // Preload images
    imagesToPreload.forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [availableItems, safeIndex, currentItem])

  const handleDetailsClick = () => {
    setIsDetailsExpanded(!isDetailsExpanded)
  }

  const handleAction = (action: 'like' | 'dislike') => {
    if (!currentItem) return
    
    const dir = action === 'like' ? 'right' : 'left'
    setDirection(dir)
    
    // Mark item as swiped
    setSwipedItemIds(prev => new Set([...prev, currentItem.id]))
    
    // Right = Like, Left = Reject
    if (action === 'like') {
      onLike(currentItem)
    }
    
    // Animate card off screen, then move to next card
    setTimeout(() => {
      // Move to next available item (or reset to 0 if no more items)
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1
        return nextIndex < availableItems.length ? nextIndex : 0
      })
      setDirection(null)
      setIsDetailsExpanded(false)
    }, 400) // Wait for animation to complete
  }

  const handleUndo = () => {
    if (safeIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setIsDetailsExpanded(false)
      // Remove the last swiped item from the set
      const lastSwipedItem = availableItems[safeIndex - 1]
      if (lastSwipedItem) {
        setSwipedItemIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(lastSwipedItem.id)
          return newSet
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <p className="text-muted-foreground">Loading items...</p>
      </div>
    )
  }

  if (!currentItem) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <p className="text-muted-foreground">No more items!</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Card Stack */}
      <div className="relative h-[600px] mb-8">
        {/* Background cards for depth */}
        {currentIndex + 1 < fashionItems.length && (
          <div className="absolute inset-0 bg-card rounded-3xl transform scale-95 -z-10 shadow-lg" />
        )}
        {currentIndex + 2 < fashionItems.length && (
          <div className="absolute inset-0 bg-card rounded-3xl transform scale-90 -z-20 shadow-lg" />
        )}

        {/* Main card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={direction ? { 
              x: direction === 'left' ? -600 : 600,
              opacity: 0,
              scale: 0.8
            } : { opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
          <div className="relative h-full bg-card rounded-3xl overflow-hidden shadow-2xl">
            {/* Image */}
            <div className="h-full relative overflow-hidden bg-muted">
              <img
                src={currentItem.image ? `${currentItem.image}` : "/placeholder.svg"}
                alt={currentItem.name}
                className="w-full h-full object-cover"
                style={{ 
                  imageRendering: 'auto',
                  objectFit: 'cover',
                  willChange: 'transform',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden',
                }}
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  const target = e.target as HTMLImageElement
                  if (target.src !== '/placeholder.svg') {
                    target.src = '/placeholder.svg'
                  }
                }}
                loading="eager"
                decoding="async"
              />
              
              {/* Like/Dislike overlay */}
              <motion.div
                className={cn(
                  'absolute top-12 left-0 right-0 flex items-center justify-center text-7xl font-black tracking-tight',
                  direction === 'right' && 'text-primary drop-shadow-2xl',
                  direction === 'left' && 'text-destructive drop-shadow-2xl'
                )}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: direction ? 1 : 0, scale: direction ? 1 : 0.8 }}
              >
                {direction === 'right' ? 'LIKED!' : direction === 'left' ? 'NOPE' : ''}
              </motion.div>

              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl cursor-pointer",
                  isDetailsExpanded && "overflow-hidden"
                )}
                onClick={handleDetailsClick}
                style={{ 
                  maxHeight: isDetailsExpanded ? '450px' : undefined
                }}
              >
                {/* Pull indicator */}
                <div className="flex justify-center pt-3 pb-2">
                  <motion.div 
                    className="w-10 h-1 bg-gray-300 rounded-full"
                    animate={{ rotate: isDetailsExpanded ? 180 : 0 }}
                  />
                </div>

                {/* Basic info - only category and price visible */}
                <div className="px-6 pb-4">
                  <div className="flex items-start justify-between">
                    <h2 className="text-2xl font-bold text-foreground">{currentItem.category.toUpperCase()}</h2>
                    <span className="text-2xl font-bold text-primary">{currentItem.price}</span>
                  </div>
                </div>

                {/* All details - shown when expanded */}
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ 
                    opacity: isDetailsExpanded ? 1 : 0,
                    height: isDetailsExpanded ? 'auto' : 0
                  }}
                  className="px-6 pb-6 pt-2 border-t overflow-y-auto"
                  style={{ maxHeight: isDetailsExpanded ? '350px' : '0px' }}
                >
                  <div className="space-y-4">
                    {currentItem.description && (
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Description</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {currentItem.description}
                        </p>
                      </div>
                    )}

                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Details</h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Category</span>
                          <span className="font-medium text-foreground">{currentItem.category}</span>
                        </div>
                        {currentItem.brand && (
                          <div className="flex justify-between">
                            <span>Brand</span>
                            <span className="font-medium text-foreground">{currentItem.brand}</span>
                          </div>
                        )}
                        {currentItem.style && (
                          <div className="flex justify-between">
                            <span>Style</span>
                            <span className="font-medium text-foreground">{currentItem.style}</span>
                          </div>
                        )}
                        {currentItem.material && (
                          <div className="flex justify-between">
                            <span>Material</span>
                            <span className="font-medium text-foreground">{currentItem.material}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {currentItem.tags && currentItem.tags.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {currentItem.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-3 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}  
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-6">
        <Button
          size="lg"
          variant="outline"
          onClick={() => handleAction('dislike')}
          className="w-16 h-16 rounded-full border-2 border-destructive/30 bg-white hover:bg-destructive hover:border-destructive text-destructive hover:text-white transition-all shadow-lg"
        >
          <X className="w-7 h-7" strokeWidth={2.5} />
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={handleUndo}
          disabled={currentIndex === 0}
          className="w-14 h-14 rounded-full border-2 border-border bg-white hover:bg-secondary text-muted-foreground hover:text-foreground transition-all disabled:opacity-30 shadow-md"
        >
          <RotateCcw className="w-5 h-5" />
        </Button>

        <Button
          size="lg"
          onClick={() => handleAction('like')}
          className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg shadow-primary/30 border-2 border-primary"
        >
          <Heart className="w-7 h-7 fill-current" strokeWidth={0} />
        </Button>
      </div>
    </div>
  )
}
