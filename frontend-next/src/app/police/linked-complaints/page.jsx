'use client';
import { PoliceGuard } from '@/components/AuthGuard';
import LinkedComplaintsPage from '@/pages/police/LinkedComplaintsPage';

export default function Page() {
  return <PoliceGuard><LinkedComplaintsPage /></PoliceGuard>;
}
