import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { GlobalDialog } from '@/components/UI/GlobalDialog';
import './globals.css';

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
    <html lang="en">
      <body className="min-h-screen bg-[#F8F9FA] text-slate-800 antialiased selection:bg-slate-200">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: 'none',
              borderRadius: '1rem',
              boxShadow: '0 10px 30px -4px rgba(15, 23, 42, 0.1)',
              padding: '0.875rem 1.25rem',
              fontSize: '0.925rem',
            },
          }}
        />
        <GlobalDialog />
      </body>
    </html>
  );
}
