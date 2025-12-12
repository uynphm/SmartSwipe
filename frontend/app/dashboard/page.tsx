'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SwipeInterface } from '@/components/swipe-interface'
import { Wishlist } from '@/components/wishlist'
import { OutfitGenerator } from '@/components/outfit-generator'
import { Button } from '@/components/ui/button'
import { Heart, Sparkles, Home, LogOut, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { authenticatedFetch } from '@/lib/api-client'

export default function DashboardPage() {
  const router = useRouter()
  const { user, logout, isAuthenticated, token } = useAuth()
  const [view, setView] = useState<'swipe' | 'wishlist' | 'outfits'>('swipe')
  const [likedItems, setLikedItems] = useState<any[]>([])
  const [rejectedItems, setRejectedItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  // Load user data from database
  useEffect(() => {
    if (!isAuthenticated || !token) return

    const loadUserData = async () => {
      try {
        setLoading(true)
        
        // Load wishlist
        const wishlistResponse = await authenticatedFetch('/api/user/wishlist', { method: 'GET' }, token)
        if (wishlistResponse.ok) {
          const wishlistData = await wishlistResponse.json()
          // Convert database format to component format
          const formattedWishlist = wishlistData.wishlist.map((w: any) => ({
            id: w.item_id,
            name: w.item_name || '',
            category: w.item_category || '',
            image: w.item_image || '',
            brand: w.item_brand || '',
            price: w.item_price || '',
          }))
          setLikedItems(formattedWishlist)
        }

        // Load rejected items
        const rejectedResponse = await authenticatedFetch('/api/user/rejected', { method: 'GET' }, token)
        if (rejectedResponse.ok) {
          const rejectedData = await rejectedResponse.json()
          // Convert to full item objects (we only have IDs, so we'll store as IDs for now)
          // The swipe interface will handle filtering
          setRejectedItems(rejectedData.rejectedItems.map((id: string) => ({ id })))
        }
      } catch (error) {
        console.error('Error loading user data:', error)
        // If unauthorized, redirect to login
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          logout()
          router.push('/')
        }
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [isAuthenticated, token])

  const handleLike = async (item: any) => {
    if (!token) return

    // Check if item already exists in likedItems to prevent duplicates
    const alreadyLiked = likedItems.some(likedItem => likedItem.id === item.id)
    if (alreadyLiked) {
      return
    }

    try {
      const response = await authenticatedFetch(
        '/api/user/wishlist',
        {
          method: 'POST',
          body: JSON.stringify({
            item_id: item.id,
            item_name: item.name,
            item_category: item.category,
            item_image: item.image,
            item_brand: item.brand,
            item_price: item.price,
          }),
        },
        token
      )

      if (response.ok) {
        const updated = [...likedItems, item]
        setLikedItems(updated)
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error)
    }
  }

  const handleRemoveFromWishlist = async (itemId: string) => {
    if (!token) return

    try {
      const response = await authenticatedFetch(
        `/api/user/wishlist?itemId=${encodeURIComponent(itemId)}`,
        { method: 'DELETE' },
        token
      )

      if (response.ok) {
        const updated = likedItems.filter(item => item.id !== itemId)
        setLikedItems(updated)
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error)
    }
  }

  const handleReject = async (item: any) => {
    if (!token) return

    // Check if item already exists in rejectedItems to prevent duplicates
    const alreadyRejected = rejectedItems.some(rejectedItem => rejectedItem.id === item.id)
    if (alreadyRejected) {
      return
    }

    try {
      const response = await authenticatedFetch(
        '/api/user/rejected',
        {
          method: 'POST',
          body: JSON.stringify({ itemId: item.id }),
        },
        token
      )

      if (response.ok) {
        const updated = [...rejectedItems, { id: item.id }]
        setRejectedItems(updated)
      }
    } catch (error) {
      console.error('Error adding rejected item:', error)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  if (!isAuthenticated) {
    return null // Will redirect
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
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
            <div className="flex items-center gap-4">
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{user?.name || user?.email}</span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {view === 'swipe' && <SwipeInterface onLike={handleLike} onReject={handleReject} wishlist={likedItems} rejectedItems={rejectedItems} />}
        {view === 'wishlist' && (
          <Wishlist items={likedItems} onRemove={handleRemoveFromWishlist} />
        )}
        {view === 'outfits' && <OutfitGenerator likedItems={likedItems} />}
      </main>
    </div>
  )
}

