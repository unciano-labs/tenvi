import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { SettingsClient } from './SettingsClient';
import { NotificationSettings, NotificationLog, CreditCard, NotificationLogsStats } from '@/types';

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userEmail = user?.email || '';

  // 1. Fetch notification settings
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

  // 2. Fetch initial batch of notification history logs (optimized for lazy loading)
  const [{ data: logsData, count: logsCount }, { data: allStatsRows }] = await Promise.all([
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
  ]);

  const initialStats: NotificationLogsStats = {
    total: allStatsRows?.length || 0,
    sent: allStatsRows?.filter((r) => r.status === 'sent').length || 0,
    simulated: allStatsRows?.filter((r) => r.status === 'simulated').length || 0,
    failed: allStatsRows?.filter((r) => r.status === 'failed').length || 0,
    email: allStatsRows?.filter((r) => r.channel === 'email').length || 0,
    sms: allStatsRows?.filter((r) => r.channel === 'sms').length || 0,
  };

  // 3. Fetch active credit cards to show live due window
  const { data: creditCardsData } = await supabase
    .from('bili_credit_cards')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .eq('is_active', true)
    .order('due_day', { ascending: true });

  // 4. Fetch real-time Gemini AI usage and quota stats
  const { getGeminiUsageStats } = await import('@/lib/ai/gemini');
  const initialGeminiStats = user ? await getGeminiUsageStats(user.id) : null;

  return (
    <SettingsClient
      initialSettings={initialSettings}
      initialLogs={(logsData as NotificationLog[]) || []}
      initialTotalCount={logsCount || 0}
      initialStats={initialStats}
      activeCards={(creditCardsData as CreditCard[]) || []}
      userEmail={userEmail}
      initialGeminiStats={initialGeminiStats}
    />
  );
}
