// app/recipe/[id]/page.tsx
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Recipe = {
    id: string;
    title: string;
    category: string;
    cuisine: string | null;
    servings: string | null;
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

    // Patterns that indicate a section header (not a numbered step)
    // Catches: "To make...", "To whip...", "To assemble", "For the...", etc.
    // But NOT long sentences like "Serve warm or refrigerate for 2 hours..."
    const headerPatterns = /^(to \w+|for the|for making|making the|prepare the|preparing|assembly|finishing|decoration|garnish|serve|serving|notes?:)/i;

    // Headers are typically short titles (under 40 chars), not full sentences
    const MAX_HEADER_LENGTH = 40;

    const rows = lines.map(line => {
        const trimmedLine = line.trim();

        // First, try to extract text after number prefix
        const match = trimmedLine.match(/^(\d+)[\.):\s]+(.+)$/);
        const textContent = match ? match[2].trim() : trimmedLine;

        // Check if this line is a section header:
        // 1. Must match header pattern
        // 2. Must be SHORT (headers are titles, not sentences)
        const isShortEnough = textContent.length <= MAX_HEADER_LENGTH;
        if (headerPatterns.test(textContent) && isShortEnough) {
            return {
                isHeader: true,
                number: '',
                instruction: textContent
            };
        }

        // Regular numbered step
        if (match) {
            return {
                isHeader: false,
                number: match[1],
                instruction: match[2].trim()
            };
        }
        return null;
    }).filter(row => row !== null);

    return rows.length > 0 ? rows : null;
}

// Force dynamic rendering and disable caching to always show fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
        <main className="min-h-screen bg-sage-50 text-sage-800">
            <div className="max-w-4xl mx-auto p-6 md:p-12">
                {/* Back Button */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sage-500 hover:text-sage-800 font-medium mb-12 tracking-wide uppercase text-xs transition-colors"
                >
                    ← Back to Collection
                </Link>

                {/* Recipe Header */}
                <div className="mb-16 border-b border-sage-200 pb-12">
                    <div className="flex items-start justify-between mb-6">
                        <h1 className="text-5xl md:text-6xl font-bold text-sage-900 font-serif leading-tight">
                            {recipe.title}
                        </h1>
                        <Link
                            href={`/edit-recipe/${recipe.id}`}
                            className="flex-shrink-0 ml-8 text-sage-400 hover:text-terracotta-500 transition-colors"
                            title="Edit Recipe"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                        </Link>
                    </div>

                    <div className="flex flex-wrap gap-4 mb-8">
                        <span className="text-sage-600 text-sm tracking-widest uppercase border border-sage-200 px-3 py-1">
                            {recipe.category}
                        </span>
                        {recipe.cuisine && (
                            <span className="text-sage-600 text-sm tracking-widest uppercase border border-sage-200 px-3 py-1">
                                {recipe.cuisine}
                            </span>
                        )}
                    </div>

                    {/* Recipe Info Grid */}
                    {(recipe.servings || recipe.prep_time_minutes || recipe.cook_time_minutes || recipe.total_time_minutes) && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-sage-100">
                            {recipe.servings && (
                                <div>
                                    <div className="text-xs text-sage-500 uppercase tracking-widest mb-1">Servings</div>
                                    <div className="text-xl font-serif text-sage-800">{recipe.servings}</div>
                                </div>
                            )}
                            {recipe.prep_time_minutes && (
                                <div>
                                    <div className="text-xs text-sage-500 uppercase tracking-widest mb-1">Prep Time</div>
                                    <div className="text-xl font-serif text-sage-800">{recipe.prep_time_minutes}m</div>
                                </div>
                            )}
                            {recipe.cook_time_minutes && (
                                <div>
                                    <div className="text-xs text-sage-500 uppercase tracking-widest mb-1">Cook Time</div>
                                    <div className="text-xl font-serif text-sage-800">{recipe.cook_time_minutes}m</div>
                                </div>
                            )}
                            {recipe.total_time_minutes && (
                                <div>
                                    <div className="text-xs text-sage-500 uppercase tracking-widest mb-1">Total Time</div>
                                    <div className="text-xl font-serif text-sage-800">{recipe.total_time_minutes}m</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid md:grid-cols-12 gap-12">
                    {/* Ingredients Section */}
                    <div className="md:col-span-4">
                        <h2 className="text-2xl font-bold mb-6 text-sage-900 font-serif border-b border-sage-200 pb-2">
                            Ingredients
                        </h2>
                        {recipe.ingredients ? (() => {
                            const lines = recipe.ingredients.trim().split('\n').filter(line => line.trim());

                            // Regex to detect quantity patterns at end of line
                            // Matches: numbers, fractions, units (g, ml, cup, tsp, tbsp, oz, lb, etc.), or words like "Pinch", "to taste"
                            const quantityPattern = /^(.+?)\s+((?:\d+\/\d+|\d+\.?\d*)\s*(?:g|kg|ml|l|L|cup|cups|tsp|tbsp|oz|lb|piece|pieces|cloves?|inch|cm|mm|nos?|small|medium|large|to taste|as needed|optional|handful|bunch|sprig|sprigs|pinch)?(?:\s*\/\s*(?:\d+\/\d+|\d+\.?\d*)\s*(?:g|kg|ml|l|L|cup|cups|tsp|tbsp|oz|lb)?)?|pinch|to taste|as needed|optional|a few|handful|bunch)$/i;

                            // Check if we should use table format:
                            // Either has " - " separator OR has detectable quantity patterns
                            const hasDashFormat = lines.some(line => / [-\u2013\u2014] /.test(line));
                            const hasQuantityFormat = lines.some(line => quantityPattern.test(line.trim()));

                            if (hasDashFormat || hasQuantityFormat) {
                                return (
                                    <table className="w-full text-sage-800 border-collapse table-fixed">
                                        <tbody>
                                            {lines.map((line, index) => {
                                                const trimmedLine = line.trim();
                                                let ingredient = trimmedLine;
                                                let quantity = '';

                                                // First, try dash separator (last occurrence)
                                                const dashPattern = / [-\u2013\u2014] /g;
                                                const dashMatches = [...trimmedLine.matchAll(dashPattern)];

                                                if (dashMatches.length > 0) {
                                                    const lastMatch = dashMatches[dashMatches.length - 1];
                                                    const splitIndex = lastMatch.index!;
                                                    ingredient = trimmedLine.substring(0, splitIndex).trim();
                                                    quantity = trimmedLine.substring(splitIndex + lastMatch[0].length).trim();
                                                } else {
                                                    // Try to extract quantity from end of line using pattern
                                                    const match = trimmedLine.match(quantityPattern);
                                                    if (match) {
                                                        ingredient = match[1].trim();
                                                        quantity = match[2].trim();
                                                    }
                                                }

                                                const isHeader = !quantity && ingredient.length > 0 && !quantityPattern.test(ingredient);

                                                if (isHeader) {
                                                    return (
                                                        <tr key={index}>
                                                            <td colSpan={3} className="pt-4 pb-2 font-serif text-lg font-bold text-sage-900 border-b border-sage-100 first:pt-0">
                                                                {ingredient}
                                                            </td>
                                                        </tr>
                                                    );
                                                }

                                                return (
                                                    <tr key={index} className="align-baseline">
                                                        <td className="py-2 border-b border-sage-100 font-medium pr-2 break-words" style={{ width: '60%' }}>{ingredient}</td>
                                                        <td className="py-2 border-b border-sage-100 text-sage-700 text-right pl-2 break-words" style={{ width: '40%' }}>{quantity}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                );
                            } else {
                                return (
                                    <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-sage-800">
                                        {recipe.ingredients}
                                    </pre>
                                );
                            }
                        })() : (
                            <p className="text-sage-400 italic font-light">No ingredients listed</p>
                        )}
                    </div>

                    {/* Steps Section */}
                    <div className="md:col-span-8">
                        <h2 className="text-2xl font-bold mb-6 text-sage-900 font-serif border-b border-sage-200 pb-2">
                            Instructions
                        </h2>
                        {recipe.steps ? (() => {
                            const tableData = parseStepsTable(recipe.steps);

                            if (tableData) {
                                return (
                                    <div className="space-y-8">
                                        {tableData.map((row, index) => {
                                            // Render section headers differently
                                            if (row.isHeader) {
                                                return (
                                                    <div key={index} className="pt-4 first:pt-0">
                                                        <h3 className="text-xl font-bold text-sage-900 font-serif border-b border-sage-200 pb-2 mb-4">
                                                            {row.instruction}
                                                        </h3>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={index} className="flex gap-6 group">
                                                    <div className="flex-shrink-0 font-serif text-4xl text-terracotta-300 group-hover:text-terracotta-400 transition-colors">
                                                        {row.number}
                                                    </div>
                                                    <div className="flex-1 text-sage-800 leading-relaxed pt-2 text-lg">
                                                        {row.instruction}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            } else {
                                return (
                                    <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-sage-800">
                                        {recipe.steps}
                                    </pre>
                                );
                            }
                        })() : (
                            <p className="text-sage-400 italic font-light">No steps listed</p>
                        )}
                    </div>
                </div>

                {/* Notes Section */}
                {recipe.notes && (
                    <section className="mt-16 pt-8 border-t border-sage-200">
                        <h2 className="text-xl font-bold mb-4 text-sage-900 font-serif">
                            Notes
                        </h2>
                        <div className="bg-sage-100 p-6 italic text-sage-700 font-serif">
                            <pre className="whitespace-pre-wrap font-serif text-base leading-relaxed">
                                {recipe.notes}
                            </pre>
                        </div>
                    </section>
                )}

                {/* Source Section */}
                {recipe.source_url && (
                    <section className="mt-8">
                        <p className="text-sage-400 text-sm">
                            Source: <a
                                href={recipe.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-terracotta-500 hover:text-terracotta-700 underline transition-colors"
                            >
                                {recipe.source_url}
                            </a>
                        </p>
                    </section>
                )}
            </div>
        </main>
    );
}
