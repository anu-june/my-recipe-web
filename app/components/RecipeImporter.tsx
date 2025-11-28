'use client';

import { useState } from 'react';

type ParsedRecipe = {
    title: string;
    category: string | null;
    cuisine: string | null;
    servings: string | null;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    total_time_minutes?: number | null;
    ingredients: string;
    steps: string;
    notes: string | null;
};

type RecipeImporterProps = {
    onRecipeParsed: (recipe: ParsedRecipe, sourceUrl?: string) => void;
};

export default function RecipeImporter({ onRecipeParsed }: RecipeImporterProps) {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleParse = async () => {
        if (!input.trim()) {
            setError('Please enter a URL or paste recipe text');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/parse-recipe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: input.trim() }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to parse recipe');
            }

            // Successfully parsed - pass data to parent
            const sourceUrl = input.trim().match(/^(https?:\/\/[^\s]+)/) ? input.trim() : undefined;
            onRecipeParsed(data.recipe, sourceUrl);
            setInput(''); // Clear input on success
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse recipe');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-sage-50 border border-sage-300 p-6 rounded-sm mb-8">
            <h3 className="text-xl font-bold text-sage-900 mb-2">✨ Import Recipe</h3>
            <p className="text-sage-600 text-sm mb-4">
                Paste a recipe URL or the full recipe text below, and we'll extract all the details for you.
            </p>

            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste recipe URL (e.g., https://www.allrecipes.com/...) 
or paste full recipe text including ingredients and steps"
                className="w-full p-3 border border-sage-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-sage-500 min-h-[120px] font-mono text-sm"
                disabled={loading}
            />

            {error && (
                <div className="mt-3 p-3 bg-terracotta-50 border border-terracotta-300 rounded-sm">
                    <p className="text-terracotta-800 text-sm">{error}</p>
                </div>
            )}

            <button
                onClick={handleParse}
                disabled={loading || !input.trim()}
                className="mt-4 bg-sage-600 text-white px-6 py-2.5 rounded-sm font-medium hover:bg-sage-700 disabled:bg-sage-300 disabled:cursor-not-allowed transition-colors"
            >
                {loading ? (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Parsing Recipe...
                    </span>
                ) : (
                    '🤖 Parse Recipe with AI'
                )}
            </button>
        </div>
    );
}
