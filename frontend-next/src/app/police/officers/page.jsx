'use client';
import { PoliceGuard } from '@/components/AuthGuard';
import OfficersPage from '@/pages/police/OfficersPage';

export default function Page() {
  return <PoliceGuard><OfficersPage /></PoliceGuard>;
}
