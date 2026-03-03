'use client';
import { PoliceGuard } from '@/components/AuthGuard';
import StationManagement from '@/pages/police/StationManagement';

export default function Page() {
  return <PoliceGuard><StationManagement /></PoliceGuard>;
}
