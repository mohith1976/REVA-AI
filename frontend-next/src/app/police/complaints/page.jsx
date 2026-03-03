'use client';
import { PoliceGuard } from '@/components/AuthGuard';
import ComplaintsListPage from '@/pages/police/ComplaintsListPage';

export default function Page() {
  return <PoliceGuard><ComplaintsListPage /></PoliceGuard>;
}
