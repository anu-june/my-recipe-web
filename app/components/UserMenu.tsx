'use client';

import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

export default function UserMenu() {
    const { user, loading, signOut } = useAuth();

    if (loading) {
        return (
            <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse backdrop-blur-sm" />
        );
    }

    if (!user) {
        return (
            <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm text-amber-700 font-medium rounded-lg shadow-md hover:bg-white hover:shadow-lg transition-all text-sm border border-amber-200"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                Login
            </Link>
        );
    }

    return (
        <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md border border-stone-200">
            {user.user_metadata?.avatar_url && (
                <img
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    className="w-8 h-8 rounded-full border border-stone-200"
                />
            )}
            <button
                onClick={() => signOut()}
                className="text-sm text-stone-600 hover:text-red-600 transition-colors font-medium"
            >
                Logout
            </button>
        </div>
    );
}

