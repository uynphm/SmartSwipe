'use client'

import { Button } from '@/components/ui/button'
import { Trash2, ShoppingBag } from 'lucide-react'
import { motion } from 'framer-motion'

interface WishlistProps {
  items: any[]
  onRemove: (id: string) => void
}

export function Wishlist({ items, onRemove }: WishlistProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <ShoppingBag className="w-20 h-20 text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Your Wishlist is Empty</h2>
        <p className="text-muted-foreground max-w-md">
          Start swiping right on items you love to build your perfect collection!
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">Your Wishlist</h2>
        <p className="text-muted-foreground">{items.length} items saved</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all group"
          >
            <div className="relative aspect-[3/4] overflow-hidden">
              <img
                src={item.image || "/placeholder.svg"}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <Button
                size="icon"
                variant="destructive"
                onClick={() => onRemove(item.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow-lg"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 bg-white">
              <h3 className="font-semibold text-foreground mb-1">{item.category}</h3>
              <p className="text-sm text-muted-foreground mb-2">{item.brand}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-primary">{item.price}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
