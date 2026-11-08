import React from 'react';
import { NotificationLogsPanel } from '@/components/Admin/NotificationLogsPanel';

export const metadata = {
  title: 'Delivery Logs & Audit Trail | Tenvi Admin',
  description: 'Search, filter, and inspect automated email and SMS notification dispatches.',
};

export default function AdminLogsPage() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="page-header">
        <div>
          <h1 className="text-display text-foreground">Delivery logs & audit trail</h1>
          <p className="mt-1 max-w-prose text-sm sm:text-base text-muted-foreground">
            Real-time delivery verification across Gmail SMTP Relay and httpSMS Gateway.
          </p>
        </div>
      </div>

      <NotificationLogsPanel />
    </div>
  );
}

