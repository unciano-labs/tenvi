import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/Navigation/Sidebar';
import { MobileNav } from '@/components/Navigation/MobileNav';
import { MobileHeader } from '@/components/Navigation/MobileHeader';
import { TenviAIChat } from '@/components/AI/TenviAIChat';
import { checkUserWebsiteMembership } from '@/lib/auth/guards';
import { WEBSITE_ID } from '@/lib/constants';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Authoritative authorization gate: check membership for current website
  const isEnrolled = await checkUserWebsiteMembership(user.id, WEBSITE_ID);
  if (!isEnrolled) {
    // Revoke foreign session and redirect with explanation
    await supabase.auth.signOut();
    redirect('/login?error=not_enrolled');
  }

  const userEmail = user.email || '';
  const userName = (user.user_metadata?.full_name as string) || userEmail.split('@')[0];

  return (
    <div className="h-screen w-full bg-[#F6F7F9] flex flex-col md:flex-row overflow-hidden">
      {/* Desktop Sidebar (Menu always visible) */}
      <div className="hidden md:flex shrink-0 h-full">
        <Sidebar userEmail={userEmail} userName={userName} />
      </div>

      {/* Main Content Area (Only scrollable container) */}
      <main className="flex-1 h-full overflow-y-auto flex flex-col">
        {/* Sticky Mobile Top Header */}
        <MobileHeader userName={userName} userEmail={userEmail} />

        <div className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-5 sm:py-8 pb-36 md:pb-12 flex-1">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <MobileNav />

      {/* Floating Tenvi AI Natural Language Ledger */}
      <TenviAIChat />
    </div>
  );
}
