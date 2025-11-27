// app/page.tsx
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import RecipeList from './components/RecipeList';

type Recipe = {
  id: string;
  title: string;
  category: string | null;
};

export default async function Home() {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, category')
    .eq('is_published', true)
    .order('created_at', { ascending: false });


  const recipes = (data ?? []) as Recipe[];

  return (
    <main className="min-h-screen bg-sage-50">
      {/* Hero Section with Background Image */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/header-bg.png')" }}
        ></div>
        <div className="absolute inset-0 bg-black/30"></div> {/* Overlay for text readability */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight font-serif drop-shadow-lg mb-4">
            Recipe Collection
          </h1>
          <p className="text-sage-100 text-xl md:text-2xl font-light italic drop-shadow-md">
            Curated with love
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Action Bar */}
        <div className="flex justify-center mb-12">
          <Link
            href="/add-recipe"
            className="inline-block bg-terracotta-500 text-white px-8 py-3 rounded-none font-medium hover:bg-terracotta-600 transition-all tracking-wide uppercase text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            Add New Recipe
          </Link>
        </div>

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
