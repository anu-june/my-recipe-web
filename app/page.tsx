import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import RecipeList from './components/RecipeList';
import ScrollAwareAddButton from './components/ScrollAwareAddButton';
import UserMenu from './components/UserMenu';
import type { RecipeListItem } from '@/lib/types';

export const revalidate = 0; // Disable static caching to show new recipes immediately

export default async function Home() {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, category')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  const recipes = (data ?? []) as RecipeListItem[];

  return (
    <main className="min-h-screen bg-sage-50">
      {/* Scroll-Aware Add Recipe Button */}
      <ScrollAwareAddButton />

      {/* Fixed User Menu */}
      <div className="fixed top-6 left-6 z-20">
        <UserMenu />
      </div>

      {/* Hero Section with Background Image */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        <Image
          src="/header-bg.png"
          alt="Recipe Collection Header"
          fill
          priority
          className="object-cover"
          quality={90}
        />
        <div className="absolute inset-0 bg-black/30"></div> {/* Overlay for text readability */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight font-serif drop-shadow-lg mb-4">
            Recipe Collection
          </h1>
          <p className="text-sage-100 text-xl md:text-2xl font-light italic drop-shadow-md">
            Curated with love
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">

        {error && (
          <div className="bg-terracotta-50 border border-terracotta-200 p-4 mb-8 text-center">
            <p className="text-terracotta-800 font-medium">
              {error.message}
            </p>
          </div>
        )}

        <RecipeList initialRecipes={recipes} />
      </div>
    </main>
  );
}
