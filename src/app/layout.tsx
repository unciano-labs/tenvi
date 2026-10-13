import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/ui/sonner';
import { GlobalDialog } from '@/components/ui/GlobalDialog';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#0F172A',
};

export const metadata: Metadata = {
  title: 'Tenvi — Personal Wealth Infrastructure Platform',
  description:
    'Tenvi is a next-generation, all-in-one personal wealth infrastructure platform designed to bridge the gap between liquid cash and illiquid assets. Unlike traditional budgeting apps, Tenvi provides a unified digital ledger that simultaneously tracks daily cash flow, automated savings targets, loan/debt amortization, and real-time asset valuations.',
  icons: {
    icon: [
      { url: '/icon.png', sizes: '64x64', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tenvi',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-slate-200 dark:selection:bg-slate-700">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
          <GlobalDialog />
        </ThemeProvider>
      </body>
    </html>
  );
}
