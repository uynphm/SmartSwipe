'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

interface OutfitGeneratorProps {
  likedItems: any[]
}

export function OutfitGenerator({ likedItems }: OutfitGeneratorProps) {
  const [currentOutfit, setCurrentOutfit] = useState<any[]>([])
  
  // Categorize items based on CSV categories
  const categorizeItems = () => {
    const categories = {
      tops: likedItems.filter(item => 
        item.subCategory === 'Topwear' || 
        item.category === 'Topwear' ||
        item.articleType?.toLowerCase().includes('shirt') ||
        item.articleType?.toLowerCase().includes('tshirt') ||
        item.articleType?.toLowerCase().includes('top') ||
        item.tags?.some((tag: string) => ['shirt', 'tshirt', 'top', 'hoodie'].includes(tag))
      ),
      bottoms: likedItems.filter(item => 
        item.subCategory === 'Bottomwear' ||
        item.category === 'Bottomwear' ||
        item.articleType?.toLowerCase().includes('jean') ||
        item.articleType?.toLowerCase().includes('pant') ||
        item.articleType?.toLowerCase().includes('trouser') ||
        item.tags?.some((tag: string) => ['jean', 'pant', 'trouser'].includes(tag))
      ),
      outerwear: likedItems.filter(item => 
        item.subCategory === 'Outerwear' ||
        item.category === 'Outerwear' ||
        item.articleType?.toLowerCase().includes('jacket') ||
        item.articleType?.toLowerCase().includes('blazer') ||
        item.tags?.some((tag: string) => ['jacket', 'blazer'].includes(tag))
      ),
      dresses: likedItems.filter(item => 
        item.articleType?.toLowerCase().includes('dress') ||
        item.tags?.some((tag: string) => tag.includes('dress'))
      ),
      accessories: likedItems.filter(item => 
        item.masterCategory === 'Accessories' ||
        item.category === 'Accessories' ||
        item.articleType?.toLowerCase().includes('watch') ||
        item.articleType?.toLowerCase().includes('bag') ||
        item.articleType?.toLowerCase().includes('belt')
      )
    }
    return categories
  }

  const generateOutfit = () => {
    const categories = categorizeItems()
    const outfit: any[] = []

    // Try to create a complete outfit
    if (categories.dresses.length > 0) {
      // Dress-based outfit
      outfit.push(categories.dresses[Math.floor(Math.random() * categories.dresses.length)])
      if (categories.outerwear.length > 0) {
        outfit.push(categories.outerwear[Math.floor(Math.random() * categories.outerwear.length)])
      }
      // Add an accessory if available
      if (categories.accessories.length > 0 && Math.random() > 0.6) {
        outfit.push(categories.accessories[Math.floor(Math.random() * categories.accessories.length)])
      }
    } else {
      // Top + Bottom outfit
      if (categories.tops.length > 0) {
        outfit.push(categories.tops[Math.floor(Math.random() * categories.tops.length)])
      }
      if (categories.bottoms.length > 0) {
        outfit.push(categories.bottoms[Math.floor(Math.random() * categories.bottoms.length)])
      }
      if (categories.outerwear.length > 0 && Math.random() > 0.5) {
        outfit.push(categories.outerwear[Math.floor(Math.random() * categories.outerwear.length)])
      }
      // Add an accessory if available
      if (categories.accessories.length > 0 && Math.random() > 0.6) {
        outfit.push(categories.accessories[Math.floor(Math.random() * categories.accessories.length)])
      }
    }

    setCurrentOutfit(outfit)
  }

  useEffect(() => {
    if (likedItems.length > 0) {
      generateOutfit()
    }
  }, [likedItems])

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
          <p className="text-muted-foreground">Styled combinations from your liked items</p>
        </div>
        <Button
          onClick={generateOutfit}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Generate New
        </Button>
      </div>

      {currentOutfit.length > 0 && (
        <motion.div
          key={currentOutfit.map(i => i.id).join('-')}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold text-foreground">Today's Outfit</h3>
          </div>

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
                    <p className="text-xs text-background font-medium">{item.category}</p>
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-foreground mb-1">{item.name}</h4>
                  <p className="text-sm text-muted-foreground">{item.brand}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 rounded-full shadow-lg">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Shop This Outfit
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function ShoppingBag({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}
