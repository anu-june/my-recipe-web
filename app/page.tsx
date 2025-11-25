// app/page.tsx
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

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
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent pb-2">
            My Recipe Book
          </h1>
          <p className="text-gray-600 text-lg mb-6">My favorite recipes</p>
          <Link
            href="/add-recipe"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition-all shadow-md hover:shadow-lg"
          >
            <span className="text-xl">+</span>
            Add New Recipe
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
            <p className="text-red-700">
              <span className="font-semibold">Error:</span> {error.message}
            </p>
          </div>
        )}

        {recipes.length === 0 && !error && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No recipes found yet. Start adding your favorites!</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipe/${recipe.id}`}
              className="group block bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-orange-200 transform hover:-translate-y-1"
            >
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-orange-600 transition-colors">
                  {recipe.title}
                </h2>
                {recipe.category && (
                  <span className="inline-block bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 px-4 py-1 rounded-full text-sm font-medium">
                    {recipe.category}
                  </span>
                )}
              </div>
              <div className="h-1 bg-gradient-to-r from-orange-400 to-amber-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
