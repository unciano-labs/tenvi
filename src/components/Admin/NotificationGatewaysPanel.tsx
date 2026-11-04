'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Server,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Key,
  ShieldCheck,
  Send,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ExternalLink,
  Clock,
  RefreshCw,
  Loader2,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  saveNotificationSettingsAction,
  checkAndSendCardDueAlertsAction,
  sendTestNotificationAction,
  verifyGmailSmtpAction,
  verifyHttpSmsAction,
} from '@/app/actions/notifications';
import { getAdminGatewaysDataAction } from '@/app/actions/admin/settings';
import { NotificationSettings, CreditCard } from '@/types';
import { calculateNextDueDate } from '@/lib/finance/calculations';

interface NotificationGatewaysPanelProps {
  initialSettings?: NotificationSettings | null;
  initialCards?: CreditCard[];
}

export function NotificationGatewaysPanel({
  initialSettings = null,
  initialCards = [],
}: NotificationGatewaysPanelProps) {
  const [settings, setSettings] = useState<NotificationSettings | null>(initialSettings);
  const [activeCards, setActiveCards] = useState<CreditCard[]>(initialCards);
  const [loading, setLoading] = useState(!initialSettings);

  // Form states
  const [smtpEmail, setSmtpEmail] = useState(initialSettings?.smtp_email || '');
  const [hasStoredSmtpPassword, setHasStoredSmtpPassword] = useState(
    Boolean(initialSettings?.smtp_app_password)
  );
  const [smtpAppPassword, setSmtpAppPassword] = useState('');
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showSmtpGuide, setShowSmtpGuide] = useState(false);
  const [isVerifyingSmtp, setIsVerifyingSmtp] = useState(false);
  const [smtpVerificationResult, setSmtpVerificationResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  const [hasStoredHttpSmsApiKey, setHasStoredHttpSmsApiKey] = useState(
    Boolean(initialSettings?.httpsms_api_key)
  );
  const [httpsmsApiKey, setHttpsmsApiKey] = useState('');
  const [httpsmsFromNumber, setHttpsmsFromNumber] = useState(
    initialSettings?.httpsms_from_number || ''
  );
  const [showHttpSmsApiKey, setShowHttpSmsApiKey] = useState(false);
  const [showHttpSmsGuide, setShowHttpSmsGuide] = useState(false);
  const [isVerifyingHttpSms, setIsVerifyingHttpSms] = useState(false);
  const [httpSmsVerificationResult, setHttpSmsVerificationResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  // Test dispatch recipient states
  const [testEmailRecipient, setTestEmailRecipient] = useState(
    initialSettings?.email_address || initialSettings?.smtp_email || ''
  );
  const [testSmsRecipient, setTestSmsRecipient] = useState(
    initialSettings?.phone_number || ''
  );

  // Action pending states
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isCheckingAlerts, setIsCheckingAlerts] = useState(false);

  // Load gateway data if not provided
  const loadGatewaysData = async () => {
    setLoading(true);
    const res = await getAdminGatewaysDataAction();
    if (res.error) {
      toast.error(res.error);
    } else {
      setSettings(res.settings);
      setActiveCards(res.activeCards);
      if (res.settings) {
        setSmtpEmail(res.settings.smtp_email || '');
        setHasStoredSmtpPassword(Boolean(res.settings.smtp_app_password));
        setHttpsmsFromNumber(res.settings.httpsms_from_number || '');
        setHasStoredHttpSmsApiKey(Boolean(res.settings.httpsms_api_key));
        if (!testEmailRecipient && res.settings.email_address) {
          setTestEmailRecipient(res.settings.email_address);
        }
        if (!testSmsRecipient && res.settings.phone_number) {
          setTestSmsRecipient(res.settings.phone_number);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!initialSettings) {
      loadGatewaysData();
    }
  }, []);

  // Cards currently due within a default 3-day evaluation window
  const daysBeforeWindow = settings?.days_before || 3;
  const upcomingCards = activeCards
    .map((c) => ({
      ...c,
      dueInfo: calculateNextDueDate(c.due_day),
    }))
    .filter((c) => c.dueInfo.daysRemaining >= 0 && c.dueInfo.daysRemaining <= daysBeforeWindow)
    .sort((a, b) => a.dueInfo.daysRemaining - b.dueInfo.daysRemaining);

  // Save Gateway Credentials
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    const payload: Parameters<typeof saveNotificationSettingsAction>[0] = {
      smtpEmail: smtpEmail.trim(),
      httpsmsFromNumber: httpsmsFromNumber.trim(),
    };

    if (smtpAppPassword.trim()) {
      payload.smtpAppPassword = smtpAppPassword.trim();
    } else if (!hasStoredSmtpPassword) {
      payload.smtpAppPassword = null;
    }

    if (httpsmsApiKey.trim()) {
      payload.httpsmsApiKey = httpsmsApiKey.trim();
    } else if (!hasStoredHttpSmsApiKey) {
      payload.httpsmsApiKey = null;
    }

    const res = await saveNotificationSettingsAction(payload);
    setIsSaving(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Gmail SMTP Relay & httpSMS Gateway settings saved successfully!');
      if (smtpAppPassword.trim()) setHasStoredSmtpPassword(true);
      if (httpsmsApiKey.trim()) setHasStoredHttpSmsApiKey(true);
      setSmtpAppPassword('');
      setHttpsmsApiKey('');
    }
  };

  // Verify SMTP Connection Handshake
  const handleVerifySmtp = async () => {
    if (!smtpEmail.trim()) {
      toast.error('Please enter a Gmail account address.');
      return;
    }
    if (!smtpAppPassword.trim() && !hasStoredSmtpPassword) {
      toast.error('Please enter the 16-character Google App Password.');
      return;
    }

    setIsVerifyingSmtp(true);
    setSmtpVerificationResult(null);

    const res = await verifyGmailSmtpAction(smtpEmail.trim(), smtpAppPassword.trim() || undefined);
    setIsVerifyingSmtp(false);

    if (res?.success) {
      toast.success(res.message || 'Gmail SMTP connection verified successfully!');
      setSmtpVerificationResult({ success: true, message: res.message });
    } else {
      toast.error(res?.error || 'Failed to connect to Gmail SMTP relay.');
      setSmtpVerificationResult({ success: false, error: res?.error });
    }
  };

  // Verify httpSMS API Key Handshake
  const handleVerifyHttpSms = async () => {
    if (!httpsmsApiKey.trim() && !hasStoredHttpSmsApiKey) {
      toast.error('Please enter your httpSMS Account API Key.');
      return;
    }

    setIsVerifyingHttpSms(true);
    setHttpSmsVerificationResult(null);

    const res = await verifyHttpSmsAction(
      httpsmsApiKey.trim() || undefined,
      httpsmsFromNumber.trim() || undefined
    );
    setIsVerifyingHttpSms(false);

    if (res?.success) {
      toast.success(res.message || 'httpSMS API key authenticated successfully!');
      setHttpSmsVerificationResult({ success: true, message: res.message });
    } else {
      toast.error(res?.error || 'Failed to authenticate with httpSMS.');
      setHttpSmsVerificationResult({ success: false, error: res?.error });
    }
  };

  // Send Test Notification (Email or SMS)
  const handleSendTest = async (channel: 'email' | 'sms') => {
    const targetRecipient = channel === 'sms' ? testSmsRecipient.trim() : testEmailRecipient.trim();

    if (!targetRecipient) {
      toast.error(`Please provide a recipient ${channel === 'sms' ? 'phone number' : 'email address'} for the test.`);
      return;
    }

    if (channel === 'sms') {
      setIsTestingSms(true);
    } else {
      setIsTestingEmail(true);
    }

    const res = await sendTestNotificationAction(channel, {
      recipient: targetRecipient,
      apiKey: httpsmsApiKey.trim() || undefined,
      fromNumber: httpsmsFromNumber.trim() || undefined,
      smtpEmail: smtpEmail.trim() || undefined,
      smtpAppPassword: smtpAppPassword.trim() || undefined,
    });

    if (channel === 'sms') setIsTestingSms(false);
    if (channel === 'email') setIsTestingEmail(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(res.message);
    }
  };

  // Force alert check and dispatch
  const handleCheckAndDispatch = async () => {
    setIsCheckingAlerts(true);
    const res = await checkAndSendCardDueAlertsAction({ forceSend: true });
    setIsCheckingAlerts(false);

    if (res?.error) {
      toast.error(res.error);
    } else if (res.dispatched) {
      toast.success(res.message);
    } else {
      toast.info(res.message);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-xs">Loading gateway configurations & active cards...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Gateway Configuration Column */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Gmail SMTP Server Configuration Card */}
            <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-7 shadow-card overflow-hidden space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                    <Server className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-foreground">
                        Gmail SMTP Relay Engine
                      </h2>
                      <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">
                        smtp.gmail.com:465 (SSL)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Connect your Google Account to dispatch production email reminders, debt notices, and member broadcasts.
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {smtpEmail && (smtpAppPassword || hasStoredSmtpPassword) ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" />
                      Live Configured
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Info className="size-3.5" />
                      Simulation Mode
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-muted/60 space-y-4">
                {/* Gmail Account Address */}
                <div>
                  <label className="block text-2xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Gmail Account Address (Sender)
                  </label>
                  <Input
                    type="email"
                    placeholder="notifications@tenvi.ph or yourname@gmail.com"
                    value={smtpEmail}
                    onChange={(e) => {
                      setSmtpEmail(e.target.value);
                      setSmtpVerificationResult(null);
                    }}
                    className="h-10 bg-card text-xs sm:text-sm font-medium"
                  />
                  <p className="text-2xs text-muted-foreground mt-1">
                    System emails will be delivered with this Gmail account authenticated as the verified sender.
                  </p>
                </div>

                {/* Google App Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-2xs font-bold text-foreground uppercase tracking-wider">
                      Google App Password (16 characters)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSmtpGuide(!showSmtpGuide)}
                      className="text-2xs font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1 cursor-pointer"
                    >
                      {showSmtpGuide ? 'Hide Setup Guide' : 'How to generate App Password?'}
                      {showSmtpGuide ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                    </button>
                  </div>

                  <div className="relative">
                    <Input
                      type={showSmtpPassword ? 'text' : 'password'}
                      placeholder={hasStoredSmtpPassword ? '•••••••••••••••• (Saved on Server)' : 'xxxx xxxx xxxx xxxx'}
                      value={smtpAppPassword}
                      onChange={(e) => {
                        setSmtpAppPassword(e.target.value);
                        setSmtpVerificationResult(null);
                      }}
                      className="h-10 bg-card text-xs sm:text-sm font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
                      title={showSmtpPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSmtpPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="text-2xs text-muted-foreground mt-1">
                    {hasStoredSmtpPassword && !smtpAppPassword
                      ? 'Encrypted password saved on server. Leave blank to preserve existing credentials.'
                      : 'Never enter your primary Google account password. Generate a dedicated 16-character App Password.'}
                  </p>
                </div>

                {/* Step-by-Step Google App Password Guide */}
                {showSmtpGuide && (
                  <div className="p-4 rounded-xl bg-card space-y-2 text-2xs text-muted-foreground animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <Key className="size-3.5 text-rose-500" />
                      4 Steps to Generate a Google App Password:
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground leading-relaxed pl-1">
                      <li>Sign in to your Google Account and visit Security &gt; 2-Step Verification (must be turned ON).</li>
                      <li>Scroll down to App Passwords.</li>
                      <li>Name the app "Tenvi Platform" and click Create.</li>
                      <li>Copy the generated 16-character code and paste it into the field above.</li>
                    </ol>
                  </div>
                )}

                {/* Handshake Result Feedback */}
                {smtpVerificationResult && (
                  <div
                    className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                      smtpVerificationResult.success
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {smtpVerificationResult.success ? (
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="size-4 text-rose-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold">
                        {smtpVerificationResult.success ? 'Handshake Successful' : 'SMTP Handshake Error'}
                      </p>
                      <p className="mt-0.5 leading-relaxed">
                        {smtpVerificationResult.message || smtpVerificationResult.error}
                      </p>
                    </div>
                  </div>
                )}

                {/* Verification & Test Dispatch Action Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isVerifyingSmtp || !smtpEmail || (!smtpAppPassword && !hasStoredSmtpPassword)}
                    onClick={handleVerifySmtp}
                    className="gap-1.5 text-xs text-rose-600 dark:text-rose-400 cursor-pointer"
                  >
                    <ShieldCheck className="size-3.5" />
                    {isVerifyingSmtp ? 'Testing Handshake...' : 'Verify Gmail Connection'}
                  </Button>

                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      placeholder="Test email recipient"
                      value={testEmailRecipient}
                      onChange={(e) => setTestEmailRecipient(e.target.value)}
                      className="h-8 text-2xs w-48 bg-card"
                    />
                    <Button
                      type="button"
                      variant="soft"
                      size="sm"
                      disabled={isTestingEmail || !testEmailRecipient}
                      onClick={() => handleSendTest('email')}
                      className="gap-1.5 text-xs cursor-pointer"
                    >
                      <Send className="size-3" />
                      {isTestingEmail ? 'Sending...' : 'Test Send'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* httpSMS Mobile Gateway Configuration Card */}
            <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-7 shadow-card overflow-hidden space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <Smartphone className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-foreground">
                        httpSMS Android Gateway Engine
                      </h2>
                      <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">
                        api.httpsms.com
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Transmits outgoing Philippine SMS notifications through your connected Android device carrier SIM plan.
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {(httpsmsApiKey || hasStoredHttpSmsApiKey) && httpsmsFromNumber ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" />
                      Live Gateway
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Info className="size-3.5" />
                      Simulation Mode
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-muted/60 space-y-4">
                {/* Account API Key */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-2xs font-bold text-foreground uppercase tracking-wider">
                      httpSMS Account API Key
                    </label>
                    <a
                      href="https://httpsms.com/settings"
                      target="_blank"
                      rel="noreferrer"
                      className="text-2xs font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1"
                    >
                      Get Key from httpsms.com
                      <ExternalLink className="size-2.5" />
                    </a>
                  </div>

                  <div className="relative">
                    <Input
                      type={showHttpSmsApiKey ? 'text' : 'password'}
                      placeholder={hasStoredHttpSmsApiKey ? '•••••••••••••••• (Saved on Server)' : 'Enter your httpSMS API Key'}
                      value={httpsmsApiKey}
                      onChange={(e) => setHttpsmsApiKey(e.target.value)}
                      className="h-10 bg-card text-xs sm:text-sm font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowHttpSmsApiKey(!showHttpSmsApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
                      title={showHttpSmsApiKey ? 'Hide key' : 'Show key'}
                    >
                      {showHttpSmsApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="text-2xs text-muted-foreground mt-1">
                    {hasStoredHttpSmsApiKey && !httpsmsApiKey
                      ? 'Encrypted API key saved on server. Leave blank to keep existing key.'
                      : 'Copy your API key from the httpSMS web dashboard.'}
                  </p>
                </div>

                {/* Sender Device SIM */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-2xs font-bold text-foreground uppercase tracking-wider">
                      Sender Phone Number (Android Gateway SIM)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowHttpSmsGuide(!showHttpSmsGuide)}
                      className="text-2xs font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1 cursor-pointer"
                    >
                      {showHttpSmsGuide ? 'Hide Setup Guide' : 'Setup Guide'}
                      {showHttpSmsGuide ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                    </button>
                  </div>
                  <Input
                    type="tel"
                    placeholder="+639171234567 or 09171234567"
                    value={httpsmsFromNumber}
                    onChange={(e) => setHttpsmsFromNumber(e.target.value)}
                    className="h-10 bg-card text-xs sm:text-sm font-medium"
                  />
                  <p className="text-2xs text-muted-foreground mt-1">
                    The active mobile number of the SIM card inside your Android phone running the httpSMS app.
                  </p>
                </div>

                {/* Step-by-Step httpSMS Guide */}
                {showHttpSmsGuide && (
                  <div className="p-4 rounded-xl bg-card space-y-2 text-2xs text-muted-foreground animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <Zap className="size-3.5 text-blue-500" />
                      Turn Any Android Phone into an Automated SMS Gateway:
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground leading-relaxed pl-1">
                      <li>Install the httpSMS application from Google Play Store on your Android device.</li>
                      <li>Sign in at httpsms.com and copy your Account API Key.</li>
                      <li>Ensure your phone has an active SIM with an unlimited SMS carrier plan.</li>
                      <li>Paste the API Key and SIM Number above, then click Verify httpSMS Key.</li>
                    </ol>
                  </div>
                )}

                {/* httpSMS Handshake Feedback */}
                {httpSmsVerificationResult && (
                  <div
                    className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                      httpSmsVerificationResult.success
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {httpSmsVerificationResult.success ? (
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="size-4 text-rose-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold">
                        {httpSmsVerificationResult.success ? 'Handshake Successful' : 'httpSMS Handshake Error'}
                      </p>
                      <p className="mt-0.5 leading-relaxed">
                        {httpSmsVerificationResult.message || httpSmsVerificationResult.error}
                      </p>
                    </div>
                  </div>
                )}

                {/* Verification & Test Dispatch Action Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isVerifyingHttpSms || (!httpsmsApiKey && !hasStoredHttpSmsApiKey)}
                    onClick={handleVerifyHttpSms}
                    className="gap-1.5 text-xs text-blue-600 dark:text-blue-400 cursor-pointer"
                  >
                    <ShieldCheck className="size-3.5" />
                    {isVerifyingHttpSms ? 'Verifying...' : 'Verify httpSMS Key'}
                  </Button>

                  <div className="flex items-center gap-2">
                    <Input
                      type="tel"
                      placeholder="0917 123 4567"
                      value={testSmsRecipient}
                      onChange={(e) => setTestSmsRecipient(e.target.value)}
                      className="h-8 text-2xs w-48 bg-card"
                    />
                    <Button
                      type="button"
                      variant="soft"
                      size="sm"
                      disabled={isTestingSms || !testSmsRecipient}
                      onClick={() => handleSendTest('sms')}
                      className="gap-1.5 text-xs cursor-pointer"
                    >
                      <Send className="size-3" />
                      {isTestingSms ? 'Sending...' : 'Test SMS'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Save All Gateway Settings Button */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving} className="font-semibold cursor-pointer">
                {isSaving ? 'Saving Gateway Settings...' : 'Save All Gateway Settings'}
              </Button>
            </div>
          </form>
        </div>

        {/* Live Diagnostics & Due Cards Column */}
        <div className="space-y-6">
          {/* Card Due Evaluation Widget */}
          <div className="bg-card text-card-foreground shadow-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                Cards in Due Window ({upcomingCards.length})
              </h3>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleCheckAndDispatch}
                disabled={isCheckingAlerts}
                className="h-7 text-2xs gap-1.5 cursor-pointer"
                title="Evaluate eligible cards and dispatch due notifications"
              >
                <RefreshCw className={`size-3 ${isCheckingAlerts ? 'animate-spin' : ''}`} />
                Check Now
              </Button>
            </div>

            {upcomingCards.length === 0 ? (
              <div className="p-4 rounded-2xl bg-muted text-center space-y-1">
                <CheckCircle2 className="size-6 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-foreground">All clear!</p>
                <p className="text-2xs text-muted-foreground">
                  No cards are due within the active {daysBeforeWindow}-day reminder window.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingCards.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-muted flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-foreground block">
                        {item.bank_name} {item.name}
                      </span>
                      <span className="text-2xs text-muted-foreground">
                        •••• {item.last_4} • Due Day {item.due_day}
                      </span>
                    </div>

                    <span
                      className={`font-bold px-2.5 py-0.5 rounded-full text-2xs ${
                        item.dueInfo.urgency === 'critical'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {item.dueInfo.label}
                    </span>
                  </div>
                ))}

                <Button
                  onClick={handleCheckAndDispatch}
                  disabled={isCheckingAlerts}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold cursor-pointer"
                >
                  {isCheckingAlerts ? 'Checking & Dispatching...' : "Send Today's Reminder Batch"}
                </Button>
              </div>
            )}
          </div>

          {/* SMTP Relay Engine Diagnostics Card */}
          <div className="bg-card text-card-foreground shadow-card rounded-3xl p-6 space-y-3.5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Server className="size-4 text-rose-500" />
              SMTP Delivery Diagnostics
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-2xl bg-muted flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Relay Host</span>
                <span className="font-bold text-foreground">smtp.gmail.com</span>
              </div>
              <div className="p-3 rounded-2xl bg-muted flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Port / Security</span>
                <span className="font-bold text-foreground">465 (SSL / TLS)</span>
              </div>
              <div className="p-3 rounded-2xl bg-muted flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Authenticated Account</span>
                <span className="font-bold text-foreground truncate max-w-[150px]">
                  {smtpEmail || 'Not Configured'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-muted flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Operating Mode</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-md text-2xs uppercase tracking-wider ${
                    smtpEmail && (smtpAppPassword || hasStoredSmtpPassword)
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {smtpEmail && (smtpAppPassword || hasStoredSmtpPassword) ? 'Live Gmail SMTP' : 'Simulation'}
                </span>
              </div>
            </div>
          </div>

          {/* httpSMS Gateway Engine Diagnostics Card */}
          <div className="bg-card text-card-foreground shadow-card rounded-3xl p-6 space-y-3.5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Smartphone className="size-4 text-blue-500" />
              httpSMS Gateway Diagnostics
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-2xl bg-muted flex items-center justify-between">
                <span className="text-muted-foreground font-medium">API Endpoint</span>
                <span className="font-bold text-foreground">api.httpsms.com</span>
              </div>
              <div className="p-3 rounded-2xl bg-muted flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Transmitter SIM</span>
                <span className="font-bold text-foreground truncate max-w-[150px]">
                  {httpsmsFromNumber || 'Not Configured'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-muted flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Operating Mode</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-md text-2xs uppercase tracking-wider ${
                    (httpsmsApiKey || hasStoredHttpSmsApiKey) && httpsmsFromNumber
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {(httpsmsApiKey || hasStoredHttpSmsApiKey) && httpsmsFromNumber ? 'Live Gateway' : 'Simulation'}
                </span>
              </div>
            </div>
          </div>

          {/* Card Due Alert Templates Quick Link */}
          <div className="bg-card text-card-foreground shadow-card rounded-3xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-foreground font-bold text-sm">
              <MessageSquare className="size-4 text-amber-500" />
              <span>Card Due Alert Messages</span>
            </div>
            <p className="text-2xs text-muted-foreground leading-relaxed">
              Want to adjust how automated SMS or email reminders sound when members have upcoming credit card bills?
            </p>
            <Link
              href="/admin/settings?tab=templates"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              <span>Edit Card Reminder Templates</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

