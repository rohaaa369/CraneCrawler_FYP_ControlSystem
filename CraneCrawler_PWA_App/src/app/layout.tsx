
'use client';
import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

// This metadata is for the static export, but Next.js will handle it.
// export const metadata: Metadata = {
//   title: 'Crane Remote',
//   description: 'Remote control interface for Lampson Crane Crawler',
//   manifest: '/manifest.json',
// };

// export const viewport: Viewport = {
//   themeColor: '#212121',
//   initialScale: 1,
//   width: 'device-width',
//   viewportFit: 'cover'
// }

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }
  }, []);

  return (
    <html lang="en" className="dark">
      <head>
        <title>Crane Remote</title>
        <meta name="description" content="Remote control interface for Lampson Crane Crawler" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="Crane Remote" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Crane Remote" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name='viewport' content='minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, viewport-fit=cover' />
      </head>
      <body className={cn("antialiased", "bg-background text-foreground")} suppressHydrationWarning>
        <div className="h-svh w-svh">
            {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
