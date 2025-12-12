# SmartSwipe

A modern fashion discovery app that uses AI-powered recommendations and outfit generation. Swipe through fashion items, build your wishlist, and get personalized outfit combinations powered by computer vision and LLM technology.

## Features

- **User Authentication**: Secure login/signup with JWT tokens and bcrypt password hashing
- **Smart Recommendations**: AI-powered recommendations based on visual similarity using MobileNetV2 embeddings
- **Swipe Interface**: Tinder-like interface for browsing fashion items by category
- **Wishlist**: Save your favorite items to your personal wishlist (synced across devices)
- **AI Outfit Generator**: Generate coordinated outfits from your liked items using Groq's Llama model
- **Modern UI**: Beautiful, responsive interface with dark mode support
- **Real-time Updates**: Recommendations update in real-time as you like or reject items
- **Database Persistence**: All user data stored in Supabase (wishlist, rejected items, swiped items)

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Radix UI** - Accessible component primitives
- **shadcn/ui** - High-quality component library

### Backend & AI
- **MobileNetV2** - Pre-trained CNN for image feature extraction
- **TensorFlow/Keras** - Deep learning framework
- **Groq API** - Fast LLM inference for outfit generation (Llama 3.3 70B)
- **Cosine Similarity** - Vector similarity for recommendations

### Database & Auth
- **Supabase** - PostgreSQL database for user data
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **Next.js API Routes** - Server-side endpoints with authentication

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+ (for generating embeddings)
- Groq API key (for outfit generation)

### 1. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 2. Generate Image Embeddings

First, install Python dependencies:

```bash
cd backend
pip install -r requirements-features.txt
```

Then generate image feature vectors:

```bash
python extract-image-features.py
```

This will process all images in `dataset/dataset_clothing_images/` and generate `dataset/image_features.json` containing 1280-dimensional feature vectors for each image.

### 3. Set Up Supabase Database

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `database/schema.sql` in your Supabase SQL editor
3. Get your Supabase URL and Service Role Key from project settings

### 4. Configure Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
GROQ_API_KEY=your_groq_api_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret_key_change_in_production
```

### 5. Run the Development Server

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Note:** You'll be redirected to the login page. Create an account or login to access the app.

## How It Works

### Authentication & Data Storage

1. Users must create an account or login to access the app
2. All user data (wishlist, rejected items, swiped items) is stored in Supabase
3. JWT tokens are used for authenticated API requests
4. Data persists across devices and browser sessions

### Image Embeddings

The system uses **MobileNetV2** (pre-trained on ImageNet) to extract visual features from fashion item images. These embeddings are:

- **Created by the project** - Generated specifically for your dataset
- **1280-dimensional vectors** - Capturing visual patterns and styles
- **Used for similarity** - Cosine similarity between vectors finds visually similar items

### Recommendation System

1. When you like items, their embeddings are extracted
2. The system calculates cosine similarity between liked items and all available items
3. Items similar to your likes are ranked higher
4. Items similar to your rejections are penalized
5. Recommendations update in real-time as you interact

### Outfit Generation

1. Your liked items are sent to Groq's Llama 3.3 70B model
2. The AI analyzes item categories and creates coordinated outfits
3. Returns 2-5 items that work well together
4. Each generation varies due to high temperature (0.9) setting

## API Endpoints

### Public Endpoints
- `GET /api/items` - Get all fashion items
- `GET /api/images/[...id]` - Serve item images
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login

### Protected Endpoints (Require JWT Token)
- `POST /api/recommend` - Get personalized recommendations
- `POST /api/generate-outfit` - Generate AI outfit
- `GET /api/user/wishlist` - Get user's wishlist
- `POST /api/user/wishlist` - Add to wishlist
- `DELETE /api/user/wishlist` - Remove from wishlist
- `GET /api/user/rejected` - Get rejected items
- `POST /api/user/rejected` - Add rejected item
- `GET /api/user/swiped` - Get swiped items
- `POST /api/user/swiped` - Add swiped item

## Troubleshooting

### Authentication Issues
- Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env`
- Verify `JWT_SECRET` is configured
- Check that the database schema has been created in Supabase

### Embeddings Not Found
If recommendations aren't working, ensure `dataset/image_features.json` exists. Run the feature extraction script.

### Groq API Errors
- Verify your `GROQ_API_KEY` is set in `.env`
- Check your API quota at [console.groq.com](https://console.groq.com)
- The outfit generator will fallback to random selection if the API fails

### Image Loading Issues
- Ensure images exist in `dataset/dataset_clothing_images/`
- Check image file permissions
- Verify image IDs match the format: `category/uuid`

### Database Connection Issues
- Verify Supabase credentials in `.env`
- Check that the database schema is properly set up
- Ensure the Service Role Key has proper permissions

