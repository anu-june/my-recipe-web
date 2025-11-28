'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { RecipeListItem } from '@/lib/types';

export default function RecipeList({ initialRecipes }: { initialRecipes: RecipeListItem[] }) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredRecipes = useMemo(() => {
        return initialRecipes.filter((recipe) => {
            const query = searchQuery.toLowerCase();
            return (
                recipe.title.toLowerCase().includes(query) ||
                (recipe.category && recipe.category.toLowerCase().includes(query))
            );
        });
    }, [initialRecipes, searchQuery]);

    // Group recipes by category and sort alphabetically within each category
    const groupedRecipes = useMemo(() => {
        const grouped = filteredRecipes.reduce((acc, recipe) => {
            const category = recipe.category || 'Uncategorized';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(recipe);
            return acc;
        }, {} as Record<string, RecipeListItem[]>);

        // Sort recipes alphabetically within each category
        Object.keys(grouped).forEach(category => {
            grouped[category].sort((a, b) => a.title.localeCompare(b.title));
        });

        return grouped;
    }, [filteredRecipes]);

    // Sort categories alphabetically, but keep "Uncategorized" last if it exists
    const sortedCategories = useMemo(() => {
        return Object.keys(groupedRecipes).sort((a, b) => {
            if (a === 'Uncategorized') return 1;
            if (b === 'Uncategorized') return -1;
            return a.localeCompare(b);
        });
    }, [groupedRecipes]);

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative max-w-xs ml-auto">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg
                        className="h-4 w-4 text-sage-400"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>
                <input
                    type="text"
                    placeholder="Search your collection..."
                    className="block w-full pl-10 pr-4 py-3 border-b border-sage-300 bg-transparent text-sage-900 placeholder-sage-400 focus:outline-none focus:border-sage-800 transition-colors font-light"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* No Results Message */}
            {filteredRecipes.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-sage-500 italic font-light">
                        {searchQuery
                            ? `No recipes found matching "${searchQuery}"`
                            : 'No recipes found yet. Start adding your favorites!'}
                    </p>
                </div>
            )}

            {/* Recipe Groups */}
            <div className="space-y-10">
                {sortedCategories.map((category) => (
                    <section key={category}>
                        <h2 className="text-3xl font-bold text-sage-900 mb-4 font-serif border-b border-sage-200 pb-1 inline-block pr-8">
                            {category}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groupedRecipes[category].map((recipe) => (
                                <Link
                                    key={recipe.id}
                                    href={`/recipe/${recipe.id}`}
                                    className="group block bg-white border border-sage-200 hover:border-terracotta-300 hover:shadow-md transition-all duration-300 hover:-translate-y-1"
                                >
                                    <div className="p-5">
                                        <h3 className="text-2xl font-bold text-sage-900 group-hover:text-terracotta-600 transition-colors font-serif">
                                            {recipe.title}
                                        </h3>
                                        {/* Category tag removed from card since it's now in the section header */}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}
