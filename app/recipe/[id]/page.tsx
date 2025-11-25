// app/recipe/[id]/page.tsx
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Recipe = {
    id: string;
    title: string;
    category: string;
    cuisine: string | null;
    servings: number | null;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    total_time_minutes: number | null;
    ingredients: string;
    steps: string;
    notes: string | null;
    source_url: string | null;
};

// Helper function to parse ingredients into table format
function parseIngredientsTable(ingredients: string) {
    const lines = ingredients.trim().split('\n').filter(line => line.trim());

    // Check if it looks like a table format (has " - " separator)
    const hasTableFormat = lines.some(line => line.includes(' - '));

    if (!hasTableFormat) {
        return null;
    }

    const rows = lines.map(line => {
        const parts = line.split(' - ');
        return {
            ingredient: parts[0]?.trim() || '',
            quantity: parts[1]?.trim() || ''
        };
    });

    return rows;
}

// Helper function to parse steps into structured format
function parseStepsTable(steps: string) {
    const lines = steps.trim().split('\n').filter(line => line.trim());

    // Check if steps are numbered
    const hasNumberedFormat = lines.some(line => /^\d+[\.):\s]/.test(line.trim()));

    if (!hasNumberedFormat) {
        return null;
    }

    const rows = lines.map(line => {
        const trimmedLine = line.trim();
        // Match patterns like "1. ", "1) ", "1: ", or just "1 "
        const match = trimmedLine.match(/^(\d+)[\.):\s]+(.+)$/);
        if (match) {
            return {
                number: match[1],
                instruction: match[2].trim()
            };
        }
        return null;
    }).filter(row => row !== null);

    return rows.length > 0 ? rows : null;
}

export default async function RecipePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();

    const recipe = data as Recipe | null;

    if (error || !recipe) {
        return (
            <main className="min-h-screen bg-white text-gray-900">
                <div className="max-w-3xl mx-auto p-10">
                    <p className="text-xl text-gray-600 mb-4">Recipe not found</p>
                    <Link href="/" className="text-blue-600 hover:underline">
                        ← Back to recipes
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
            <div className="max-w-4xl mx-auto p-6 md:p-10">
                {/* Back Button */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium mb-6 group"
                >
                    <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
                    Back to recipes
                </Link>

                {/* Recipe Header */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border border-orange-100">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent pb-2">
                        {recipe.title}
                    </h1>

                    <div className="flex flex-wrap gap-2 mb-6">
                        <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md">
                            {recipe.category}
                        </span>
                        {recipe.cuisine && (
                            <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md">
                                {recipe.cuisine}
                            </span>
                        )}
                    </div>

                    {/* Recipe Info Grid */}
                    {(recipe.servings || recipe.prep_time_minutes || recipe.cook_time_minutes || recipe.total_time_minutes) && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {recipe.servings && (
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                    <div className="text-xs text-blue-600 uppercase font-semibold mb-1">🍽️ Servings</div>
                                    <div className="text-2xl font-bold text-blue-700">{recipe.servings}</div>
                                </div>
                            )}
                            {recipe.prep_time_minutes && (
                                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                                    <div className="text-xs text-green-600 uppercase font-semibold mb-1">⏱️ Prep</div>
                                    <div className="text-2xl font-bold text-green-700">{recipe.prep_time_minutes}m</div>
                                </div>
                            )}
                            {recipe.cook_time_minutes && (
                                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
                                    <div className="text-xs text-orange-600 uppercase font-semibold mb-1">🔥 Cook</div>
                                    <div className="text-2xl font-bold text-orange-700">{recipe.cook_time_minutes}m</div>
                                </div>
                            )}
                            {recipe.total_time_minutes && (
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                                    <div className="text-xs text-purple-600 uppercase font-semibold mb-1">⏰ Total</div>
                                    <div className="text-2xl font-bold text-purple-700">{recipe.total_time_minutes}m</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Ingredients Section */}
                <section className="mb-6">
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
                        <h2 className="text-3xl font-bold mb-4 text-green-700 flex items-center gap-2">
                            🥗 Ingredients
                        </h2>
                        {recipe.ingredients ? (() => {
                            const tableData = parseIngredientsTable(recipe.ingredients);

                            if (tableData) {
                                return (
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="border-b-2 border-green-200">
                                                <th className="text-left py-3 px-4 font-semibold text-green-800 bg-green-50">Ingredient</th>
                                                <th className="text-left py-3 px-4 font-semibold text-green-800 bg-green-50">Quantity</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tableData.map((row, index) => (
                                                <tr key={index} className="border-b border-gray-200 hover:bg-green-50 transition-colors">
                                                    <td className="py-3 px-4 text-gray-700">{row.ingredient}</td>
                                                    <td className="py-3 px-4 text-gray-700">{row.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                );
                            } else {
                                return (
                                    <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-gray-700">
                                        {recipe.ingredients}
                                    </pre>
                                );
                            }
                        })() : (
                            <p className="text-gray-500 italic">No ingredients listed</p>
                        )}
                    </div>
                </section>

                {/* Steps Section */}
                <section className="mb-6">
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
                        <h2 className="text-3xl font-bold mb-4 text-blue-700 flex items-center gap-2">
                            👨‍🍳 Steps
                        </h2>
                        {recipe.steps ? (() => {
                            const tableData = parseStepsTable(recipe.steps);

                            if (tableData) {
                                return (
                                    <div className="space-y-4">
                                        {tableData.map((row, index) => (
                                            <div key={index} className="flex gap-4 p-3 rounded-lg hover:bg-blue-50 transition-colors">
                                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                                    {row.number}
                                                </div>
                                                <div className="flex-1 text-gray-700 pt-1">
                                                    {row.instruction}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            } else {
                                return (
                                    <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-gray-700">
                                        {recipe.steps}
                                    </pre>
                                );
                            }
                        })() : (
                            <p className="text-gray-500 italic">No steps listed</p>
                        )}
                    </div>
                </section>

                {/* Notes Section */}
                {recipe.notes && (
                    <section className="mb-6">
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-yellow-100">
                            <h2 className="text-3xl font-bold mb-4 text-yellow-700 flex items-center gap-2">
                                📝 Notes
                            </h2>
                            <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-gray-700">
                                {recipe.notes}
                            </pre>
                        </div>
                    </section>
                )}

                {/* Source Section */}
                {recipe.source_url && (
                    <section>
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-indigo-100">
                            <h2 className="text-3xl font-bold mb-4 text-indigo-700 flex items-center gap-2">
                                🔗 Source
                            </h2>
                            <a
                                href={recipe.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-700 underline break-all font-medium"
                            >
                                {recipe.source_url}
                            </a>
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
