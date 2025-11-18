'use client'

import { useState, useEffect } from 'react'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
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
  gender?: string
  masterCategory?: string
  subCategory?: string
  articleType?: string
  baseColour?: string
  season?: string
  year?: string
  usage?: string
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
  const [isDraggingDetails, setIsDraggingDetails] = useState(false)

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
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-300, 0, 300], [-30, 0, 30])
  const opacity = useTransform(x, [-300, -150, 0, 150, 300], [0, 0.5, 1, 0.5, 0])

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (isDraggingDetails) return
    
    const swipeThreshold = 100
    const velocityThreshold = 500
    
    // Check if swipe was significant enough (either by distance or velocity)
    const isSwipe = Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.velocity.x) > velocityThreshold
    
    if (isSwipe && currentItem) {
      const dir = info.offset.x > 0 || info.velocity.x > 0 ? 'right' : 'left'
      setDirection(dir)
      
      // Mark item as swiped
      setSwipedItemIds(prev => new Set([...prev, currentItem.id]))
      
      // Right swipe = Like, Left swipe = Reject
      if (dir === 'right') {
        onLike(currentItem)
      }
      // Left swipe doesn't call onLike, so it's rejected
      
      // Animate card off screen, then move to next card
      setTimeout(() => {
        // Move to next available item (or reset to 0 if no more items)
        setCurrentIndex((prev) => {
          const nextIndex = prev + 1
          return nextIndex < availableItems.length ? nextIndex : 0
        })
        setDirection(null)
        x.set(0)
        setIsDetailsExpanded(false)
      }, 400) // Wait for animation to complete
    } else {
      // Snap back if swipe wasn't strong enough
      x.set(0)
    }
  }

  const handleDetailsDragEnd = (_: any, info: PanInfo) => {
    setIsDraggingDetails(false)
    
    if (isDetailsExpanded) {
      if (info.offset.y > 50) {
        setIsDetailsExpanded(false)
      }
    } else {
      if (info.offset.y < -50) {
        setIsDetailsExpanded(true)
      }
    }
  }

  const handleDetailsClick = () => {
    setIsDetailsExpanded(!isDetailsExpanded)
  }

  const handleAction = (action: 'like' | 'dislike') => {
    if (!currentItem) return
    
    const dir = action === 'like' ? 'right' : 'left'
    setDirection(dir)
    
    // Mark item as swiped
    setSwipedItemIds(prev => new Set([...prev, currentItem.id]))
    
    // Right swipe = Like, Left swipe = Reject
    if (action === 'like') {
      onLike(currentItem)
    }
    // Dislike doesn't call onLike, so it's rejected
    
    // Animate card off screen, then move to next card
    setTimeout(() => {
      // Move to next available item (or reset to 0 if no more items)
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1
        return nextIndex < availableItems.length ? nextIndex : 0
      })
      setDirection(null)
      x.set(0)
      setIsDetailsExpanded(false)
    }, 400) // Wait for animation to complete
  }

  const handleUndo = () => {
    if (safeIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      x.set(0)
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
        <motion.div
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          style={{
            x,
            rotate,
            opacity,
          }}
          drag="x"
          dragConstraints={{ left: -500, right: 500 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          animate={direction ? { 
            x: direction === 'left' ? -600 : 600,
            opacity: 0
          } : {}}
          transition={direction ? { type: 'spring', stiffness: 300, damping: 30 } : {}}
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

              <motion.div
                className={cn(
                  "absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl cursor-pointer",
                  isDetailsExpanded && "overflow-hidden"
                )}
                drag="y"
                dragConstraints={{ top: -400, bottom: 0 }}
                dragElastic={0.2}
                dragMomentum={false}
                onDragStart={() => setIsDraggingDetails(true)}
                onDragEnd={handleDetailsDragEnd}
                onClick={handleDetailsClick}
                animate={{ 
                  y: 0
                }}
                whileDrag={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ 
                  touchAction: 'none',
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

                {/* Basic info - always visible */}
                <div className="px-6 pb-4">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{currentItem.name}</h2>
                      <p className="text-muted-foreground text-sm">{currentItem.brand}</p>
                    </div>
                    <span className="text-2xl font-bold text-primary">{currentItem.price}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
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
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Description</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {currentItem.name} - A stylish {currentItem.articleType?.toLowerCase() || currentItem.category.toLowerCase()} 
                        {currentItem.baseColour ? ` in ${currentItem.baseColour.toLowerCase()}` : ''} 
                        {currentItem.season ? ` perfect for ${currentItem.season.toLowerCase()}` : ''} 
                        {currentItem.usage ? ` ${currentItem.usage.toLowerCase()} wear` : ''}.
                        {currentItem.gender ? ` Designed for ${currentItem.gender}.` : ''}
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Details</h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {currentItem.gender && (
                          <div className="flex justify-between">
                            <span>Gender</span>
                            <span className="font-medium text-foreground">{currentItem.gender}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Category</span>
                          <span className="font-medium text-foreground">{currentItem.category}</span>
                        </div>
                        {currentItem.articleType && (
                          <div className="flex justify-between">
                            <span>Type</span>
                            <span className="font-medium text-foreground">{currentItem.articleType}</span>
                          </div>
                        )}
                        {currentItem.brand && (
                          <div className="flex justify-between">
                            <span>Brand</span>
                            <span className="font-medium text-foreground">{currentItem.brand}</span>
                          </div>
                        )}
                        {currentItem.baseColour && (
                          <div className="flex justify-between">
                            <span>Color</span>
                            <span className="font-medium text-foreground">{currentItem.baseColour}</span>
                          </div>
                        )}
                        {currentItem.season && (
                          <div className="flex justify-between">
                            <span>Season</span>
                            <span className="font-medium text-foreground">{currentItem.season}</span>
                          </div>
                        )}
                        {currentItem.year && (
                          <div className="flex justify-between">
                            <span>Year</span>
                            <span className="font-medium text-foreground">{currentItem.year}</span>
                          </div>
                        )}
                        {currentItem.usage && (
                          <div className="flex justify-between">
                            <span>Usage</span>
                            <span className="font-medium text-foreground">{currentItem.usage}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Available Sizes</h3>
                      <div className="flex gap-2">
                        {['XS', 'S', 'M', 'L', 'XL'].map((size) => (
                          <div
                            key={size}
                            className="w-12 h-12 rounded-full border-2 border-border flex items-center justify-center text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
                          >
                            {size}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>
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

      {/* Progress indicator */}
      <div className="mt-8 text-center">
        <p className="text-muted-foreground text-sm font-medium">
          {availableItems.length > 0 ? `${safeIndex + 1} / ${availableItems.length}` : 'No more items!'}
        </p>
      </div>
    </div>
  )
}
