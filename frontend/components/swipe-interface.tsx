'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  onReject?: (item: any) => void
  wishlist?: FashionItem[]
  rejectedItems?: FashionItem[]
}

export function SwipeInterface({ onLike, onReject, wishlist = [], rejectedItems = [] }: SwipeInterfaceProps) {
  const [fashionItems, setFashionItems] = useState<FashionItem[]>([])
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, FashionItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [swipedItemIds, setSwipedItemIds] = useState<Set<string>>(new Set())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right' | null>(null)
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<string | null>(null)
  const [itemsInCurrentCategory, setItemsInCurrentCategory] = useState<FashionItem[]>([])
  const [allItemsInCategory, setAllItemsInCategory] = useState<FashionItem[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isProcessingAction, setIsProcessingAction] = useState(false)

  // Load all items for a category, sorted by similarity score
  const loadCategoryItems = useCallback(async (category: string, allItems: FashionItem[]) => {
    // Filter out already swiped items first
    const availableItems = allItems.filter(item => !swipedItemIds.has(item.id))
    
    if (availableItems.length === 0) {
      setItemsInCurrentCategory([])
      return
    }

    // Don't use cache - recalculate similarity for each category
    setIsAnalyzing(true)
    
    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          allItemsInCategory: availableItems, // Only send available items
          wishlist: wishlist,
          rejectedItems: rejectedItems, // Include rejected items to avoid similar ones
          category: category, // Include category to ensure recalculation
        }),
      })

      if (!response.ok) {
        console.error('Failed to get recommendations')
        // Fallback to random order (availableItems already filtered above)
        const shuffled = [...availableItems].sort(() => Math.random() - 0.5)
        setItemsInCurrentCategory(shuffled)
        setIsAnalyzing(false)
        return
      }

      const data = await response.json()
      const { items } = data // Array of { id, score }

      if (!Array.isArray(items)) {
        // Fallback if API format is wrong
        const shuffled = [...availableItems].sort(() => Math.random() - 0.5)
        setItemsInCurrentCategory(shuffled)
        setIsAnalyzing(false)
        return
      }

      // Map scored items back to full item objects
      const itemMap = new Map(availableItems.map((item: FashionItem) => [item.id, item]))
      const sortedItems: FashionItem[] = []
      const autoRejectedIds: string[] = []
      
      // Threshold for automatic rejection
      // Items with score below this threshold are automatically rejected
      const REJECTION_THRESHOLD = 0.3 // Adjust this value (0.0 to 1.0)
      
      // Items are already sorted by score from API (highest first)
      // Only include items that have meaningful similarity scores (score > threshold)
      // Items below threshold are automatically rejected
      for (const { id, score } of items) {
        const item = itemMap.get(id)
        if (!item || swipedItemIds.has(item.id)) continue
        
        // Automatically reject items with low scores
        if (score < REJECTION_THRESHOLD) {
          autoRejectedIds.push(item.id)
          // Automatically add to rejected items if onReject callback exists
          if (onReject && wishlist.length > 0) {
            // Only auto-reject if user has a wishlist (meaningful scores)
            onReject(item)
          }
          continue
        }
        
        // Only add items with scores above threshold
        if (score > 0) {
          sortedItems.push(item)
        }
      }
      
      if (autoRejectedIds.length > 0) {
        console.log(`[loadCategoryItems] Auto-rejected ${autoRejectedIds.length} items with score < ${REJECTION_THRESHOLD}`)
      }

      // If no wishlist items, show all items in random order
      // If wishlist exists but no good matches found, show top items anyway
      if (sortedItems.length === 0 && wishlist.length > 0) {
        // Fallback: show items even with low scores if no good matches
        for (const { id, score } of items) {
          const item = itemMap.get(id)
          if (item && !swipedItemIds.has(item.id) && score > -1) {
            sortedItems.push(item)
          }
        }
      } else if (sortedItems.length === 0 && wishlist.length === 0) {
        // No wishlist: show all items in random order
        const shuffled = [...availableItems].sort(() => Math.random() - 0.5)
        sortedItems.push(...shuffled)
      }

      console.log(`[loadCategoryItems] Category: ${category}, Setting ${sortedItems.length} items sorted by similarity score`)
      setItemsInCurrentCategory(sortedItems)
      setCurrentIndex(0)
      setDirection(null) // Clear direction when loading new items
    } catch (error) {
      console.error('Error getting recommendations:', error)
      // Fallback to random order (availableItems already filtered above)
      const shuffled = [...availableItems].sort(() => Math.random() - 0.5)
      setItemsInCurrentCategory(shuffled)
      setDirection(null) // Clear direction on error too
    } finally {
      setIsAnalyzing(false)
    }
  }, [wishlist, swipedItemIds])

  // Fetch items from API
  useEffect(() => {
    async function fetchItems() {
      try {
        const response = await fetch('/api/items')
        const data = await response.json()
        if (data.items && data.itemsByCategory) {
          setFashionItems(data.items)
          setItemsByCategory(data.itemsByCategory)
          
          // Initialize with first category that has items
          const categories = Object.keys(data.itemsByCategory).sort()
          for (const category of categories) {
            const items = data.itemsByCategory[category] || []
            if (items.length > 0) {
              setCurrentCategory(category)
              setAllItemsInCategory(items)
              // Get 3 recommended items for this category
              loadCategoryItems(category, items)
              break
            }
          }
        }
      } catch (error) {
        console.error('Error fetching items:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchItems()
  }, [loadCategoryItems])

  // Recalculate recommendations when wishlist or rejected items change (real-time updates)
  // Use refs to track previous lengths to avoid unnecessary recalculations
  const prevWishlistLengthRef = useRef(wishlist.length)
  const prevRejectedLengthRef = useRef(rejectedItems.length)
  
  useEffect(() => {
    // Only recalculate if wishlist or rejected items length actually changed
    const wishlistChanged = prevWishlistLengthRef.current !== wishlist.length
    const rejectedChanged = prevRejectedLengthRef.current !== rejectedItems.length
    
    if ((wishlistChanged || rejectedChanged) && currentCategory && allItemsInCategory.length > 0 && !isAnalyzing) {
      console.log('[useEffect] Wishlist or rejected items changed, recalculating recommendations for current category')
      prevWishlistLengthRef.current = wishlist.length
      prevRejectedLengthRef.current = rejectedItems.length
      loadCategoryItems(currentCategory, allItemsInCategory)
    } else if (wishlistChanged || rejectedChanged) {
      // Update refs even if we don't recalculate
      prevWishlistLengthRef.current = wishlist.length
      prevRejectedLengthRef.current = rejectedItems.length
    }
  }, [wishlist.length, rejectedItems.length, currentCategory, allItemsInCategory.length, isAnalyzing]) // Recalculate when wishlist or rejected items change

  // Get available items for current category (not swiped)
  const availableItemsInCategory = itemsInCurrentCategory.filter(item => !swipedItemIds.has(item.id))
  // Reset index if current index is out of bounds
  const safeIndex = currentIndex >= availableItemsInCategory.length ? 0 : currentIndex
  const currentItem = availableItemsInCategory[safeIndex]

  // Reset index when available items change
  useEffect(() => {
    if (currentIndex >= availableItemsInCategory.length && availableItemsInCategory.length > 0) {
      setCurrentIndex(0)
      setDirection(null) // Clear direction when resetting index
    }
  }, [availableItemsInCategory.length, currentIndex])

  // Find next category with available items
  const findNextCategoryWithItems = useCallback(() => {
    const categories = Object.keys(itemsByCategory).sort()
    if (categories.length === 0) return null

    // Find current category index
    let startIndex = 0
    if (currentCategory) {
      const currentIndex = categories.indexOf(currentCategory)
      if (currentIndex >= 0) {
        startIndex = currentIndex + 1
      }
    }

    // Check categories starting from next one, then loop back
    for (let i = 0; i < categories.length; i++) {
      const checkIndex = (startIndex + i) % categories.length
      const category = categories[checkIndex]
      const allItems = itemsByCategory[category] || []
      
      // Filter out already swiped items
      const availableItems = allItems.filter(item => !swipedItemIds.has(item.id))
      
      if (availableItems.length > 0) {
        return { category, availableItems, allItems }
      }
    }

    return null
  }, [itemsByCategory, currentCategory, swipedItemIds])

  // Move to next category (loops back to first)
  const moveToNextCategory = useCallback(() => {
    const next = findNextCategoryWithItems()
    
    if (next) {
      setCurrentCategory(next.category)
      setAllItemsInCategory(next.allItems)
      setCurrentIndex(0)
      setDirection(null) // Clear direction when moving to next category
      // Load 3 recommended items for next category (only from available items)
      loadCategoryItems(next.category, next.availableItems)
    }
  }, [findNextCategoryWithItems, loadCategoryItems])

  // Auto-move to next category when current category is exhausted
  useEffect(() => {
    if (availableItemsInCategory.length === 0 && currentCategory && !isAnalyzing) {
      // Small delay to allow UI to update
      const timer = setTimeout(() => {
        moveToNextCategory()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [availableItemsInCategory.length, currentCategory, isAnalyzing, moveToNextCategory])

  // Check if there are any items left in any category
  const hasMoreItems = useCallback(() => {
    const categories = Object.keys(itemsByCategory).sort()
    for (const category of categories) {
      const allItems = itemsByCategory[category] || []
      const availableItems = allItems.filter(item => !swipedItemIds.has(item.id))
      if (availableItems.length > 0) {
        return true
      }
    }
    return false
  }, [itemsByCategory, swipedItemIds])

  // Preload images for current and next items
  useEffect(() => {
    if (availableItemsInCategory.length === 0) return
    
    const imagesToPreload: string[] = []
    
    // Preload current item
    if (currentItem?.image) {
      imagesToPreload.push(`${currentItem.image}`)
    }
    
    // Preload next 2 items
    for (let i = 1; i <= 2; i++) {
      const nextIndex = safeIndex + i
      if (nextIndex < availableItemsInCategory.length) {
        const nextItem = availableItemsInCategory[nextIndex]
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
  }, [availableItemsInCategory, safeIndex, currentItem])

  const handleDetailsClick = () => {
    setIsDetailsExpanded(!isDetailsExpanded)
  }

  const handleAction = (action: 'like' | 'dislike', event?: React.MouseEvent) => {
    if (!currentItem || isProcessingAction) return
    
    // Prevent event propagation to avoid accidental triggers
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    
    // Prevent double-clicks/rapid actions
    setIsProcessingAction(true)
    
    const dir = action === 'like' ? 'right' : 'left'
    setDirection(dir)
    
    // Mark item as swiped
    setSwipedItemIds(prev => new Set([...prev, currentItem.id]))
    
    // Right = Like, Left = Reject
    if (action === 'like') {
      onLike(currentItem)
    } else if (action === 'dislike' && onReject) {
      onReject(currentItem)
    }
    
    // Animate card off screen, then move to next card
    setTimeout(() => {
      // After filtering out the swiped item, the next item will be at index 0
      // (since we remove the current item from the array)
      // Check if there are any items left in current category after swiping
      // Exclude the current item (which we just swiped) from the count
      const currentItemId = currentItem.id
      const remainingItems = itemsInCurrentCategory.filter(
        item => item.id !== currentItemId && !swipedItemIds.has(item.id)
      )
      if (remainingItems.length <= 0) {
        // Move to next category (will loop back to first if needed)
        moveToNextCategory()
      } else {
        // Stay at index 0 - the next item will be there after filtering
        setCurrentIndex(0)
      }
      setDirection(null)
      setIsDetailsExpanded(false)
      setIsProcessingAction(false)
    }, 400) // Wait for animation to complete
  }

  const handleUndo = () => {
    if (safeIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setIsDetailsExpanded(false)
      // Remove the last swiped item from the set
      const lastSwipedItem = availableItemsInCategory[safeIndex - 1]
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

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px]">
        <p className="text-muted-foreground mb-2">Analyzing your preferences...</p>
        <p className="text-sm text-muted-foreground">Getting personalized recommendations</p>
      </div>
    )
  }

  if (!currentItem) {
    // Try to find next category with items
    if (hasMoreItems()) {
      // This will trigger when component re-renders after moveToNextCategory
      return (
        <div className="flex items-center justify-center h-[600px]">
          <p className="text-muted-foreground">Loading next category...</p>
        </div>
      )
    }
    
    return (
      <div className="flex items-center justify-center h-[600px]">
        <p className="text-muted-foreground">No more items!</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Category indicator */}
      {currentCategory && (
        <div className="mb-4 text-center">
          <p className="text-sm text-muted-foreground">
            Category: <span className="font-semibold text-foreground">{currentCategory.toUpperCase()}</span>
          </p>
        </div>
      )}

      {/* Card Stack */}
      <div className="relative h-[600px] mb-8">
        {/* Background cards for depth */}
        {currentIndex + 1 < availableItemsInCategory.length && (
          <div className="absolute inset-0 bg-card rounded-3xl transform scale-95 -z-10 shadow-lg" />
        )}
        {currentIndex + 2 < availableItemsInCategory.length && (
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
              </motion.div>

              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl cursor-pointer",
                  isDetailsExpanded && "overflow-hidden"
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDetailsClick()
                }}
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
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{currentItem.category.toUpperCase()}</h2>
                      {currentItem.brand && (
                        <p className="text-sm text-muted-foreground mt-1">{currentItem.brand}</p>
                      )}
                    </div>
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
          onClick={(e) => handleAction('dislike', e)}
          disabled={isProcessingAction}
          className="w-16 h-16 rounded-full border-2 border-destructive/30 bg-white hover:bg-destructive hover:border-destructive text-destructive hover:text-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-7 h-7" strokeWidth={2.5} />
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleUndo()
          }}
          disabled={currentIndex === 0}
          className="w-14 h-14 rounded-full border-2 border-border bg-white hover:bg-secondary text-muted-foreground hover:text-foreground transition-all disabled:opacity-30 shadow-md"
        >
          <RotateCcw className="w-5 h-5" />
        </Button>

        <Button
          size="lg"
          onClick={(e) => handleAction('like', e)}
          disabled={isProcessingAction}
          className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg shadow-primary/30 border-2 border-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Heart className="w-7 h-7 fill-current" strokeWidth={0} />
        </Button>
      </div>
    </div>
  )
}
