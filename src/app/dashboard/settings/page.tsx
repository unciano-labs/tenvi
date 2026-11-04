import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID, isUserAdmin } from '@/lib/constants';
import { getAuthenticatedUser } from '@/lib/auth/guards';
import { SettingsClient } from './SettingsClient';
import { NotificationSettings } from '@/types';

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await getAuthenticatedUser();

  const userEmail = user?.email || '';
  const isAdmin = isUserAdmin(userEmail);

  // Fetch notification settings for current user (preferences and templates)
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

  const initialSettings: NotificationSettings = settingsData
    ? {
        ...(settingsData as NotificationSettings),
        smtp_app_password: null,
        httpsms_api_key: null,
      }
    : defaultSettings;

  return (
    <SettingsClient
      initialSettings={initialSettings}
      userEmail={userEmail}
      isAdmin={isAdmin}
    />
  );
}
