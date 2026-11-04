import React from 'react';
import { NotificationLogsPanel } from '@/components/Admin/NotificationLogsPanel';

export const metadata = {
  title: 'Delivery Logs & Audit Trail | Tenvi Admin',
  description: 'Search, filter, and inspect automated email and SMS notification dispatches.',
};

export default function AdminLogsPage() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Delivery Logs & Audit Trail
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Real-time delivery verification across Gmail SMTP Relay and httpSMS Gateway.
        </p>
      </div>

      <NotificationLogsPanel />
    </div>
  );
}

