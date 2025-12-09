'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatIngredients, formatSteps } from '@/lib/recipeFormatters';
import { validateRecipe, ValidationErrors } from '@/lib/validation';
import RecipeImporter from '../components/RecipeImporter';
import RequireAuth from '../components/RequireAuth';
import type { ParsedRecipe } from '@/lib/types';

function AddRecipeContent() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        category: '',
        cuisine: '',
        servings: '',
        prep_time_minutes: '',
        cook_time_minutes: '',
        total_time_minutes: '',
        ingredients: '',
        steps: '',
        notes: '',
        source_url: '',
        is_published: true
    });

    // Formatters are now imported from shared utilities

    const handleRecipeParsed = (recipe: ParsedRecipe, sourceUrl?: string) => {
        setFormData(prev => ({
            ...prev,
            title: recipe.title || '',
            category: recipe.category || '',
            cuisine: recipe.cuisine || '',
            servings: recipe.servings || '',
            prep_time_minutes: recipe.prep_time_minutes?.toString() || '',
            cook_time_minutes: recipe.cook_time_minutes?.toString() || '',
            total_time_minutes: recipe.total_time_minutes?.toString() || '',
            ingredients: recipe.ingredients || '',
            steps: recipe.steps || '',
            notes: recipe.notes || '',
            source_url: sourceUrl || recipe.source_url || prev.source_url,
            // Generate slug from title immediately
            slug: recipe.title ? recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : ''
        }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => {
            const updated = {
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            };

            // Auto-calculate total time when prep or cook time changes
            if (name === 'prep_time_minutes' || name === 'cook_time_minutes') {
                const prepTime = name === 'prep_time_minutes' ? parseInt(value) || 0 : parseInt(updated.prep_time_minutes) || 0;
                const cookTime = name === 'cook_time_minutes' ? parseInt(value) || 0 : parseInt(updated.cook_time_minutes) || 0;
                updated.total_time_minutes = (prepTime + cookTime).toString();
            }

            return updated;
        });

        // Auto-generate slug from title
        if (name === 'title') {
            const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            setFormData(prev => ({ ...prev, slug }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setValidationErrors({});

        // Validate form
        const validation = validateRecipe({
            title: formData.title,
            category: formData.category,
            cuisine: formData.cuisine,
            servings: formData.servings,
            prep_time_minutes: parseInt(formData.prep_time_minutes) || null,
            cook_time_minutes: parseInt(formData.cook_time_minutes) || null,
            total_time_minutes: parseInt(formData.total_time_minutes) || null,
            ingredients: formData.ingredients,
            steps: formData.steps
        });

        if (!validation.isValid) {
            setValidationErrors(validation.errors);
            setError('Please fix the errors below');
            setLoading(false);
            return;
        }
        setError('');

        try {
            // Format ingredients and steps before saving
            const formattedIngredients = formatIngredients(formData.ingredients);
            const formattedSteps = formatSteps(formData.steps);

            const { data, error } = await supabase
                .from('recipes')
                .insert([{
                    title: formData.title,
                    slug: formData.slug,
                    category: formData.category,
                    cuisine: formData.cuisine || null,
                    servings: formData.servings || null,
                    prep_time_minutes: formData.prep_time_minutes ? parseInt(formData.prep_time_minutes) : null,
                    cook_time_minutes: formData.cook_time_minutes ? parseInt(formData.cook_time_minutes) : null,
                    total_time_minutes: formData.total_time_minutes ? parseInt(formData.total_time_minutes) : null,
                    ingredients: formattedIngredients,
                    steps: formattedSteps,
                    notes: formData.notes || null,
                    source_url: formData.source_url || null,
                    is_published: formData.is_published
                }])
                .select();

            if (error) throw error;

            // Redirect to homepage on success
            router.push('/');
        } catch (err: any) {
            setError(err.message || 'Failed to add recipe');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
            <div className="max-w-3xl mx-auto p-6 md:p-10">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium mb-6 group"
                >
                    <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
                    Back to recipes
                </Link>

                <div className="bg-white rounded-2xl shadow-xl p-8 border border-orange-100">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent pb-2">
                        Add New Recipe
                    </h1>
                    <p className="text-gray-600 mb-8">Fill in the details to add a new recipe to your collection</p>

                    {/* AI Recipe Importer */}
                    <RecipeImporter onRecipeParsed={handleRecipeParsed} />

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
                            <p className="text-red-700">
                                <span className="font-semibold">Error:</span> {error}
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Title */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                                Recipe Title *
                            </label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                required
                                value={formData.title}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="e.g., Chicken Fried Rice"
                            />
                        </div>

                        {/* Category and Cuisine */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Category *
                                </label>
                                <input
                                    type="text"
                                    id="category"
                                    name="category"
                                    required
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="e.g., Main, Dessert"
                                />
                            </div>
                            <div>
                                <label htmlFor="cuisine" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Cuisine
                                </label>
                                <input
                                    type="text"
                                    id="cuisine"
                                    name="cuisine"
                                    value={formData.cuisine}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="e.g., Chinese, Italian"
                                />
                            </div>
                        </div>

                        {/* Servings and Times */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label htmlFor="servings" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Servings
                                </label>
                                <input
                                    type="text"
                                    id="servings"
                                    name="servings"
                                    value={formData.servings}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="4-6 servings"
                                />
                            </div>
                            <div>
                                <label htmlFor="prep_time_minutes" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Prep (min)
                                </label>
                                <input
                                    type="number"
                                    id="prep_time_minutes"
                                    name="prep_time_minutes"
                                    value={formData.prep_time_minutes}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="15"
                                />
                            </div>
                            <div>
                                <label htmlFor="cook_time_minutes" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Cook (min)
                                </label>
                                <input
                                    type="number"
                                    id="cook_time_minutes"
                                    name="cook_time_minutes"
                                    value={formData.cook_time_minutes}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="20"
                                />
                            </div>
                            <div>
                                <label htmlFor="total_time_minutes" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Total (min) <span className="text-xs font-normal text-gray-500">(auto-calculated)</span>
                                </label>
                                <input
                                    type="number"
                                    id="total_time_minutes"
                                    name="total_time_minutes"
                                    value={formData.total_time_minutes}
                                    readOnly
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                                    placeholder="Auto"
                                />
                            </div>
                        </div>

                        {/* Ingredients */}
                        <div>
                            <label htmlFor="ingredients" className="block text-sm font-semibold text-gray-700 mb-2">
                                Ingredients * <span className="text-xs font-normal text-gray-500">(Format: Ingredient - Quantity, one per line)</span>
                            </label>
                            <textarea
                                id="ingredients"
                                name="ingredients"
                                required
                                value={formData.ingredients}
                                onChange={handleChange}
                                rows={8}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                                placeholder="Rice - 2 cups&#10;Chicken - 1 cup&#10;Eggs - 2"
                            />
                        </div>

                        {/* Steps */}
                        <div>
                            <label htmlFor="steps" className="block text-sm font-semibold text-gray-700 mb-2">
                                Steps * <span className="text-xs font-normal text-gray-500">(Format: 1. Step description, one per line)</span>
                            </label>
                            <textarea
                                id="steps"
                                name="steps"
                                required
                                value={formData.steps}
                                onChange={handleChange}
                                rows={10}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                                placeholder="1. Heat oil in a wok&#10;2. Add ingredients&#10;3. Cook for 5 minutes"
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-2">
                                Notes
                            </label>
                            <textarea
                                id="notes"
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                rows={4}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Any additional tips or notes..."
                            />
                        </div>

                        {/* Source URL */}
                        <div>
                            <label htmlFor="source_url" className="block text-sm font-semibold text-gray-700 mb-2">
                                Source URL
                            </label>
                            <input
                                type="url"
                                id="source_url"
                                name="source_url"
                                value={formData.source_url}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="https://example.com/recipe"
                            />
                        </div>

                        {/* Publish Checkbox */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_published"
                                name="is_published"
                                checked={formData.is_published}
                                onChange={handleChange}
                                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            />
                            <label htmlFor="is_published" className="text-sm font-medium text-gray-700">
                                Publish this recipe (make it visible on the homepage)
                            </label>
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Adding Recipe...' : 'Add Recipe'}
                            </button>
                            <Link
                                href="/"
                                className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:border-gray-400 transition-all text-center"
                            >
                                Cancel
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}

export default function AddRecipePage() {
    return (
        <RequireAuth>
            <AddRecipeContent />
        </RequireAuth>
    );
}

