'use client';
import { PoliceGuard } from '@/components/AuthGuard';
import AnalyticsPage from '@/pages/police/AnalyticsPage';

export default function Page() {
  return <PoliceGuard><AnalyticsPage /></PoliceGuard>;
}
