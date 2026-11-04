'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAdminGatewaysDataAction } from '@/app/actions/admin/settings';
import { NotificationTemplatesEditor } from '@/components/Notifications/NotificationTemplatesEditor';
import { NotificationSettings } from '@/types';
import { WEBSITE_ID } from '@/lib/constants';
import {
  DEFAULT_CARD_SMS_TEMPLATE,
  DEFAULT_CARD_EMAIL_SUBJECT,
  DEFAULT_CARD_EMAIL_BODY,
} from '@/lib/notifications/templates';

export function AdminCardTemplatesPanel() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getAdminGatewaysDataAction()
      .then((res) => {
        if (!isMounted) return;
        if (res.error) {
          toast.error(res.error);
        } else if (res.settings) {
          setSettings(res.settings);
        } else {
          // Fallback with standard defaults
          setSettings({
            id: '',
            website_id: WEBSITE_ID,
            user_id: '',
            notify_email: true,
            email_address: '',
            notify_sms: false,
            phone_number: '',
            days_before: 3,
            card_sms_template: DEFAULT_CARD_SMS_TEMPLATE,
            card_email_subject: DEFAULT_CARD_EMAIL_SUBJECT,
            card_email_body: DEFAULT_CARD_EMAIL_BODY,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        toast.error(err.message || 'Failed to load card templates');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading || !settings) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-xs">Loading card alert message templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <NotificationTemplatesEditor
        initialSettings={settings}
        mode="cards_only"
        onSaved={(updated) => {
          setSettings((prev) => (prev ? { ...prev, ...updated } : prev));
        }}
      />
    </div>
  );
}

