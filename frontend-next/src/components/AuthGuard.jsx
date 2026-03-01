'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Shield } from 'lucide-react';

function LoadingScreen() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
            <div className="text-center">
                <div className="w-12 h-12 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400 text-sm font-medium">Loading REVA AI...</p>
            </div>
        </div>
    );
}

export function CitizenGuard({ children }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    if (loading) return <LoadingScreen />;
    if (!user) return null;
    return children;
}

export function PoliceGuard({ children }) {
    const { policeUser, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !policeUser) router.replace('/police/login');
    }, [policeUser, loading, router]);

    if (loading) return <LoadingScreen />;
    if (!policeUser) return null;
    return children;
}
