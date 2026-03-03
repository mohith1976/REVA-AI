'use client';
import { CitizenGuard } from '@/components/AuthGuard';
import ProfilePage from '@/pages/citizen/ProfilePage';

export default function Page() {
  return <CitizenGuard><ProfilePage /></CitizenGuard>;
}
