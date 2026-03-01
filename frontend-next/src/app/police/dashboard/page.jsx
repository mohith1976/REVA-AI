'use client';
import { PoliceGuard } from '@/components/AuthGuard';
import PoliceDashboard from '@/pages/police/PoliceDashboard';

export default function Page() {
  return <PoliceGuard><PoliceDashboard /></PoliceGuard>;
}
