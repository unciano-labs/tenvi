import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/ui/sonner';
import { GlobalDialog } from '@/components/ui/GlobalDialog';
import { ThemeProvider } from '@/components/theme-provider';
import { PwaRegister } from '@/components/PWA/PwaRegister';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8F9FA' },
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://tenvi.app'),
  title: {
    default: 'Tenvi — Personal Wealth Infrastructure Platform',
    template: '%s | Tenvi',
  },
  description:
    'Tenvi is an all-in-one personal wealth infrastructure platform unifying daily cash flow, credit card intelligence, loan amortization, and real-time asset tracking.',
  keywords: [
    'personal wealth infrastructure',
    'financial ledger',
    'credit card intelligence',
    'loan amortization',
    'property management',
    'vehicle fleet cash flow',
    'financial copilot',
    'tenvi',
  ],
  authors: [{ name: 'Tenvi Labs' }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tenvi',
  },
  openGraph: {
    title: 'Tenvi — Personal Wealth Infrastructure Platform',
    description:
      'Unify daily cash flow, credit card intelligence, loan amortizations, and vehicle/property portfolio management in one clean system.',
    url: 'https://tenvi.app',
    siteName: 'Tenvi',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Tenvi Wealth Infrastructure',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tenvi — Personal Wealth Infrastructure Platform',
    description:
      'Unify daily cash flow, credit card intelligence, loan amortizations, and vehicle/property portfolio management in one clean system.',
    images: ['/icon-512.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans overflow-x-hidden max-w-full", geist.variable)}>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-slate-200 dark:selection:bg-slate-700 overflow-x-hidden max-w-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
          <GlobalDialog />
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}

