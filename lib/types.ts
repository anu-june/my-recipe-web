// Shared type definitions for the recipe application

export type Recipe = {
    id: string;
    title: string;
    slug: string;
    category: string;
    cuisine: string | null;
    servings: string | null;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    total_time_minutes: number | null;
    ingredients: string;
    steps: string;
    notes: string | null;
    /** Source of the recipe (URL or text like "Mom's Recipe") */
    source_url: string | null;
    is_published: boolean;
    user_id?: string;
    created_at?: string;
};

// For list views that don't need all fields
export type RecipeListItem = {
    id: string;
    title: string;
    category: string | null;
};

// For recipe detail view
export type RecipeDetail = Omit<Recipe, 'slug' | 'is_published' | 'created_at'>;

// For AI parsed recipe response
export type ParsedRecipe = {
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
    source_url?: string | null;
};
