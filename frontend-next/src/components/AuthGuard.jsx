'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Shield } from 'lucide-react';

export function CitizenGuard({ children }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    if (loading) return null;
    if (!user) return null;
    return children;
}

export function PoliceGuard({ children }) {
    const { policeUser, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !policeUser) router.replace('/police/login');
    }, [policeUser, loading, router]);

    if (loading) return null;
    if (!policeUser) return null;
    return children;
}
