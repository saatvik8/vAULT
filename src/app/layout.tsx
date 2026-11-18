import type { Metadata, Viewport } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistPixelSquare } from 'geist/font/pixel';
import { GeistSans } from 'geist/font/sans';
import type { ReactNode } from 'react';
import './globals.css';
import { AppShell } from '@/client/components/AppShell';

export const metadata: Metadata = {
  title: { default: 'Today · Vault', template: '%s · Vault' },
  description: 'Vault: AI news, tools and papers in one place.',
};

export const viewport: Viewport = { themeColor: '#0c0c0c' };

// Applies the saved theme before first paint so there is no flash.
const themeScript = `try{var t=localStorage.getItem('vault:theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
