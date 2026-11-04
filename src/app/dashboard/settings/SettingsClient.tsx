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
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Header & Theme Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Settings & Reminders
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Choose how you would like to be reminded about your bills, and manage your account.
          </p>
        </div>

        {/* Theme Control */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto bg-card p-2 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground pl-1">Theme</span>
          <ThemeSegmentedToggle className="w-56" />
        </div>
      </div>

      {/* Administrator Gentle Notice */}
      {isAdmin && (
        <div className="p-4 rounded-2xl bg-amber-500/10 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="size-4" />
            </div>
            <div>
              <span className="font-bold text-foreground block">
                Administrator Control Center
              </span>
              <span className="text-2xs sm:text-xs text-muted-foreground">
                Looking for credit card reminder templates, mail server setup, or system delivery logs?
              </span>
            </div>
          </div>

          <Button
            size="sm"
            variant="soft"
            render={<Link href="/admin/settings" />}
            className="text-xs font-bold gap-1.5 self-start sm:self-auto text-amber-600 dark:text-amber-400"
          >
            <span>Go to Admin Area</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Navigation Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        className="w-full space-y-6"
      >
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="notifications" className="flex items-center gap-2 text-xs sm:text-sm">
            <Bell className="size-4 text-blue-500" />
            <span>Bill Reminders</span>
          </TabsTrigger>

          <TabsTrigger value="templates" className="flex items-center gap-2 text-xs sm:text-sm">
            <MessageSquare className="size-4 text-amber-500" />
            <span>Borrower Messages</span>
          </TabsTrigger>

          <TabsTrigger value="export" className="flex items-center gap-2 text-xs sm:text-sm">
            <Download className="size-4 text-emerald-500" />
            <span>Download Records</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BILL REMINDERS */}
        <TabsContent value="notifications" className="space-y-6 animate-in fade-in duration-150">
          <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
            {/* 1. Email Reminders Box */}
            <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-7 shadow-card space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <Mail className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-foreground">
                      Email Reminders
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Get a friendly email reminder before your credit card bills or loan payments are due.
                    </p>
                  </div>
                </div>

                <Switch
                  checked={notifyEmail}
                  onCheckedChange={setNotifyEmail}
                  aria-label="Turn on or off email reminders"
                />
              </div>

              {notifyEmail && (
                <div className="p-4 sm:p-5 rounded-2xl bg-muted/60 space-y-2.5 animate-in fade-in duration-150">
                  <label className="block text-xs sm:text-sm font-bold text-foreground">
                    Where would you like to receive your reminder emails?
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="e.g. maria.santos@gmail.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="min-h-12 h-12 bg-card text-sm sm:text-base font-medium rounded-xl px-4"
                  />
                  <p className="text-2xs sm:text-xs text-muted-foreground mt-1">
                    We will send your payment reminder notices to this email address so you never miss a due date.
                  </p>
                </div>
              )}
            </div>

            {/* 2. Text Message (SMS) Reminders Box */}
            <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-7 shadow-card space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <Smartphone className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-foreground">
                      Cellphone Text Reminders (SMS)
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Get a short text message directly on your mobile phone before a bill is due.
                    </p>
                  </div>
                </div>

                <Switch
                  checked={notifySms}
                  onCheckedChange={setNotifySms}
                  aria-label="Turn on or off text message reminders"
                />
              </div>

              {notifySms && (
                <div className="p-4 sm:p-5 rounded-2xl bg-muted/60 space-y-2.5 animate-in fade-in duration-150">
                  <label className="block text-xs sm:text-sm font-bold text-foreground">
                    What is your mobile cellphone number?
                  </label>
                  <Input
                    type="tel"
                    placeholder="e.g. 0917 123 4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="min-h-12 h-12 bg-card text-sm sm:text-base font-medium rounded-xl px-4"
                  />
                  <p className="text-2xs sm:text-xs text-muted-foreground mt-1">
                    Your 11-digit Philippine cellphone number (starting with 09).
                  </p>
                </div>
              )}
            </div>

            {/* 3. Timing & Schedule Preferences */}
            <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-7 shadow-card space-y-5">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Calendar className="size-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    When should we remind you?
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Choose how many days before your due date you would like a reminder.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-muted/60 space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
                    Remind me:
                  </label>
                  <select
                    value={daysBefore}
                    onChange={(e) => setDaysBefore(Number(e.target.value))}
                    className="min-h-12 h-12 w-full rounded-xl bg-card px-4 text-sm sm:text-base font-semibold text-foreground outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value={1}>1 day before it is due (The day before)</option>
                    <option value={2}>2 days before it is due</option>
                    <option value={3}>3 days before it is due (Recommended)</option>
                    <option value={5}>5 days before it is due</option>
                    <option value={7}>1 week (7 days) before it is due</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-card space-y-1.5 text-xs text-muted-foreground">
                  <p className="font-bold text-foreground flex items-center gap-1.5 text-xs sm:text-sm">
                    <Clock className="size-4 text-amber-500" />
                    Simple & helpful
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    We only send one reminder a day. If you have multiple cards or bills coming up, we group them into a single friendly message so your phone stays quiet.
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="min-h-12 h-12 px-8 text-sm sm:text-base font-bold cursor-pointer rounded-xl"
                >
                  {isSaving ? 'Saving your settings...' : 'Save My Settings'}
                </Button>
              </div>
            </div>
          </form>
        </TabsContent>

        {/* TAB 2: BORROWER MESSAGES */}
        <TabsContent value="templates" className="animate-in fade-in duration-150">
          <NotificationTemplatesEditor initialSettings={initialSettings} mode="loans_only" />
        </TabsContent>

        {/* TAB 3: DOWNLOAD RECORDS */}
        <TabsContent value="export" className="space-y-6 animate-in fade-in duration-150">
          <DataExportPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
