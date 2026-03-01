'use client';
import { CitizenGuard } from '@/components/AuthGuard';
import ComplaintPage from '@/pages/citizen/ComplaintPage';

export default function Page() {
  return <CitizenGuard><ComplaintPage /></CitizenGuard>;
}
