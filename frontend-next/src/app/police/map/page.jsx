'use client';
import dynamic from 'next/dynamic';
import { PoliceGuard } from '@/components/AuthGuard';

const CrimeMap = dynamic(() => import('@/pages/police/CrimeMap'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Loading Map...</p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  return (
    <PoliceGuard>
      <CrimeMap />
    </PoliceGuard>
  );
}
