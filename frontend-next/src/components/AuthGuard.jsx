'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function LoadingScreen() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
            <div className="text-center">
                <div className="w-12 h-12 border-3 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400 font-sans">Loading REVA AI...</p>
            </div>
        </div>
    );
}

export function CitizenGuard({ children }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    if (loading) return <LoadingScreen />;
    if (!user) return null;
    return children;
}

export function PoliceGuard({ children }) {
    const { policeUser, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !policeUser) {
            router.replace('/police/login');
        }
    }, [policeUser, loading, router]);

    if (loading) return <LoadingScreen />;
    if (!policeUser) return null;
    return children;
}
