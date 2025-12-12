# Database Setup for SmartSwipe

## Supabase Setup

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Run the Schema**
   - Open your Supabase project dashboard
   - Go to SQL Editor
   - Copy and paste the contents of `schema.sql`
   - Run the SQL script

3. **Configure Environment Variables**
   - Add these to your `frontend/.env`:

   SUPABASE_URL=your-project-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   JWT_SECRET=your-random-secret-key-change-this
   ```

## Database Schema

The schema includes:
- **users**: User accounts with email and bcrypt-hashed passwords
- **user_wishlist**: Liked items per user
- **user_rejected_items**: Disliked items per user
- **user_swiped_items**: Items the user has seen


