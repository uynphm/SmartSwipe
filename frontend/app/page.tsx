'use client'

import { useState, useEffect } from 'react'
import { SwipeInterface } from '@/components/swipe-interface'
import { Wishlist } from '@/components/wishlist'
import { OutfitGenerator } from '@/components/outfit-generator'
import { Button } from '@/components/ui/button'
import { Heart, Sparkles, Home } from 'lucide-react'

export default function Page() {
  const [view, setView] = useState<'swipe' | 'wishlist' | 'outfits'>('swipe')
  const [likedItems, setLikedItems] = useState<any[]>([])

  useEffect(() => {
    // Load liked items from localStorage on mount
    const saved = localStorage.getItem('smartswipe_liked')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Remove duplicates by using a Map with id as key
        const uniqueItems = Array.from(
          new Map(parsed.map((item: any) => [item.id, item])).values()
        )
        setLikedItems(uniqueItems)
        // Update localStorage with deduplicated items
        if (uniqueItems.length !== parsed.length) {
          localStorage.setItem('smartswipe_liked', JSON.stringify(uniqueItems))
        }
      } catch (error) {
        console.error('Error loading liked items:', error)
        setLikedItems([])
      }
    }
  }, [])

  const handleLike = (item: any) => {
    // Check if item already exists in likedItems to prevent duplicates
    const alreadyLiked = likedItems.some(likedItem => likedItem.id === item.id)
    if (alreadyLiked) {
      return // Item already in wishlist, don't add again
    }
    
    const updated = [...likedItems, item]
    setLikedItems(updated)
    localStorage.setItem('smartswipe_liked', JSON.stringify(updated))
  }

  const handleRemoveFromWishlist = (itemId: string) => {
    const updated = likedItems.filter(item => item.id !== itemId)
    setLikedItems(updated)
    localStorage.setItem('smartswipe_liked', JSON.stringify(updated))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">SmartSwipe</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={view === 'swipe' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('swipe')}
                className={view === 'swipe' ? 'bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full'}
              >
                <Home className="w-4 h-4" />
              </Button>
              <Button
                variant={view === 'wishlist' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('wishlist')}
                className={view === 'wishlist' ? 'bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full'}
              >
                <Heart className="w-4 h-4" />
                {likedItems.length > 0 && (
                  <span className="ml-1 text-xs">{likedItems.length}</span>
                )}
              </Button>
              <Button
                variant={view === 'outfits' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('outfits')}
                className={view === 'outfits' ? 'bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full'}
              >
                <Sparkles className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {view === 'swipe' && <SwipeInterface onLike={handleLike} wishlist={likedItems} />}
        {view === 'wishlist' && (
          <Wishlist items={likedItems} onRemove={handleRemoveFromWishlist} />
        )}
        {view === 'outfits' && <OutfitGenerator likedItems={likedItems} />}
      </main>
    </div>
  )
}
