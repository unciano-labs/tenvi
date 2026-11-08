'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Bell,
  Mail,
  Smartphone,
  Calendar,
  Download,
  ShieldAlert,
  ArrowRight,
  Clock,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import { saveNotificationSettingsAction } from '@/app/actions/notifications';
import { NotificationSettings } from '@/types';
import { NotificationTemplatesEditor } from '@/components/Notifications/NotificationTemplatesEditor';
import { DataExportPanel } from '@/components/Settings/DataExportPanel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeSegmentedToggle } from '@/components/ui/theme-toggle';

interface SettingsClientProps {
  initialSettings: NotificationSettings;
  userEmail: string;
  isAdmin?: boolean;
}

export function SettingsClient({
  initialSettings,
  userEmail,
  isAdmin = false,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'templates' | 'export'>('notifications');

  // Support ?tab=cards or other query parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'cards' || tabParam === 'notifications') {
        setActiveTab('notifications');
      } else if (tabParam === 'templates') {
        setActiveTab('templates');
      } else if (tabParam === 'export') {
        setActiveTab('export');
      }
    }
  }, []);

  // Notification Preferences
  const [notifyEmail, setNotifyEmail] = useState(initialSettings.notify_email);
  const [emailAddress, setEmailAddress] = useState(
    initialSettings.email_address || userEmail
  );
  const [notifySms, setNotifySms] = useState(initialSettings.notify_sms);
  const [phoneNumber, setPhoneNumber] = useState(
    initialSettings.phone_number || ''
  );
  const [daysBefore, setDaysBefore] = useState(initialSettings.days_before || 3);
  const [isSaving, setIsSaving] = useState(false);

  // Save Preferences Handler
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    const payload: Parameters<typeof saveNotificationSettingsAction>[0] = {
      notifyEmail,
      emailAddress: emailAddress.trim(),
      notifySms,
      phoneNumber: phoneNumber.trim(),
      daysBefore: Number(daysBefore),
    };

    const res = await saveNotificationSettingsAction(payload);
    setIsSaving(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Your reminder settings have been saved!');
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Header & Theme Controls */}
      <div className="page-header">
        <div>
          <h1 className="text-display text-foreground">Settings & reminders</h1>
          <p className="mt-1 max-w-prose text-sm sm:text-base text-muted-foreground">
            Choose how you would like to be reminded about your bills, and manage your account.
          </p>
        </div>

        {/* Theme Control */}
        <div className="page-header-actions">
          <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-card p-1.5 pl-3 shadow-card">
            <span className="shrink-0 text-label text-muted-foreground">Theme</span>
            <ThemeSegmentedToggle className="min-w-0" />
          </div>
        </div>
      </div>

      {/* Administrator Gentle Notice */}
      {isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-500/10 p-4">
          <div className="flex min-w-0 flex-[1_1_16rem] items-start gap-3">
            <div className="size-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="size-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Administrator control center</span>
              <span className="block text-xs sm:text-sm text-muted-foreground">
                Looking for credit card reminder templates, mail server setup, or system delivery logs?
              </span>
            </div>
          </div>

          <Button
            size="sm"
            variant="soft"
            render={<Link href="/admin/settings" />}
            className="gap-1.5 bg-card text-amber-700 hover:bg-card/80 dark:text-amber-400"
          >
            <span>Go to admin area</span>
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Navigation Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        className="w-full gap-6"
      >
        <TabsList className="grid h-auto w-full max-w-xl grid-cols-3 bg-muted p-1">
          <TabsTrigger value="notifications" className="flex h-auto min-h-11 min-w-0 flex-col gap-1 px-2 py-2 text-xs leading-tight whitespace-normal sm:flex-row sm:gap-2 sm:text-sm">
            <Bell className="size-4 shrink-0 text-blue-500" />
            <span className="text-center">Bill reminders</span>
          </TabsTrigger>

          <TabsTrigger value="templates" className="flex h-auto min-h-11 min-w-0 flex-col gap-1 px-2 py-2 text-xs leading-tight whitespace-normal sm:flex-row sm:gap-2 sm:text-sm">
            <MessageSquare className="size-4 shrink-0 text-amber-500" />
            <span className="text-center">Borrower messages</span>
          </TabsTrigger>

          <TabsTrigger value="export" className="flex h-auto min-h-11 min-w-0 flex-col gap-1 px-2 py-2 text-xs leading-tight whitespace-normal sm:flex-row sm:gap-2 sm:text-sm">
            <Download className="size-4 shrink-0 text-emerald-500" />
            <span className="text-center">Download records</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BILL REMINDERS */}
        <TabsContent value="notifications">
          <form onSubmit={handleSave} className="flex max-w-3xl flex-col gap-4 sm:gap-6">
            {/* 1. Email Reminders Box */}
            <section className="flex flex-col gap-5 rounded-2xl bg-card p-5 sm:p-6 text-card-foreground shadow-card">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Mail className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-title text-foreground pt-1.5">Email reminders</h2>
                    <Switch
                      checked={notifyEmail}
                      onCheckedChange={setNotifyEmail}
                      aria-label="Turn on or off email reminders"
                      className="mt-1.5 shrink-0"
                    />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Get a friendly email reminder before your credit card bills or loan payments are due.
                  </p>
                </div>
              </div>

              {notifyEmail && (
                <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-4 sm:p-5">
                  <label htmlFor="settings-reminder-email" className="text-sm font-semibold text-foreground">
                    Where would you like to receive your reminder emails?
                  </label>
                  <Input
                    id="settings-reminder-email"
                    type="email"
                    required
                    placeholder="e.g. maria.santos@gmail.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="min-h-12 h-12 bg-card text-base font-medium rounded-xl px-4"
                  />
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    We will send your payment reminder notices to this email address so you never miss a due date.
                  </p>
                </div>
              )}
            </section>

            {/* 2. Text Message (SMS) Reminders Box */}
            <section className="flex flex-col gap-5 rounded-2xl bg-card p-5 sm:p-6 text-card-foreground shadow-card">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="size-10 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Smartphone className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-title text-foreground pt-1.5">Cellphone text reminders (SMS)</h2>
                    <Switch
                      checked={notifySms}
                      onCheckedChange={setNotifySms}
                      aria-label="Turn on or off text message reminders"
                      className="mt-1.5 shrink-0"
                    />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Get a short text message directly on your mobile phone before a bill is due.
                  </p>
                </div>
              </div>

              {notifySms && (
                <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-4 sm:p-5">
                  <label htmlFor="settings-reminder-phone" className="text-sm font-semibold text-foreground">
                    What is your mobile cellphone number?
                  </label>
                  <Input
                    id="settings-reminder-phone"
                    type="tel"
                    placeholder="e.g. 0917 123 4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="min-h-12 h-12 bg-card text-base font-medium rounded-xl px-4"
                  />
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Your 11-digit Philippine cellphone number (starting with 09).
                  </p>
                </div>
              )}
            </section>

            {/* 3. Timing & Schedule Preferences */}
            <section className="flex flex-col gap-5 rounded-2xl bg-card p-5 sm:p-6 text-card-foreground shadow-card">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="size-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Calendar className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-title text-foreground pt-1.5">When should we remind you?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose how many days before your due date you would like a reminder.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-xl bg-muted/50 p-4 sm:p-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="settings-days-before" className="text-sm font-semibold text-foreground">
                    Remind me
                  </label>
                  <select
                    id="settings-days-before"
                    value={daysBefore}
                    onChange={(e) => setDaysBefore(Number(e.target.value))}
                    className="min-h-12 h-12 w-full min-w-0 truncate rounded-xl bg-card px-4 text-base font-medium text-foreground outline-none transition-shadow duration-(--motion-fast) ease-(--ease-in-out) focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value={1}>1 day before it is due (The day before)</option>
                    <option value={2}>2 days before it is due</option>
                    <option value={3}>3 days before it is due (Recommended)</option>
                    <option value={5}>5 days before it is due</option>
                    <option value={7}>1 week (7 days) before it is due</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 rounded-xl bg-card p-4">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    Simple & helpful
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    We only send one reminder a day. If you have multiple cards or bills coming up, we group them into a single friendly message so your phone stays quiet.
                  </p>
                </div>
              </div>
            </section>

            {/* Save applies to all three sections above */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSaving}
                aria-busy={isSaving}
                className="w-full px-8 sm:w-auto"
              >
                {isSaving ? 'Saving your settings...' : 'Save my settings'}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* TAB 2: BORROWER MESSAGES */}
        <TabsContent value="templates">
          <NotificationTemplatesEditor initialSettings={initialSettings} mode="loans_only" />
        </TabsContent>

        {/* TAB 3: DOWNLOAD RECORDS */}
        <TabsContent value="export">
          <DataExportPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
