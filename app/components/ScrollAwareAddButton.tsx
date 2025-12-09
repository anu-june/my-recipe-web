'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';

export default function ScrollAwareAddButton() {
    const { user, loading } = useAuth();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            // Show button after scrolling past hero section (approx 320px on desktop)
            setIsVisible(window.scrollY > 300);
        };

        // Listen to scroll events
        window.addEventListener('scroll', handleScroll);

        // Cleanup
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Don't show if not logged in or still loading
    if (loading || !user) {
        return null;
    }

    return (
        <Link
            href="/add-recipe"
            className={`fixed top-6 right-6 z-20 bg-terracotta-500 text-white px-5 py-2.5 rounded-sm font-medium hover:bg-terracotta-600 transition-all text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
                }`}
        >
            + Add Recipe
        </Link>
    );
}

