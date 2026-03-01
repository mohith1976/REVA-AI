'use client';
import { CitizenGuard } from '@/components/AuthGuard';
import MyComplaintsPage from '@/pages/citizen/MyComplaintsPage';

export default function Page() {
  return <CitizenGuard><MyComplaintsPage /></CitizenGuard>;
}
