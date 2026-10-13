import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Sidebar } from '@/components/Navigation/Sidebar';
import { MobileNav } from '@/components/Navigation/MobileNav';
import { MobileHeader } from '@/components/Navigation/MobileHeader';
import { TenviAIChat } from '@/components/AI/TenviAIChat';
import { checkUserWebsiteMembership, getAuthenticatedUser } from '@/lib/auth/guards';
import { WEBSITE_ID } from '@/lib/constants';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    data: { user },
  } = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  // Authoritative authorization gate: check membership for current website
  const isEnrolled = await checkUserWebsiteMembership(user.id, WEBSITE_ID);
  if (!isEnrolled) {
    const userEmail = user.email || '';
    const userName = (user.user_metadata?.full_name as string) || '';

    // Revoke foreign session and redirect to registration with pre-populated details
    const supabase = await createClient();
    await supabase.auth.signOut();
    const params = new URLSearchParams({
      email: userEmail,
      ...(userName ? { name: userName } : {}),
      enrolling: 'true',
    });
    redirect(`/register?${params.toString()}`);
  }

  const userEmail = user.email || '';
  const userName = (user.user_metadata?.full_name as string) || userEmail.split('@')[0];

  return (
    <SidebarProvider defaultOpen={true} className="h-dvh max-h-dvh w-full overflow-hidden">
      <div className="h-full w-full bg-background flex flex-col md:flex-row overflow-hidden">
        {/* Desktop Sidebar (Pinned & collapsible via shadcn) */}
        <Sidebar userEmail={userEmail} userName={userName} />

        {/* Main Content Area (Only scrollable container) */}
        <main className="flex-1 h-full min-h-0 overflow-y-auto overscroll-contain flex flex-col">
          {/* Sticky Mobile Top Header */}
          <MobileHeader userName={userName} userEmail={userEmail} />

          <div className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-5 sm:py-8 pb-44 sm:pb-36 md:pb-28 lg:pb-32 flex-1 min-h-0">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Nav (5 primary destinations) */}
        <MobileNav />

        {/* Floating Tenvi AI Natural Language Ledger */}
        <TenviAIChat />
      </div>
    </SidebarProvider>
  );
}
