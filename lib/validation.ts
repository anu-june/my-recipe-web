// Form validation utilities

export type ValidationErrors = Record<string, string>;

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationErrors;
}

/**
 * Validate recipe form data
 */
export function validateRecipe(formData: {
    title?: string;
    category?: string;
    cuisine?: string;
    servings?: string;
    prep_time_minutes?: number | null;
    cook_time_minutes?: number | null;
    total_time_minutes?: number | null;
    ingredients?: string;
    steps?: string;
}): ValidationResult {
    const errors: ValidationErrors = {};

    // Required fields
    if (!formData.title?.trim()) {
        errors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
        errors.title = 'Title must be at least 3 characters';
    }

    if (!formData.category?.trim()) {
        errors.category = 'Category is required';
    }

    if (!formData.ingredients?.trim()) {
        errors.ingredients = 'Ingredients are required';
    }

    if (!formData.steps?.trim()) {
        errors.steps = 'Instructions are required';
    }

    // Numeric validations
    if (formData.prep_time_minutes !== null &&
        formData.prep_time_minutes !== undefined &&
        formData.prep_time_minutes < 0) {
        errors.prep_time_minutes = 'Prep time must be a positive number';
    }

    if (formData.cook_time_minutes !== null &&
        formData.cook_time_minutes !== undefined &&
        formData.cook_time_minutes < 0) {
        errors.cook_time_minutes = 'Cook time must be a positive number';
    }

    // Cuisine validation
    if (formData.cuisine && formData.cuisine.trim().length > 0 && formData.cuisine.trim().length < 2) {
        errors.cuisine = 'Cuisine must be at least 2 characters';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}
