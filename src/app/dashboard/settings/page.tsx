import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID, isUserAdmin } from '@/lib/constants';
import { getAuthenticatedUser } from '@/lib/auth/guards';
import { SettingsClient } from './SettingsClient';
import { NotificationSettings, NotificationLog, CreditCard, NotificationLogsStats } from '@/types';

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await getAuthenticatedUser();

  const userEmail = user?.email || '';
  const isAdmin = isUserAdmin(userEmail);

  // 1. Fetch notification settings (needed for templates and general preferences)
  const { data: settingsData } = await supabase
    .from('bili_notification_settings')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .maybeSingle();

  const defaultSettings: NotificationSettings = {
    id: '',
    website_id: WEBSITE_ID,
    user_id: user?.id || '',
    notify_email: true,
    email_address: userEmail,
    notify_sms: false,
    phone_number: '',
    days_before: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const initialSettings = (settingsData as NotificationSettings) || defaultSettings;

  let logsData: NotificationLog[] = [];
  let logsCount = 0;
  let initialStats: NotificationLogsStats = {
    total: 0,
    sent: 0,
    simulated: 0,
    failed: 0,
    email: 0,
    sms: 0,
  };
  let creditCardsData: CreditCard[] = [];
  let initialGeminiStats = null;

  // Only query delivery logs, credit cards, and Gemini usage stats for admin users
  if (isAdmin) {
    const [{ data: lData, count: lCount }, { data: allStatsRows }, { data: cData }] =
      await Promise.all([
        supabase
          .from('bili_notification_logs')
          .select('*', { count: 'exact' })
          .eq('website_id', WEBSITE_ID)
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .range(0, 14),
        supabase
          .from('bili_notification_logs')
          .select('channel, status')
          .eq('website_id', WEBSITE_ID)
          .eq('user_id', user?.id),
        supabase
          .from('bili_credit_cards')
          .select('*')
          .eq('website_id', WEBSITE_ID)
          .eq('user_id', user?.id)
          .eq('is_active', true)
          .order('due_day', { ascending: true }),
      ]);

    logsData = (lData as NotificationLog[]) || [];
    logsCount = lCount || 0;
    creditCardsData = (cData as CreditCard[]) || [];
    initialStats = {
      total: allStatsRows?.length || 0,
      sent: allStatsRows?.filter((r) => r.status === 'sent').length || 0,
      simulated: allStatsRows?.filter((r) => r.status === 'simulated').length || 0,
      failed: allStatsRows?.filter((r) => r.status === 'failed').length || 0,
      email: allStatsRows?.filter((r) => r.channel === 'email').length || 0,
      sms: allStatsRows?.filter((r) => r.channel === 'sms').length || 0,
    };

    try {
      const { getGeminiUsageStats } = await import('@/lib/ai/gemini');
      initialGeminiStats = user ? await getGeminiUsageStats(user.id) : null;
    } catch {
      // Safe fallback
    }
  }

  return (
    <SettingsClient
      initialSettings={initialSettings}
      initialLogs={logsData}
      initialTotalCount={logsCount}
      initialStats={initialStats}
      activeCards={creditCardsData}
      userEmail={userEmail}
      initialGeminiStats={initialGeminiStats}
      isAdmin={isAdmin}
    />
  );
}
