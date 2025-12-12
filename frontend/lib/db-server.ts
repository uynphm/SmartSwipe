import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase environment variables are not set')
}

// Use service role key for server-side operations (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export interface User {
  id: string
  email: string
  name: string | null
  created_at: string
  updated_at: string
}

export interface UserWishlist {
  id: string
  user_id: string
  item_id: string
  item_name: string | null
  item_category: string | null
  item_image: string | null
  item_brand: string | null
  item_price: string | null
  created_at: string
}

// User authentication functions
export async function createUser(email: string, password: string, name?: string) {
  // Hash password
  const saltRounds = 10
  const passwordHash = await bcrypt.hash(password, saltRounds)

  // Insert user into database
  const { data, error } = await supabase
    .from('users')
    .insert({
      email,
      password_hash: passwordHash,
      name: name || null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function verifyUser(email: string, password: string): Promise<User | null> {
  // Get user by email
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error || !user) {
    return null
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash)
  if (!isValid) {
    return null
  }

  // Return user without password hash
  const { password_hash, ...userWithoutPassword } = user
  return userWithoutPassword as User
}

// Wishlist functions
export async function getUserWishlist(userId: string): Promise<UserWishlist[]> {
  const { data, error } = await supabase
    .from('user_wishlist')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function addToWishlist(
  userId: string,
  item: {
    item_id: string
    item_name?: string
    item_category?: string
    item_image?: string
    item_brand?: string
    item_price?: string
  }
) {
  const { data, error } = await supabase
    .from('user_wishlist')
    .insert({
      user_id: userId,
      ...item,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function removeFromWishlist(userId: string, itemId: string) {
  const { error } = await supabase
    .from('user_wishlist')
    .delete()
    .eq('user_id', userId)
    .eq('item_id', itemId)

  if (error) {
    throw new Error(error.message)
  }
}

// Rejected items functions
export async function getUserRejectedItems(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_rejected_items')
    .select('item_id')
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }

  return data?.map(item => item.item_id) || []
}

export async function addRejectedItem(userId: string, itemId: string) {
  const { error } = await supabase
    .from('user_rejected_items')
    .insert({
      user_id: userId,
      item_id: itemId,
    })

  if (error) {
    throw new Error(error.message)
  }
}

// Swiped items functions
export async function getUserSwipedItems(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_swiped_items')
    .select('item_id')
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }

  return data?.map(item => item.item_id) || []
}

export async function addSwipedItem(userId: string, itemId: string) {
  const { error } = await supabase
    .from('user_swiped_items')
    .insert({
      user_id: userId,
      item_id: itemId,
    })

  if (error) {
    throw new Error(error.message)
  }
}

