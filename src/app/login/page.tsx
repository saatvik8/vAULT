import type { Metadata } from 'next';
import { LoginPage } from '@/client/views/Login';

export const metadata: Metadata = { title: 'Log in' };

export default function Page() {
  return <LoginPage />;
}
