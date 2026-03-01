'use client';
import { PoliceGuard } from '@/components/AuthGuard';
import SimpleCaseFile from '@/pages/police/SimpleCaseFile';

export default function Page() {
  return <PoliceGuard><SimpleCaseFile /></PoliceGuard>;
}
