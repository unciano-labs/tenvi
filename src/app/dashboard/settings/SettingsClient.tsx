'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Bell,
  Mail,
  Smartphone,
  Calendar,
  Send,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Eye,
  EyeOff,
  AlertCircle,
  XCircle,
  Key,
  Server,
  ChevronDown,
  ChevronUp,
  Info,
  Sliders,
  ArrowRight,
  Search,
  X,
  Loader2,
  Zap,
  ExternalLink,
} from 'lucide-react';
import {
  saveNotificationSettingsAction,
  checkAndSendCardDueAlertsAction,
  sendTestNotificationAction,
  verifyGmailSmtpAction,
  verifyHttpSmsAction,
  getNotificationLogsAction,
} from '@/app/actions/notifications';
import {
  NotificationSettings,
  NotificationLog,
  CreditCard,
  NotificationLogsStats,
  GeminiUsageStats,
} from '@/types';
import { formatMoney, calculateNextDueDate } from '@/lib/finance/calculations';
import { NotificationTemplatesEditor } from '@/components/Notifications/NotificationTemplatesEditor';
import { testGeminiConnectionAction, getGeminiUsageStatsAction } from '@/app/actions/gemini';

interface SettingsClientProps {
  initialSettings: NotificationSettings;
  initialLogs: NotificationLog[];
  initialTotalCount?: number;
  initialStats?: NotificationLogsStats;
  activeCards: CreditCard[];
  userEmail: string;
  initialGeminiStats?: GeminiUsageStats | null;
}

export function SettingsClient({
  initialSettings,
  initialLogs,
  initialTotalCount,
  initialStats,
  activeCards,
  userEmail,
  initialGeminiStats,
}: SettingsClientProps) {
  // Top-level Navigation Tab ('settings' default, 'templates', 'logs', 'ai')
  const [activeTab, setActiveTab] = useState<'settings' | 'templates' | 'logs' | 'ai'>('settings');

  // Gemini AI Vision state
  const [geminiStats, setGeminiStats] = useState<GeminiUsageStats | null>(
    initialGeminiStats || null
  );
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    model: string;
    error?: string;
  } | null>(null);

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

  // Gmail SMTP Settings
  const [smtpEmail, setSmtpEmail] = useState(initialSettings.smtp_email || '');
  const [smtpAppPassword, setSmtpAppPassword] = useState(
    initialSettings.smtp_app_password || ''
  );
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showSmtpGuide, setShowSmtpGuide] = useState(false);
  const [isVerifyingSmtp, setIsVerifyingSmtp] = useState(false);
  const [smtpVerificationResult, setSmtpVerificationResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  // httpSMS Gateway Settings
  const [httpsmsApiKey, setHttpsmsApiKey] = useState(
    initialSettings.httpsms_api_key || ''
  );
  const [httpsmsFromNumber, setHttpsmsFromNumber] = useState(
    initialSettings.httpsms_from_number || ''
  );
  const [showHttpSmsApiKey, setShowHttpSmsApiKey] = useState(false);
  const [showHttpSmsGuide, setShowHttpSmsGuide] = useState(false);
  const [isVerifyingHttpSms, setIsVerifyingHttpSms] = useState(false);
  const [httpSmsVerificationResult, setHttpSmsVerificationResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  // Async Execution States
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isCheckingAlerts, setIsCheckingAlerts] = useState(false);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  // Lazy Loading & Pagination States
  const [logs, setLogs] = useState<NotificationLog[]>(initialLogs);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount ?? initialLogs.length);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(
    (initialTotalCount ?? initialLogs.length) > initialLogs.length
  );
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'email' | 'sms'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'simulated' | 'failed'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Global Statistics for Logs
  const defaultStats: NotificationLogsStats = {
    total: initialTotalCount ?? initialLogs.length,
    sent: initialLogs.filter((l) => l.status === 'sent').length,
    simulated: initialLogs.filter((l) => l.status === 'simulated').length,
    failed: initialLogs.filter((l) => l.status === 'failed').length,
    email: initialLogs.filter((l) => l.channel === 'email').length,
    sms: initialLogs.filter((l) => l.channel === 'sms').length,
  };
  const [stats, setStats] = useState<NotificationLogsStats>(initialStats || defaultStats);

  // Cards currently due within the configured window
  const upcomingCards = activeCards
    .map((c) => ({
      ...c,
      dueInfo: calculateNextDueDate(c.due_day),
    }))
    .filter((c) => c.dueInfo.daysRemaining >= 0 && c.dueInfo.daysRemaining <= daysBefore)
    .sort((a, b) => a.dueInfo.daysRemaining - b.dueInfo.daysRemaining);

  // Debounce search input by 280ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Track initial mount so we don't refetch on first render
  const isFirstMount = useRef(true);

  // Centralized, optimized fetch function for search, filter & pagination
  const fetchLogs = async (
    targetPage: number,
    isAppend: boolean = false,
    queryParam?: string,
    channelParam?: 'all' | 'email' | 'sms',
    statusParam?: 'all' | 'sent' | 'simulated' | 'failed'
  ) => {
    if (isAppend) {
      setIsLoadingMore(true);
    } else {
      setIsLoadingLogs(true);
    }

    const currentSearch = queryParam !== undefined ? queryParam : debouncedSearch;
    const currentChannel = channelParam !== undefined ? channelParam : channelFilter;
    const currentStatus = statusParam !== undefined ? statusParam : statusFilter;

    const res = await getNotificationLogsAction({
      page: targetPage,
      limit: 15,
      search: currentSearch,
      channel: currentChannel,
      status: currentStatus,
    });

    if (isAppend) {
      setIsLoadingMore(false);
    } else {
      setIsLoadingLogs(false);
    }

    if (res.error) {
      toast.error(res.error);
      return;
    }

    if (isAppend) {
      setLogs((prev) => [...prev, ...res.logs]);
    } else {
      setLogs(res.logs);
    }

    setPage(targetPage);
    setTotalCount(res.totalCount);
    setHasMore(res.hasMore);
    if (res.stats) {
      setStats(res.stats);
    }
  };

  // Re-fetch Page 1 when debounced search or filters change
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    fetchLogs(1, false, debouncedSearch, channelFilter, statusFilter);
  }, [debouncedSearch, channelFilter, statusFilter]);

  // Load More Next Page Handler (Lazy Loading)
  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return;
    fetchLogs(page + 1, true);
  };

  // Save Settings Handler
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    const res = await saveNotificationSettingsAction({
      notifyEmail,
      emailAddress: emailAddress.trim(),
      notifySms,
      phoneNumber: phoneNumber.trim(),
      daysBefore: Number(daysBefore),
      smtpEmail: smtpEmail.trim(),
      smtpAppPassword: smtpAppPassword.trim(),
      httpsmsApiKey: httpsmsApiKey.trim(),
      httpsmsFromNumber: httpsmsFromNumber.trim(),
    });

    setIsSaving(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Notification, Gmail SMTP & httpSMS settings saved successfully!');
    }
  };

  // Test Verification for Gmail SMTP Handshake
  const handleVerifySmtp = async () => {
    if (!smtpEmail.trim()) {
      toast.error('Please enter your Gmail address.');
      return;
    }
    if (!smtpAppPassword.trim()) {
      toast.error('Please enter your 16-character Google App Password.');
      return;
    }

    setIsVerifyingSmtp(true);
    setSmtpVerificationResult(null);

    const res = await verifyGmailSmtpAction(smtpEmail.trim(), smtpAppPassword.trim());
    setIsVerifyingSmtp(false);

    if (res?.success) {
      toast.success(res.message || 'Gmail SMTP connection verified successfully!');
      setSmtpVerificationResult({ success: true, message: res.message });
    } else {
      toast.error(res?.error || 'Failed to connect to Gmail SMTP.');
      setSmtpVerificationResult({ success: false, error: res?.error });
    }
  };

  // Test Verification for httpSMS API Handshake
  const handleVerifyHttpSms = async () => {
    if (!httpsmsApiKey.trim()) {
      toast.error('Please enter your httpSMS Account API Key.');
      return;
    }

    setIsVerifyingHttpSms(true);
    setHttpSmsVerificationResult(null);

    const res = await verifyHttpSmsAction(httpsmsApiKey.trim(), httpsmsFromNumber.trim());
    setIsVerifyingHttpSms(false);

    if (res?.success) {
      toast.success(res.message || 'httpSMS API key authenticated successfully!');
      setHttpSmsVerificationResult({ success: true, message: res.message });
    } else {
      toast.error(res?.error || 'Failed to authenticate with httpSMS.');
      setHttpSmsVerificationResult({ success: false, error: res?.error });
    }
  };

  // Send Test Notification
  const handleSendTest = async (channel: 'email' | 'sms') => {
    if (channel === 'sms') {
      if (!phoneNumber.trim()) {
        toast.error('Please enter a mobile phone number first.');
        return;
      }
      setIsTestingSms(true);
    } else {
      setIsTestingEmail(true);
    }

    // Save first to ensure the active inputs are committed to the DB
    const saveRes = await saveNotificationSettingsAction({
      notifyEmail,
      emailAddress: emailAddress.trim(),
      notifySms,
      phoneNumber: phoneNumber.trim(),
      daysBefore: Number(daysBefore),
      smtpEmail: smtpEmail.trim(),
      smtpAppPassword: smtpAppPassword.trim(),
      httpsmsApiKey: httpsmsApiKey.trim(),
      httpsmsFromNumber: httpsmsFromNumber.trim(),
    });

    if (saveRes?.error) {
      if (channel === 'sms') setIsTestingSms(false);
      if (channel === 'email') setIsTestingEmail(false);
      toast.error(saveRes.error);
      return;
    }

    const res = await sendTestNotificationAction(channel, {
      recipient: channel === 'sms' ? phoneNumber.trim() : emailAddress.trim(),
      apiKey: httpsmsApiKey.trim(),
      fromNumber: httpsmsFromNumber.trim(),
      smtpEmail: smtpEmail.trim(),
      smtpAppPassword: smtpAppPassword.trim(),
    });

    if (channel === 'sms') setIsTestingSms(false);
    if (channel === 'email') setIsTestingEmail(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(res.message);
    }

    // Refresh actual logs from the database
    await fetchLogs(1, false);
  };

  // Run Manual Alert Check and Dispatch
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

    // Refresh logs from database
    await fetchLogs(1, false);
  };

  // Refresh Logs Action
  const handleRefreshLogs = async () => {
    setIsRefreshingLogs(true);
    await fetchLogs(1, false);
    setIsRefreshingLogs(false);
    toast.success('Notification logs refreshed.');
  };

  // Test Gemini API Connection Live
  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    setGeminiTestResult(null);
    const res = await testGeminiConnectionAction();
    setIsTestingGemini(false);
    setGeminiTestResult(res);

    if (res.success) {
      toast.success(`Tenvi AI connection verified (${res.latencyMs}ms)! Model: ${res.model}`);
      const statsRes = await getGeminiUsageStatsAction();
      if (statsRes.stats) setGeminiStats(statsRes.stats);
    } else {
      toast.error(res.error || 'Tenvi AI connection test failed.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Settings & Intelligence Center
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your notification settings, configure templates, inspect delivery logs, and monitor Tenvi AI Vision quota.
        </p>
      </div>

      {/* Navigation Tabs (Settings default, Templates, Logs, AI) */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#F6F7F9] max-w-fit shadow-xs flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4 text-blue-600" />
          Settings
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-600" />
          Templates
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Logs</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {stats.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'ai'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Tenvi AI & Vision</span>
          {geminiStats?.hasKeyConfigured && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          )}
        </button>
      </div>

      {/* TAB 1: SETTINGS (Default) */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Settings Form Column */}
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleSave} className="space-y-6">
                {/* Email Notifications & Destination Box */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          Email Notifications
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Receive an itemized digest of your upcoming card statements in your inbox.
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                    </label>
                  </div>

                  {notifyEmail && (
                    <div className="p-4 rounded-2xl bg-[#F6F7F9] space-y-4 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                          Destination Email Address (Recipient)
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="you@example.com"
                          value={emailAddress}
                          onChange={(e) => setEmailAddress(e.target.value)}
                          className="bili-input w-full text-sm font-medium bg-white"
                        />
                        <p className="text-[11px] text-slate-500 mt-1.5">
                          Your credit card upcoming statement digest will be delivered to this mailbox.
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-slate-500 font-medium">
                          Send sample email digest:
                        </span>
                        <button
                          type="button"
                          disabled={isTestingEmail || !emailAddress}
                          onClick={() => handleSendTest('email')}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Send className="w-3 h-3" />
                          {isTestingEmail ? 'Sending Test...' : 'Send Test Email'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Gmail SMTP Server Configuration Box */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <Server className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900">
                            Gmail SMTP Relay
                          </h2>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wider">
                            smtp.gmail.com:465
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Connect your Google Account to dispatch real notification emails and borrower reminders.
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {smtpEmail && smtpAppPassword ? (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Configured
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5" />
                          Simulation Mode
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-[#F6F7F9] space-y-4">
                    {/* Gmail Address Input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        Gmail Account Address
                      </label>
                      <input
                        type="email"
                        placeholder="yourname@gmail.com"
                        value={smtpEmail}
                        onChange={(e) => {
                          setSmtpEmail(e.target.value);
                          setSmtpVerificationResult(null);
                        }}
                        className="bili-input w-full text-sm font-medium bg-white"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Emails will be delivered with this Gmail account as the verified sender.
                      </p>
                    </div>

                    {/* Google App Password Input */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Google App Password (16 characters)
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowSmtpGuide(!showSmtpGuide)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          {showSmtpGuide ? 'Hide Setup Guide' : 'How to get an App Password?'}
                          {showSmtpGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type={showSmtpPassword ? 'text' : 'password'}
                          placeholder="xxxx xxxx xxxx xxxx"
                          value={smtpAppPassword}
                          onChange={(e) => {
                            setSmtpAppPassword(e.target.value);
                            setSmtpVerificationResult(null);
                          }}
                          className="bili-input w-full text-sm font-mono bg-white pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md"
                          title={showSmtpPassword ? 'Hide password' : 'Show password'}
                        >
                          {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Do not use your regular account password. Google generates dedicated 16-character App Passwords.
                      </p>
                    </div>

                    {/* Step-by-Step Google App Password Guide */}
                    {showSmtpGuide && (
                      <div className="p-4 rounded-xl bg-white space-y-2.5 text-xs text-slate-700 animate-in fade-in duration-150">
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          <Key className="w-4 h-4 text-rose-500" />
                          4 Quick Steps to Create a Google App Password:
                        </div>
                        <ol className="list-decimal list-inside space-y-1.5 text-slate-600 leading-relaxed pl-1">
                          <li>
                            Sign in to your <strong className="text-slate-800">Google Account</strong> and visit the <strong className="text-slate-800">Security</strong> tab.
                          </li>
                          <li>
                            Confirm that <strong className="text-slate-800">2-Step Verification</strong> is turned <strong>ON</strong> (required by Google for SMTP access).
                          </li>
                          <li>
                            Under 2-Step Verification, select <strong className="text-slate-800">App Passwords</strong> (or search "App Passwords" in the Google Account search bar).
                          </li>
                          <li>
                            Give it an app name like <strong className="text-slate-800">Tenvi</strong>, click <strong>Create</strong>, and copy the 16-character code into the field above.
                          </li>
                        </ol>
                        <p className="text-[11px] text-slate-400 pt-1">
                          Note: Any spaces in the app password will be automatically handled.
                        </p>
                      </div>
                    )}

                    {/* Connection Verification Feedback */}
                    {smtpVerificationResult && (
                      <div
                        className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                          smtpVerificationResult.success
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        {smtpVerificationResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-bold">
                            {smtpVerificationResult.success
                              ? 'Handshake Successful'
                              : 'SMTP Handshake Error'}
                          </p>
                          <p className="mt-0.5 leading-relaxed">
                            {smtpVerificationResult.message || smtpVerificationResult.error}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Verification Action Bar */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-500 font-medium">
                        Test SMTP credentials:
                      </span>
                      <button
                        type="button"
                        disabled={isVerifyingSmtp || !smtpEmail || !smtpAppPassword}
                        onClick={handleVerifySmtp}
                        className="text-xs font-semibold text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-50 px-3 py-1.5 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {isVerifyingSmtp ? 'Testing Handshake...' : 'Verify Gmail Connection'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* SMS Mobile Notifications Box */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          SMS Mobile Notifications
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Receive automated text messages on your mobile phone before due dates.
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={notifySms}
                        onChange={(e) => setNotifySms(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                    </label>
                  </div>

                  {notifySms && (
                    <div className="p-4 rounded-2xl bg-[#F6F7F9] space-y-4 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                          Nominated Mobile Phone Number (Recipient)
                        </label>
                        <input
                          type="tel"
                          placeholder="0917 123 4567 or +639171234567"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="bili-input w-full text-sm font-medium bg-white"
                        />
                        <p className="text-[11px] text-slate-500 mt-1.5">
                          Your mobile number to receive card due date alerts (Philippine 09XX or +639XX format).
                        </p>
                      </div>

                      {/* httpSMS Gateway Configuration Box */}
                      <div className="pt-3 border-t border-slate-200/80 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-blue-600" />
                              httpSMS Gateway Configuration
                            </span>
                            <span
                              className={`font-bold px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider ${
                                httpsmsApiKey && httpsmsFromNumber
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {httpsmsApiKey && httpsmsFromNumber ? 'Live Gateway' : 'Simulation'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowHttpSmsGuide(!showHttpSmsGuide)}
                            className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 transition-colors"
                          >
                            <Info className="w-3 h-3" />
                            {showHttpSmsGuide ? 'Hide Setup Guide' : 'Setup Guide'}
                          </button>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-slate-700">
                              httpSMS Account API Key
                            </label>
                            <a
                              href="https://httpsms.com/settings"
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              Get Key from httpsms.com
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>

                          <div className="relative">
                            <input
                              type={showHttpSmsApiKey ? 'text' : 'password'}
                              placeholder="Enter your httpSMS API Key"
                              value={httpsmsApiKey}
                              onChange={(e) => setHttpsmsApiKey(e.target.value)}
                              className="bili-input w-full text-sm font-mono bg-white pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowHttpSmsApiKey(!showHttpSmsApiKey)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md"
                              title={showHttpSmsApiKey ? 'Hide key' : 'Show key'}
                            >
                              {showHttpSmsApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Sender Phone Number (Android Gateway SIM)
                          </label>
                          <input
                            type="tel"
                            placeholder="+639171234567 or 09171234567"
                            value={httpsmsFromNumber}
                            onChange={(e) => setHttpsmsFromNumber(e.target.value)}
                            className="bili-input w-full text-sm font-medium bg-white"
                          />
                          <p className="text-[11px] text-slate-500 mt-1">
                            The phone number of the SIM card inside your Android phone running the httpSMS app.
                          </p>
                        </div>

                        {/* Step-by-Step httpSMS Guide */}
                        {showHttpSmsGuide && (
                          <div className="p-4 rounded-xl bg-white space-y-2.5 text-xs text-slate-700 animate-in fade-in duration-150">
                            <div className="flex items-center gap-2 font-bold text-slate-900">
                              <Smartphone className="w-4 h-4 text-blue-500" />
                              Turn any Android Phone into an SMS Gateway:
                            </div>
                            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 leading-relaxed pl-1">
                              <li>
                                Install the <strong className="text-slate-800">httpSMS</strong> app from Google Play Store on your Android phone.
                              </li>
                              <li>
                                Sign in at <a href="https://httpsms.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">httpsms.com</a> and navigate to <strong className="text-slate-800">Settings</strong> to copy your Account API Key.
                              </li>
                              <li>
                                In the Android app, log in or link your device with your account so it connects as your SMS transmitter.
                              </li>
                              <li>
                                Paste your <strong className="text-slate-800">API Key</strong> and your device SIM number (<strong className="text-slate-800">Sender Number</strong>) above, then click <strong>Verify httpSMS Key</strong>.
                              </li>
                            </ol>
                            <p className="text-[11px] text-slate-400 pt-1">
                              💡 Tip: All outgoing SMS messages will use your phone’s regular carrier plan (e.g. unlimited SMS promo).
                            </p>
                          </div>
                        )}

                        {/* Connection Verification Feedback */}
                        {httpSmsVerificationResult && (
                          <div
                            className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                              httpSmsVerificationResult.success
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-rose-50 text-rose-800'
                            }`}
                          >
                            {httpSmsVerificationResult.success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className="font-bold">
                                {httpSmsVerificationResult.success
                                  ? 'Handshake Successful'
                                  : 'httpSMS Handshake Error'}
                              </p>
                              <p className="mt-0.5 leading-relaxed">
                                {httpSmsVerificationResult.message || httpSmsVerificationResult.error}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            disabled={isVerifyingHttpSms || !httpsmsApiKey}
                            onClick={handleVerifyHttpSms}
                            className="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            {isVerifyingHttpSms ? 'Verifying...' : 'Verify httpSMS Key'}
                          </button>

                          <button
                            type="button"
                            disabled={isTestingSms || !phoneNumber}
                            onClick={() => handleSendTest('sms')}
                            className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Send className="w-3 h-3 text-slate-600" />
                            {isTestingSms ? 'Sending Test SMS...' : 'Send Test SMS'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timing & Schedule Preferences */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Alert Timing & Frequency
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        How early and how often you want to be reminded.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6F7F9] space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        Send Alerts Before Due Date
                      </label>
                      <select
                        value={daysBefore}
                        onChange={(e) => setDaysBefore(Number(e.target.value))}
                        className="bili-input w-full text-sm font-bold bg-white"
                      >
                        <option value={1}>1 Day before due date</option>
                        <option value={2}>2 Days before due date</option>
                        <option value={3}>3 Days before due date (Recommended)</option>
                        <option value={5}>5 Days before due date</option>
                        <option value={7}>7 Days before due date</option>
                      </select>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white space-y-1.5 text-xs text-slate-600">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        How Daily Schedule Works:
                      </p>
                      <p className="text-slate-500 leading-relaxed">
                        Reminders are sent <strong>once a day</strong> starting {daysBefore} days before your payment due date. If multiple cards have upcoming due dates, Tenvi aggregates them into <strong>one consolidated notification</strong> each day to prevent alert clutter.
                      </p>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="bili-btn-primary py-3 px-6 text-sm font-semibold shadow-sm"
                    >
                      {isSaving ? 'Saving Preferences...' : 'Save Notification & SMTP Settings'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Live Status & Due Cards Column */}
            <div className="space-y-6">
              {/* Card Due Status Widget */}
              <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    Cards in Due Window ({upcomingCards.length})
                  </h3>

                  <button
                    onClick={handleCheckAndDispatch}
                    disabled={isCheckingAlerts}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-[#F6F7F9] hover:bg-slate-200/80 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    title="Evaluate cards and run today's alert check"
                  >
                    <RefreshCw className={`w-3 h-3 ${isCheckingAlerts ? 'animate-spin' : ''}`} />
                    Check Now
                  </button>
                </div>

                {upcomingCards.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-[#F6F7F9] text-center space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-800">All clear!</p>
                    <p className="text-[11px] text-slate-500">
                      No cards are due within the next {daysBefore} days.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {upcomingCards.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-[#F6F7F9] flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-800 block">
                            {item.bank_name} {item.name}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            •••• {item.last_4} • Due Day {item.due_day}
                          </span>
                        </div>

                        <span
                          className={`font-bold px-2.5 py-1 rounded-full text-[11px] ${
                            item.dueInfo.urgency === 'critical'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.dueInfo.label}
                        </span>
                      </div>
                    ))}

                    <button
                      onClick={handleCheckAndDispatch}
                      disabled={isCheckingAlerts}
                      className="w-full text-xs font-semibold text-slate-800 bg-[#F6F7F9] hover:bg-slate-200/80 py-2.5 rounded-xl transition-colors text-center"
                    >
                      {isCheckingAlerts ? 'Checking & Dispatching...' : "Send Today's Reminder Now"}
                    </button>
                  </div>
                )}
              </div>

              {/* Quick SMTP Diagnostics Card */}
              <div className="bg-white rounded-3xl p-6 shadow-sm space-y-3.5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Server className="w-4 h-4 text-rose-600" />
                  SMTP Delivery Engine
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-2xl bg-[#F6F7F9] flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Relay Host</span>
                    <span className="font-bold text-slate-800">smtp.gmail.com</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#F6F7F9] flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Port / Security</span>
                    <span className="font-bold text-slate-800">465 (SSL / TLS)</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#F6F7F9] flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Authenticated Account</span>
                    <span className="font-bold text-slate-800 truncate max-w-[150px]">
                      {smtpEmail || 'Not Configured'}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#F6F7F9] flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Operating Mode</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider ${
                        smtpEmail && smtpAppPassword
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {smtpEmail && smtpAppPassword ? 'Live Gmail SMTP' : 'Simulation'}
                    </span>
                  </div>
                </div>

                {/* httpSMS Gateway Diagnostics */}
                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 pb-1">
                    <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                    httpSMS Gateway Engine
                  </div>
                  <div className="p-3 rounded-2xl bg-[#F6F7F9] flex items-center justify-between">
                    <span className="text-slate-500 font-medium">API Endpoint</span>
                    <span className="font-bold text-slate-800">api.httpsms.com</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#F6F7F9] flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Sender Device SIM</span>
                    <span className="font-bold text-slate-800 truncate max-w-[150px]">
                      {httpsmsFromNumber || 'Not Configured'}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#F6F7F9] flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Operating Mode</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider ${
                        httpsmsApiKey && httpsmsFromNumber
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {httpsmsApiKey && httpsmsFromNumber ? 'Live Gateway' : 'Simulation'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('logs')}
                    className="w-full text-xs font-semibold text-slate-700 hover:text-slate-900 bg-[#F6F7F9] hover:bg-slate-200/80 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Inspect Delivery Logs ({stats.total})
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('templates')}
                    className="w-full text-xs font-semibold text-slate-700 hover:text-slate-900 bg-[#F6F7F9] hover:bg-slate-200/80 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Edit Alert Templates
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="animate-in fade-in duration-150">
          <NotificationTemplatesEditor initialSettings={initialSettings} />
        </div>
      )}

      {/* TAB 3: LOGS (With Optimized Search & Lazy Loading) */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                    Email & Notification Delivery Logs
                  </h2>
                  <p className="text-xs text-slate-500">
                    Search, filter, and inspect delivery status, subject lines, recipients, and diagnostic errors.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleRefreshLogs}
              disabled={isRefreshingLogs || isLoadingLogs}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-[#F6F7F9] hover:bg-slate-200/80 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
              {isRefreshingLogs ? 'Refreshing...' : 'Refresh Logs'}
            </button>
          </div>

          {/* Aggregate Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#F6F7F9] space-y-0.5">
              <span className="text-[11px] text-slate-500 font-medium">Total Events</span>
              <p className="text-lg font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 space-y-0.5">
              <span className="text-[11px] text-emerald-700 font-medium">Delivered (Sent)</span>
              <p className="text-lg font-bold text-emerald-800">{stats.sent}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50/60 space-y-0.5">
              <span className="text-[11px] text-amber-700 font-medium">Simulated / Fallback</span>
              <p className="text-lg font-bold text-amber-800">{stats.simulated}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50/60 space-y-0.5">
              <span className="text-[11px] text-rose-700 font-medium">Failed Dispatches</span>
              <p className="text-lg font-bold text-rose-800">{stats.failed}</p>
            </div>
          </div>

          {/* Search Bar & Filters Controls */}
          <div className="space-y-3.5">
            {/* Optimized Search Input Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search by subject, recipient, card name, error reason, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bili-input w-full pl-10 pr-10 text-xs sm:text-sm font-medium bg-[#F6F7F9] focus:bg-white placeholder:text-slate-400 transition-colors"
              />
              {isLoadingLogs ? (
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                </div>
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>

            {/* Channel & Status Filter Tabs Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
              {/* Channel Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F6F7F9]">
                <button
                  type="button"
                  onClick={() => setChannelFilter('all')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                    channelFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Channels ({stats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setChannelFilter('email')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 ${
                    channelFilter === 'email'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 text-emerald-600" />
                  Email Logs ({stats.email})
                </button>
                <button
                  type="button"
                  onClick={() => setChannelFilter('sms')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 ${
                    channelFilter === 'sms'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                  SMS Logs ({stats.sms})
                </button>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium mr-1">Status:</span>
                {(['all', 'sent', 'simulated', 'failed'] as const).map((st) => {
                  const countMap = {
                    all: stats.total,
                    sent: stats.sent,
                    simulated: stats.simulated,
                    failed: stats.failed,
                  };
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-xl transition-colors capitalize flex items-center gap-1 ${
                        statusFilter === st
                          ? 'bg-slate-900 text-white'
                          : 'bg-[#F6F7F9] text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>{st === 'all' ? 'All' : st}</span>
                      <span className="text-[10px] opacity-75 font-mono">({countMap[st]})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Showing Count & Reset Filter Indicator */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>
                Showing <strong className="text-slate-800">{logs.length}</strong> of{' '}
                <strong className="text-slate-800">{totalCount}</strong> matching records
                {debouncedSearch ? (
                  <>
                    {' '}
                    for query &quot;<strong className="text-slate-800">{debouncedSearch}</strong>&quot;
                  </>
                ) : null}
              </span>
              {(searchQuery || channelFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setChannelFilter('all');
                    setStatusFilter('all');
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Logs List Content */}
          {isLoadingLogs ? (
            <div className="p-12 rounded-3xl bg-[#F6F7F9] text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-slate-500 mx-auto" />
              <p className="text-xs font-medium text-slate-500">Searching and fetching logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 rounded-3xl bg-[#F6F7F9] text-center space-y-2">
              <Mail className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-800">No matching delivery logs</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {debouncedSearch
                  ? `No notification logs matched "${debouncedSearch}". Try a different search keyword or reset filters.`
                  : channelFilter !== 'all' || statusFilter !== 'all'
                  ? 'No notification logs match your active filters. Try selecting All Channels or All Statuses.'
                  : 'No notifications recorded yet. Click "Send Test Email" or "Send Test SMS" in Settings to generate your first delivery log.'}
              </p>
              {(debouncedSearch || channelFilter !== 'all' || statusFilter !== 'all') && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setChannelFilter('all');
                      setStatusFilter('all');
                    }}
                    className="text-xs font-semibold px-4 py-2 rounded-xl bg-white text-slate-800 hover:bg-slate-100 shadow-xs transition-colors"
                  >
                    Clear Search & Filters
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const isEmail = log.channel === 'email';

                return (
                  <div
                    key={log.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#F6F7F9] space-y-3 transition-colors hover:bg-slate-100/70"
                  >
                    {/* Top Bar: Channel, Status, Timestamp */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Channel Pill */}
                        <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider px-2.5 py-1 rounded-lg bg-white shadow-xs flex items-center gap-1.5">
                          {isEmail ? (
                            <>
                              <Mail className="w-3 h-3 text-emerald-600" />
                              Email • Gmail SMTP
                            </>
                          ) : (
                            <>
                              <Smartphone className="w-3 h-3 text-blue-600" />
                              SMS • Cellular
                            </>
                          )}
                        </span>

                        {/* Status Pill */}
                        {log.status === 'sent' && (
                          <span className="font-bold text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Sent / Delivered
                          </span>
                        )}
                        {log.status === 'simulated' && (
                          <span className="font-bold text-[11px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 flex items-center gap-1">
                            <Info className="w-3 h-3 text-amber-600" />
                            Simulated
                          </span>
                        )}
                        {log.status === 'failed' && (
                          <span className="font-bold text-[11px] px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(log.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Subject and Recipient */}
                    <div>
                      {isEmail && log.email_subject ? (
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">
                          {log.email_subject}
                        </h4>
                      ) : (
                        <h4 className="text-sm font-bold text-slate-900">
                          {isEmail ? 'Card Statement Digest' : 'Mobile Bill Alert'}
                        </h4>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-600">
                        <span>
                          Recipient: <strong className="text-slate-800">{log.recipient}</strong>
                        </span>
                        {log.card_names && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] font-medium text-slate-500">
                              Cards: {log.card_names}
                            </span>
                          </>
                        )}
                        {log.loan_id && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                              Borrower Loan Reminder
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Diagnostic / Error Message Callout */}
                    {log.error_message && (
                      <div className="p-3 rounded-xl bg-rose-50 text-rose-900 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-bold block">Delivery Diagnostic Notice:</span>
                          <p className="font-mono text-[11px] leading-relaxed text-rose-800">
                            {log.error_message}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Toggle Message Body Details */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            Hide Message Content
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            View Dispatched Message
                          </>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-3.5 rounded-xl bg-white space-y-2 animate-in fade-in duration-150">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Message Body:
                          </span>
                          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-[#F6F7F9] p-3 rounded-lg">
                            {log.message_body}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Lazy Loading Pagination Controls */}
              {hasMore ? (
                <div className="pt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#F6F7F9] hover:bg-slate-200/80 text-xs sm:text-sm font-bold text-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                        Loading next batch...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 text-slate-600" />
                        Load More Logs ({totalCount - logs.length} remaining)
                      </>
                    )}
                  </button>
                </div>
              ) : logs.length > 0 ? (
                <div className="pt-4 text-center">
                  <p className="text-xs text-slate-400 font-medium">
                    ✓ All {totalCount} delivery log{totalCount === 1 ? '' : 's'} loaded
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AI & GEMINI VISION QUOTA MONITOR */}
      {activeTab === 'ai' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Hero Status Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    Tenvi AI Vision & Intelligence Engine
                  </h2>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      geminiStats?.hasKeyConfigured
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {geminiStats?.hasKeyConfigured ? 'Active & Connected' : 'Offline Mode'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Tenvi AI leverages high-precision multimodal vision and conversational intelligence to parse statements and automate wealth tracking.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestGemini}
              disabled={isTestingGemini}
              className="bili-btn-primary py-2.5 px-5 text-xs font-semibold shadow-sm flex items-center gap-2 shrink-0 self-start sm:self-center"
            >
              {isTestingGemini ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing Ping...
                </>
              ) : (
                <>
                  <Server className="w-4 h-4" />
                  Test API Connection Live
                </>
              )}
            </button>
          </div>

          {/* Test Result Toast/Banner */}
          {geminiTestResult && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
                geminiTestResult.success
                  ? 'bg-emerald-50 text-emerald-900'
                  : 'bg-rose-50 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {geminiTestResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />
                )}
                <div>
                  <span className="font-bold block">
                    {geminiTestResult.success
                      ? `Tenvi AI Connection Verified (${geminiTestResult.latencyMs}ms round-trip)`
                      : 'Connection Test Failed'}
                  </span>
                  <span className="text-[11px] opacity-80">
                    {geminiTestResult.success
                      ? `Tenvi Intelligence Engine (${geminiTestResult.model}) responded successfully. Your AI pipeline is ready!`
                      : geminiTestResult.error}
                  </span>
                </div>
              </div>

              <span className="font-mono text-[11px] font-bold shrink-0">
                {geminiTestResult.latencyMs}ms
              </span>
            </div>
          )}

          {/* Quota & Consumption Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Daily Requests */}
            <div className="bg-white rounded-3xl p-6 shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Daily Requests Used
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {geminiStats?.dailyRequestsUsed || 0}
                <span className="text-sm font-normal text-slate-400 ml-1">
                  / {geminiStats?.dailyRequestsLimit || 1500}
                </span>
              </div>
              <p className="text-xs text-emerald-700 font-semibold">
                {geminiStats?.dailyRemainingRequests ?? 1500} free requests remaining today
              </p>
            </div>

            {/* Rate Limit */}
            <div className="bg-white rounded-3xl p-6 shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Burst Rate Limit
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {geminiStats?.minuteRateLimit || 15}
                <span className="text-sm font-normal text-slate-400 ml-1">RPM</span>
              </div>
              <p className="text-xs text-slate-500">
                Up to 15 requests per minute allowed on free tier
              </p>
            </div>

            {/* Tokens Processed */}
            <div className="bg-white rounded-3xl p-6 shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Tokens Processed Today
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {(geminiStats?.tokensUsedToday || 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-500">
                Cap: 1,000,000 tokens / min (TPM)
              </p>
            </div>

            {/* Daily Reset Countdown */}
            <div className="bg-white rounded-3xl p-6 shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Daily Quota Reset
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                ~{geminiStats?.resetHoursRemaining || 24}h
              </div>
              <p className="text-xs text-slate-500">
                Resets daily at 00:00 UTC (8:00 AM PHT)
              </p>
            </div>
          </div>

          {/* Daily Consumption Progress Meter Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Daily Free Quota Consumption
                </h3>
                <p className="text-xs text-slate-500">
                  Tenvi AI High-Speed Allocation (1,500 requests / day).
                </p>
              </div>

              <span className="text-sm font-extrabold text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-xl">
                {geminiStats?.dailyPercentUsed || 0}% Consumed
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (geminiStats?.dailyPercentUsed || 0) > 85
                    ? 'bg-rose-500'
                    : (geminiStats?.dailyPercentUsed || 0) > 50
                    ? 'bg-amber-500'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.max(2, geminiStats?.dailyPercentUsed || 0)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>0 requests</span>
              <span>750 requests (50%)</span>
              <span>1,500 requests (Daily Cap)</span>
            </div>
          </div>

          {/* Configuration & Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Key & Models Configuration */}
            <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-xs uppercase font-bold text-slate-400 tracking-wider">
                <Key className="w-4 h-4 text-indigo-600" />
                Engine & Key Configuration
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#F6F7F9] flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Configured Key:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {geminiStats?.maskedKey || 'Not Configured'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F6F7F9] flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Key Storage:</span>
                  <span className="font-mono text-slate-800">.env.local (GEMINI_API_KEY)</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F6F7F9] flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Primary Vision Model:</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg">
                    gemini-flash-latest
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F6F7F9] flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Secondary Fallback:</span>
                  <span className="font-medium text-slate-700">gemini-2.5-flash-lite</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F6F7F9] flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Local Offline Engine:</span>
                  <span className="font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                    pdf-parse + tesseract.js
                  </span>
                </div>
              </div>
            </div>

            {/* Feature Usage Breakdown */}
            <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-xs uppercase font-bold text-slate-400 tracking-wider">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Usage Breakdown Today
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-indigo-950 block">Statement Vision Scans</span>
                    <span className="text-[11px] text-indigo-700">
                      PDF statements & receipt photos
                    </span>
                  </div>
                  <span className="text-lg font-extrabold text-indigo-950">
                    {geminiStats?.usageByFeature.statementVision || 0}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-emerald-950 block">AI Wealth Chat Assistant</span>
                    <span className="text-[11px] text-emerald-700">
                      Natural language prompt entries
                    </span>
                  </div>
                  <span className="text-lg font-extrabold text-emerald-950">
                    {geminiStats?.usageByFeature.aiChat || 0}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block">Health & Latency Tests</span>
                    <span className="text-[11px] text-slate-500">Manual connection tests</span>
                  </div>
                  <span className="text-lg font-extrabold text-slate-800">
                    {geminiStats?.usageByFeature.other || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Zero Downtime & Safety Box */}
          <div className="p-5 rounded-3xl bg-blue-50/70 text-xs text-blue-950 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
              <h4 className="font-bold text-sm">Tenvi Zero-Downtime Guarantee</h4>
            </div>
            <p className="leading-relaxed opacity-90">
              Even if you ever exceed the 1,500 daily free requests, lose internet connection to Google, or remove your API key, Tenvi will automatically and transparently switch to its built-in local PDF and OCR parser. Your statements will continue to parse with zero interruptions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
