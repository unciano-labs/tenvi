import React from 'react';
import { redirect } from 'next/navigation';
import { requireWebsiteAdmin } from '@/lib/auth/guards';
import { AdminSidebar } from '@/components/Navigation/AdminSidebar';
import { AdminTopHeader } from '@/components/Navigation/AdminTopHeader';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireWebsiteAdmin();

  // If not logged in, redirect to login with return path
  if (!auth.user) {
    redirect('/login?redirect=/admin');
  }

  // If logged in as regular member, redirect directly back to member dashboard
  if (!auth.isAuthorized) {
    redirect('/dashboard?error=unauthorized_admin');
  }

  return (
    <div className="h-dvh max-h-dvh w-full overflow-hidden bg-background flex flex-col md:flex-row">
      {/* Desktop Admin Sidebar */}
      <AdminSidebar userEmail={auth.user.email || ''} />

      {/* Main Admin View Container */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        <AdminTopHeader userEmail={auth.user.email || ''} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 overscroll-contain">
          <div className="max-w-7xl mx-auto w-full pb-16">{children}</div>
        </main>
      </div>
    </div>
  );
}
