'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface RequireAuthProps {
    children: ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
                <div className="max-w-3xl mx-auto p-6 md:p-10">
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-orange-100">
                        <p className="text-gray-600">Checking authentication...</p>
                    </div>
                </div>
            </main>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    return <>{children}</>;
}
