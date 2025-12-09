'use client';

import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

interface AuthProtectedEditButtonProps {
    recipeId: string;
}

export default function AuthProtectedEditButton({ recipeId }: AuthProtectedEditButtonProps) {
    const { user, loading } = useAuth();

    // Don't show if not logged in
    if (loading || !user) {
        return null;
    }

    return (
        <Link
            href={`/edit-recipe/${recipeId}`}
            className="flex-shrink-0 ml-8 text-sage-400 hover:text-terracotta-500 transition-colors"
            title="Edit Recipe"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
        </Link>
    );
}
