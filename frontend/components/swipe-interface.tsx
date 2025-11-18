'use client'

import { useState } from 'react'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { X, Heart, RotateCcw, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

// Sample fashion items data
const fashionItems = [
  {
    id: '1',
    name: 'Oversized Blazer',
    category: 'Outerwear',
    price: '$129',
    image: '/black-oversized-blazer-fashion.jpg',
    brand: 'Modern Co.',
    tags: ['formal', 'blazer', 'black']
  },
  {
    id: '2',
    name: 'Vintage Denim Jacket',
    category: 'Outerwear',
    price: '$89',
    image: '/vintage-denim-jacket-fashion.jpg',
    brand: 'RetroStyle',
    tags: ['casual', 'denim', 'blue']
  },
  {
    id: '3',
    name: 'Silk Midi Dress',
    category: 'Dresses',
    price: '$159',
    image: '/silk-midi-dress-fashion-elegant.jpg',
    brand: 'Elegance',
    tags: ['formal', 'dress', 'silk']
  },
  {
    id: '4',
    name: 'Cropped Hoodie',
    category: 'Tops',
    price: '$45',
    image: '/cropped-hoodie-streetwear-fashion.jpg',
    brand: 'Street Style',
    tags: ['casual', 'hoodie', 'crop']
  },
  {
    id: '5',
    name: 'High-Waist Trousers',
    category: 'Bottoms',
    price: '$95',
    image: '/high-waist-trousers-fashion.jpg',
    brand: 'Chic Lines',
    tags: ['formal', 'trousers', 'tailored']
  },
  {
    id: '6',
    name: 'Leather Biker Jacket',
    category: 'Outerwear',
    price: '$299',
    image: '/leather-biker-jacket-fashion.jpg',
    brand: 'Edge Wear',
    tags: ['edgy', 'leather', 'jacket']
  }
]

interface SwipeInterfaceProps {
  onLike: (item: any) => void
}

export function SwipeInterface({ onLike }: SwipeInterfaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right' | null>(null)
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)
  const [isDraggingDetails, setIsDraggingDetails] = useState(false)

  const currentItem = fashionItems[currentIndex]
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25])
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0])

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (isDraggingDetails) return
    
    if (Math.abs(info.offset.x) > 100) {
      const dir = info.offset.x > 0 ? 'right' : 'left'
      setDirection(dir)
      
      if (dir === 'right') {
        onLike(currentItem)
      }
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % fashionItems.length)
        setDirection(null)
        x.set(0)
        setIsDetailsExpanded(false)
      }, 300)
    } else {
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
    setDirection(action === 'like' ? 'right' : 'left')
    
    if (action === 'like') {
      onLike(currentItem)
    }
    
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % fashionItems.length)
      setDirection(null)
      x.set(0)
      setIsDetailsExpanded(false)
    }, 300)
  }

  const handleUndo = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      x.set(0)
      setIsDetailsExpanded(false)
    }
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
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          animate={direction ? { x: direction === 'left' ? -300 : 300 } : {}}
        >
          <div className="relative h-full bg-card rounded-3xl overflow-hidden shadow-2xl">
            {/* Image */}
            <div className="h-full relative overflow-hidden">
              <img
                src={currentItem.image || "/placeholder.svg"}
                alt={currentItem.name}
                className="w-full h-full object-cover"
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
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl cursor-pointer"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragStart={() => setIsDraggingDetails(true)}
                onDragEnd={handleDetailsDragEnd}
                onClick={handleDetailsClick}
                animate={{ 
                  y: isDetailsExpanded ? -410 : 0,
                  height: isDetailsExpanded ? 480 : 'auto'
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ touchAction: 'none' }}
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isDetailsExpanded ? 1 : 0 }}
                  className="px-6 pb-6 pt-2 border-t overflow-y-auto"
                  style={{ maxHeight: isDetailsExpanded ? '300px' : '0px' }}
                >
                  {!isDetailsExpanded && (
                    <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                      <ChevronUp className="w-5 h-5" />
                      <span className="text-sm font-medium">Tap or pull up for more details</span>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Description</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        This {currentItem.name.toLowerCase()} features premium materials and modern design. 
                        Perfect for {currentItem.category.toLowerCase()} occasions and versatile styling options.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Details</h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Category</span>
                          <span className="font-medium text-foreground">{currentItem.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Brand</span>
                          <span className="font-medium text-foreground">{currentItem.brand}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Material</span>
                          <span className="font-medium text-foreground">Premium Quality</span>
                        </div>
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
          {currentIndex + 1} / {fashionItems.length}
        </p>
      </div>
    </div>
  )
}
