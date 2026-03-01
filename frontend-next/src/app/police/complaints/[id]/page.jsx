'use client';
import { PoliceGuard } from '@/components/AuthGuard';
import ComplaintDetailPage from '@/pages/police/ComplaintDetailPage';

export default function Page() {
  return <PoliceGuard><ComplaintDetailPage /></PoliceGuard>;
}
