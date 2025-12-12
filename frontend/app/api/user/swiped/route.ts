import { NextResponse } from 'next/server'
import { getUserSwipedItems, addSwipedItem } from '@/lib/db-server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const swipedItems = await getUserSwipedItems(decoded.userId)
    return NextResponse.json({ swipedItems })
  } catch (error) {
    console.error('Error fetching swiped items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch swiped items' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { itemId } = body
    
    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
    }

    await addSwipedItem(decoded.userId, itemId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding swiped item:', error)
    return NextResponse.json(
      { error: 'Failed to add swiped item' },
      { status: 500 }
    )
  }
}

