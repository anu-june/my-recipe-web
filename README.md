# Recipe Collection Web App

A modern, elegant recipe management application built with Next.js, featuring AI-powered recipe import, beautiful design, and seamless organization.

## 🌟 Features

### Core Functionality
- **Recipe Management**: Create, edit, delete, view, and organize your personal recipe collection
- **AI Recipe Import**: Import recipes from any URL, YouTube video (via transcript), or raw text using Google Gemini 2.0 with smart fallback
- **Smart Organization**: Recipes automatically grouped by category and sorted alphabetically
- **Search**: Quick search across recipe titles and categories
- **Progressive Web App (PWA)**: Install on mobile/desktop, works offline, fast caching
- **Responsive Design**: Beautiful, minimal interface with earth-tone aesthetics

### AI-Powered Import
- Parse recipes from any website URL
- **YouTube Support**: Extracts recipes from video descriptions AND transcripts (captions)
- Extract from raw text, notes, or transcripts
- JSON-LD structured data extraction for accuracy
- Automatic formatting to consistent template
- Source URL tracking

## 🏗️ Architecture

### Tech Stack

**Frontend**
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Fonts**: Playfair Display (serif), Lato (sans-serif), Dancing Script (handwriting)

**Backend**
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini 2.0 Flash (with auto-fallback to Flash Latest)
- **PWA**: @ducanh2912/next-pwa with Workbox
- **Deployment**: Vercel

### Project Structure

```
recipe-web/
├── app/
│   ├── api/
│   │   └── parse-recipe/
│   │       └── route.ts          # AI recipe parsing endpoint
│   ├── components/
│   │   ├── RecipeList.tsx        # Recipe grid with search & grouping
│   │   ├── RecipeImporter.tsx    # AI import UI component
│   │   └── ScrollAwareAddButton.tsx  # Floating action button
│   ├── recipe/[id]/
│   │   └── page.tsx              # Recipe detail view
│   ├── add-recipe/
│   │   └── page.tsx              # Add recipe form
│   ├── edit-recipe/[id]/
│   │   └── page.tsx              # Edit recipe form
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles & Tailwind config
├── lib/
│   ├── supabaseClient.ts         # Supabase configuration
│   ├── types.ts                  # Shared TypeScript types
│   ├── recipeFormatters.ts       # Ingredient/step formatters
│   └── validation.ts             # Form validation utilities
└── public/
    ├── header-bg.png             # Hero section background
    ├── icon.svg                  # PWA app icon (SVG)
    ├── icon-192.png              # PWA icon 192x192
    ├── icon-512.png              # PWA icon 512x512
    └── manifest.json             # PWA manifest

```

## 🗄️ Database Schema

### `recipes` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner ID (references auth.users) |
| `title` | text | Recipe name |
| `slug` | text | URL-friendly identifier |
| `category` | text | Recipe category (Dessert, Main, etc.) |
| `cuisine` | text | Cuisine type (Italian, Indian, etc.) |
| `servings` | text | Serving size |
| `prep_time_minutes` | integer | Preparation time |
| `cook_time_minutes` | integer | Cooking time |
| `total_time_minutes` | integer | Total time (auto-calculated) |
| `ingredients` | text | Formatted ingredient list |
| `steps` | text | Numbered cooking steps |
| `notes` | text | Additional tips and source info |
| `source_url` | text | Original recipe URL |
| `is_published` | boolean | Visibility flag |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

## 🤖 AI Recipe Import

### How It Works

1. **Input Processing**
   - User pastes URL or raw recipe text
   - System detects if input is a URL using regex

2. **Content Extraction**
   - **For URLs**: Fetches HTML with browser-like headers
   - **For YouTube**: Fetches video description AND transcript (captions) using `youtube-transcript` to "listen" to the recipe
   - **JSON-LD Priority**: Searches for `application/ld+json` schema
   - **Fallback**: Strips HTML tags and extracts text content

3. **AI Parsing**
   - Sends content to Gemini 2.0 Flash
   - **Smart Fallback**: If 2.0 hits a rate limit (429), automatically retries with `gemini-flash-latest`
   - Uses strict prompt with formatting rules
   - Returns structured JSON with recipe data

4. **Form Auto-Fill**
   - Populates all form fields
   - Generates slug from title
   - Captures source URL automatically

### Formatting Template

**Ingredients**: `Ingredient – quantity` (flat list, marination exception)  
**Steps**: Numbered with repeated quantities  
**Notes**: Tips + Source URL  
**Units**: Standardized (cups, tbsp, tsp, grams, ml) with automatic mL to cups conversion

## 🎨 Design System

### Color Palette
- **Sage Green**: Primary color (#8B9A7E family)
- **Terracotta**: Accent color (#C97B63 family)
- **Earth Tones**: Warm, minimal aesthetic

### Typography
- **Headings**: Playfair Display (serif)
- **Body**: Lato (sans-serif)
- **Decorative**: Dancing Script (handwriting)

### Layout Principles
- Elegant minimal design
- 3-column responsive grid (large screens)
- Generous whitespace
- Subtle hover effects and transitions

## 🚀 Getting Started

### Prerequisites
- Node.js 18 LTS
- npm or yarn
- Supabase account
- Google Gemini API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/anu-june/my-recipe-web.git
cd recipe-web
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

4. **Run development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Database Setup

Run this SQL in your Supabase SQL editor:

```sql
create table recipes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  title text not null,
  slug text unique not null,
  category text,
  cuisine text,
  servings text,
  prep_time_minutes integer,
  cook_time_minutes integer,
  total_time_minutes integer,
  ingredients text not null,
  steps text not null,
  notes text,
  source_url text,
  is_published boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table recipes enable row level security;

-- Create policies
-- 1. Allow public read access
create policy "Public recipes are viewable by everyone" on recipes for select using (true);

-- 2. Allow authenticated users to insert their own recipes
create policy "Users can insert their own recipes" on recipes for insert with check (auth.uid() = user_id);

-- 3. Allow users to update/delete only their own recipes
create policy "Users can update own recipes" on recipes for update using (auth.uid() = user_id);
create policy "Users can delete own recipes" on recipes for delete using (auth.uid() = user_id);
```

### Security Features
- **Row Level Security (RLS)**: Enforced on the database level.
- **User Ownership**: Recipes are linked to `auth.users`.
- **Protected Actions**: Only the owner can edit or delete their recipes.

## 📱 Progressive Web App (PWA)

### Installation

**Desktop (Chrome/Edge)**
- Look for the install icon in the address bar
- Click "Install Recipe Collection"

**Mobile - Android (Chrome)**
- Tap the menu (⋮) → "Install App" or "Add to Home Screen"
- Or wait for the automatic install banner

**Mobile - iOS (Safari)**
- Tap the Share button → "Add to Home Screen"

### Offline Functionality
- **Caching Strategy**: 
  - Images cached for 7 days
  - API responses cached for 5 minutes (NetworkFirst)
  - Previously visited pages work offline
- **Service Worker**: Auto-generated, disabled in development mode

### Build Considerations
- Production builds require `--webpack` flag (configured in `package.json`)
- PWA not active in development (`npm run dev`)
- Icons: SVG with PNG fallbacks for compatibility

## 📦 Deployment

### Vercel Deployment

1. **Connect repository to Vercel**
2. **Add environment variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
3. **Deploy**: Automatic on push to `main`

### Build Command
```bash
npm run build  # Uses --webpack flag for PWA compatibility
```

## 🔑 Key Features Explained

### Scroll-Aware Add Button
- Hidden on landing (clean hero)
- Appears when scrolling past header
- Smooth fade-in/out transitions
- Fixed position for easy access

### Recipe Organization
- Grouped by category
- Alphabetically sorted within categories
- "Uncategorized" always last
- Real-time search filtering

### Form Validation
- Client-side validation before submit
- Required fields: title, category, ingredients, steps
- Auto-slug generation from title
- Auto-calculation of total time

## 🛠️ Development

### Shared Utilities

**`lib/types.ts`**: TypeScript interfaces  
**`lib/recipeFormatters.ts`**: Ingredient/step formatting  
**`lib/validation.ts`**: Form validation logic
**`lib/validation.ts`**: Form validation logic

### Maintenance Scripts

**`scripts/`**: Contains utility scripts for database maintenance.
- `fix-recipe-owners.ts`: Migration script to assign ownership of legacy recipes.
- `debug-recipes.ts`: Utility to fetch and debug recipe data.

Run scripts using `tsx`:
```bash
npx tsx scripts/your-script.ts
```

### CI/CD Pipelines

**Database Backup**:
- Automatically runs monthly (cron: `0 0 1 * *`) via GitHub Actions.
- Uses `pg_dump` (Dockerized v17) to backup the Supabase database.
- Artifacts are retained for 90 days.
### Performance Optimizations
- `useMemo` for filtering and grouping
- Dynamic rendering (`revalidate = 0`)
- Optimized image loading
- Minimal re-renders

## 📝 Recipe Template

When importing or adding recipes, follow this format:

**Ingredients**
```
All-purpose flour – 2 cups
Sugar – 1 cup
Eggs – 3
```

**Steps**
```
1. Preheat oven to 350°F
2. Mix 2 cups flour and 1 cup sugar in a bowl
3. Add 3 eggs and beat until smooth
```

## 🤝 Contributing

This is a personal project, but suggestions are welcome!

## 📄 License

MIT License - feel free to use this as a template for your own recipe app.

## 🙏 Acknowledgments

- **Next.js** - React framework
- **Supabase** - Backend and database
- **Google Gemini** - AI recipe parsing
- **Vercel** - Hosting and deployment
- **Tailwind CSS** - Styling framework
