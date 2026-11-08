'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Send,
  Mail,
  Users,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Eye,
  Loader2,
  Check,
  AlertTriangle,
  FileText,
  Radio,
  ExternalLink,
  Bell,
  MessageSquare,
  ShieldCheck,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  getBroadcastStatsAction,
  getBroadcastHistoryAction,
  sendEmailBroadcastAction,
  BroadcastRecord,
  BroadcastCategory,
  BroadcastAudience,
} from '@/app/actions/admin/broadcast';
import { formatDate } from '@/lib/finance/calculations';
import { toast } from 'sonner';

export function BroadcastClient() {
  const [stats, setStats] = useState({
    totalBroadcasts: 0,
    totalDelivered: 0,
    activeMemberCount: 0,
    smtpConfigured: false,
    smtpUser: '',
    adminEmail: '',
  });
  const [history, setHistory] = useState<BroadcastRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<BroadcastCategory>('feature_update');
  const [audience, setAudience] = useState<BroadcastAudience>('all_members');
  const [message, setMessage] = useState('');
  const [sendInApp, setSendInApp] = useState(true);

  // Confirmation Modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSending, startSending] = useTransition();

  // Inspect Past Broadcast Modal
  const [viewingBroadcast, setViewingBroadcast] = useState<BroadcastRecord | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, historyRes] = await Promise.all([
        getBroadcastStatsAction(),
        getBroadcastHistoryAction(),
      ]);

      if (!statsRes.error) {
        setStats(statsRes);
      }
      if (!historyRes.error) {
        setHistory(historyRes.broadcasts || []);
      }
    } catch {
      toast.error('Failed to load broadcast telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendTestToSelf = () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Please enter both a subject line and a message body');
      return;
    }

    startSending(async () => {
      const res = await sendEmailBroadcastAction({
        subject,
        category,
        message,
        audience: 'test_only',
        send_in_app: false,
      });

      if (res.success) {
        toast.success(`Test email sent to ${stats.adminEmail || 'admin email'}!`);
        loadData();
      } else {
        toast.error(res.error || 'Failed to dispatch test email');
      }
    });
  };

  const handleConfirmBroadcast = () => {
    startSending(async () => {
      const res = await sendEmailBroadcastAction({
        subject,
        category,
        message,
        audience,
        send_in_app: sendInApp,
      });

      setConfirmOpen(false);

      if (res.success) {
        const count = res.sentCount || res.simulatedCount || 0;
        const mode = res.simulatedCount && !res.sentCount ? ' (Simulation mode)' : '';
        toast.success(`Broadcast successfully dispatched to ${count} recipient(s)${mode}!`);
        setSubject('');
        setMessage('');
        loadData();
      } else {
        toast.error(res.error || 'Failed to dispatch broadcast');
      }
    });
  };

  const categoryPills: { category: BroadcastCategory; label: string; color: string; bg: string }[] = [
    { category: 'feature_update', label: 'Feature update', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-500/12' },
    { category: 'announcement', label: 'Announcement', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-500/12' },
    { category: 'maintenance', label: 'Maintenance', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-500/15' },
    { category: 'security_notice', label: 'Security notice', color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  function getCategoryBadge(cat: BroadcastCategory) {
    const p = categoryPills.find((item) => item.category === cat) || categoryPills[0];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${p.bg} ${p.color}`}>
        {p.label}
      </span>
    );
  }

  const selectedRecipientEstimate =
    audience === 'all_members'
      ? stats.activeMemberCount
      : audience === 'admins_only'
      ? 1
      : 1;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Mail className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-display text-foreground">Email broadcast & announcements</h1>
            <p className="mt-1 max-w-prose text-sm sm:text-base text-muted-foreground">
              Dispatch platform announcements, update notes, and system notices directly to member inboxes.
            </p>
          </div>
        </div>

        <div className="page-header-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            aria-busy={loading}
            className="gap-1.5"
          >
            <RotateCcw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh stats
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid-fluid gap-3 sm:gap-4 [--grid-min:9.5rem]">
        <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-card p-5 shadow-card">
          <span className="text-label text-muted-foreground">Total broadcasts</span>
          <span className="num text-figure text-foreground">{stats.totalBroadcasts}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-card p-5 shadow-card">
          <span className="text-label text-muted-foreground">Emails delivered</span>
          <span className="num text-figure text-foreground">{stats.totalDelivered}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-card p-5 shadow-card">
          <span className="text-label text-muted-foreground">Active members</span>
          <span className="text-figure text-foreground">
            <span className="num">{stats.activeMemberCount}</span>{' '}
            <span className="text-sm font-medium text-muted-foreground">
              {stats.activeMemberCount === 1 ? 'recipient' : 'recipients'}
            </span>
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-card p-5 shadow-card">
          <span className="text-label text-muted-foreground">SMTP gateway</span>
          {stats.smtpConfigured ? (
            <div className="flex min-w-0 flex-col gap-0.5 pt-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-success">
                <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                Live Gmail SMTP
              </span>
              {stats.smtpUser && (
                <span className="truncate font-mono text-xs text-muted-foreground" title={stats.smtpUser}>
                  {stats.smtpUser}
                </span>
              )}
            </div>
          ) : (
            <span className="flex items-center gap-1.5 pt-1 text-sm font-semibold text-amber-700 dark:text-amber-400">
              <span className="size-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
              Simulation mode
            </span>
          )}
        </div>
      </div>

      {/* Composer & live preview */}
      <div className="grid grid-cols-1 @5xl/main:grid-cols-12 gap-6 items-start">
        {/* Composer */}
        <div className="@5xl/main:col-span-7 flex min-w-0 flex-col gap-6 rounded-2xl bg-card p-5 sm:p-6 shadow-card">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="flex items-center gap-2 text-title text-foreground">
              <Send className="size-4 text-primary" />
              Compose announcement
            </h2>
            <span className="text-label text-muted-foreground">
              Targeting about <span className="num">{selectedRecipientEstimate}</span>{' '}
              {selectedRecipientEstimate === 1 ? 'recipient' : 'recipients'}
            </span>
          </div>

          {/* Audience Selection */}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-label text-foreground">Target audience</legend>
            <div className="grid-fluid gap-2 [--grid-min:10rem]">
              {[
                { key: 'all_members' as const, icon: Users, title: 'All members', sub: `${stats.activeMemberCount} members` },
                { key: 'admins_only' as const, icon: ShieldAlert, title: 'Admins only', sub: 'Internal test' },
                { key: 'test_only' as const, icon: Mail, title: 'Test to self', sub: 'Admin inbox' },
              ].map((opt) => {
                const Icon = opt.icon;
                const selected = audience === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setAudience(opt.key)}
                    className={`no-spring flex min-h-14 min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left cursor-pointer outline-none transition-colors duration-(--motion-fast) ease-(--ease-in-out) focus-visible:ring-2 focus-visible:ring-ring ${
                      selected
                        ? 'bg-primary/10 text-primary ring-1 ring-primary/40'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="min-w-0">
                      <span className={`block truncate text-sm ${selected ? 'font-semibold' : 'font-medium'}`}>{opt.title}</span>
                      <span className="block truncate text-xs opacity-80">{opt.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Category Pills */}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-label text-foreground">Announcement category</legend>
            <div className="flex flex-wrap items-center gap-2">
              {categoryPills.map((cp) => (
                <button
                  key={cp.category}
                  type="button"
                  aria-pressed={category === cp.category}
                  onClick={() => setCategory(cp.category)}
                  className={`no-spring h-10 rounded-full px-4 text-sm cursor-pointer outline-none transition-colors duration-(--motion-fast) ease-(--ease-in-out) focus-visible:ring-2 focus-visible:ring-ring ${
                    category === cp.category
                      ? `${cp.bg} ${cp.color} font-semibold`
                      : 'bg-muted/50 font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {cp.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Subject Line */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="broadcast-subject" className="text-label text-foreground">
                Email subject line
              </label>
              <span className="num text-xs text-muted-foreground">{subject.length}/140</span>
            </div>
            <input
              id="broadcast-subject"
              type="text"
              maxLength={140}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Tenvi Platform Update: New Support Ticket Desk & Bug Tracker Live!"
              className="h-12 w-full min-w-0 rounded-xl bg-muted/60 px-4 text-base text-foreground outline-none placeholder:text-muted-foreground/80 transition-shadow duration-(--motion-fast) ease-(--ease-in-out) focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Message Body */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="broadcast-message" className="text-label text-foreground">
                Announcement message
              </label>
              <span className="num text-xs text-muted-foreground">{message.length}/4000</span>
            </div>
            <textarea
              id="broadcast-message"
              rows={7}
              maxLength={4000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your announcement message here. Separate paragraphs with double enter for clean spacing in the email template..."
              className="w-full min-w-0 rounded-xl bg-muted/60 px-4 py-3 text-base leading-relaxed text-foreground outline-none resize-y placeholder:text-muted-foreground/80 transition-shadow duration-(--motion-fast) ease-(--ease-in-out) focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* In-App Notification Toggle */}
          <label
            htmlFor="send-in-app"
            className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-muted/50 p-4"
          >
            <span className="flex min-w-0 items-start gap-3">
              <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bell className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">Also send in-app notification</span>
                <span className="block text-xs leading-snug text-muted-foreground">
                  Recipients will also receive an unread alert badge on their dashboard bell.
                </span>
              </span>
            </span>
            <input
              type="checkbox"
              id="send-in-app"
              checked={sendInApp}
              onChange={(e) => setSendInApp(e.target.checked)}
              className="size-5 shrink-0 accent-primary rounded cursor-pointer"
            />
          </label>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendTestToSelf}
              disabled={isSending || !subject.trim() || !message.trim()}
              className="gap-1.5"
            >
              <Mail className="size-4" />
              <span>Send test email to me</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={isSending || !subject.trim() || !message.trim()}
              aria-busy={isSending}
              className="gap-1.5 px-5"
            >
              {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              <span>
                Broadcast to members (<span className="num">{selectedRecipientEstimate}</span>)
              </span>
            </Button>
          </div>
        </div>

        {/* Live Email Preview */}
        <div className="@5xl/main:col-span-5 flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="flex items-center gap-1.5 text-label text-foreground">
              <Eye className="size-4 text-primary" />
              Recipient email preview
            </h2>
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              HTML output
            </span>
          </div>

          {/* Email Preview Card */}
          <div className="overflow-hidden rounded-2xl bg-card shadow-card">
            {/* Window bar */}
            <div className="flex items-center justify-between gap-3 bg-muted/70 px-4 py-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-red-400" />
                <span className="size-2.5 rounded-full bg-amber-400" />
                <span className="size-2.5 rounded-full bg-emerald-400" />
              </div>
              <span className="min-w-0 truncate font-mono">From: Tenvi &lt;noreply@tenvi.app&gt;</span>
            </div>

            {/* Email Canvas */}
            <div className="bg-slate-100 p-4 sm:p-6 dark:bg-slate-900/60">
              <div className="flex flex-col gap-4 rounded-xl bg-white p-5 sm:p-6 shadow-sm dark:bg-slate-950">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Tenvi</span>
                  {getCategoryBadge(category)}
                </div>

                <h3 className="text-base font-bold leading-snug text-slate-900 dark:text-white">
                  {subject.trim() || 'Subject: Announcement headline will appear here'}
                </h3>

                <div className="flex flex-col gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  <p className="font-semibold text-slate-900 dark:text-white">Hello Member,</p>
                  {message.trim() ? (
                    message
                      .split('\n\n')
                      .map((paragraph, idx) => (
                        <p key={idx} className="whitespace-pre-wrap">
                          {paragraph}
                        </p>
                      ))
                  ) : (
                    <p className="italic text-slate-500">
                      Your announcement body content will be formatted into readable paragraphs here...
                    </p>
                  )}
                </div>

                <div className="pt-1">
                  <span className="inline-block rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white">
                    Open Your Tenvi Dashboard &rarr;
                  </span>
                </div>

                <div className="mt-2 flex flex-col gap-0.5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <p className="font-semibold text-slate-600 dark:text-slate-300">Tenvi — Personal Wealth Infrastructure</p>
                  <p>This message was broadcast by the Tenvi administration team.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast History */}
      <section className="flex flex-col gap-4 rounded-2xl bg-card p-5 sm:p-6 shadow-card">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="flex items-center gap-2 text-title text-foreground">
            <Clock className="size-4 text-primary" />
            Broadcast history
          </h2>
          <span className="text-label text-muted-foreground">
            <span className="num">{history.length}</span> {history.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-xl bg-muted/40 px-6 py-12 text-center text-sm text-muted-foreground">
            <Mail className="mb-1 size-6 opacity-50" />
            <p className="font-semibold text-foreground">No broadcast announcements sent yet</p>
            <p className="text-xs">Use the composer above to dispatch your first update.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((b) => (
              <li
                key={b.id}
                className="flex flex-col gap-3 rounded-xl bg-muted/40 p-4 @2xl/main:flex-row @2xl/main:items-center @2xl/main:justify-between"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {getCategoryBadge(b.category)}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {formatDate(b.created_at)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Audience: {b.audience.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="truncate text-sm font-semibold text-foreground" title={b.subject}>
                    {b.subject}
                  </h3>
                  <p className="truncate text-xs text-muted-foreground">{b.message}</p>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 @2xl/main:justify-end">
                  <div className="flex flex-col @2xl/main:items-end">
                    <span className="num text-sm font-semibold text-foreground">
                      {(b.sent_count || 0) + (b.simulated_count || 0)} / {b.recipient_count} delivered
                    </span>
                    <span className="num text-xs text-muted-foreground">
                      {[
                        b.sent_count > 0 ? `${b.sent_count} live` : '',
                        b.simulated_count > 0 ? `${b.simulated_count} simulated` : '',
                        b.failed_count > 0 ? `${b.failed_count} failed` : '',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => setViewingBroadcast(b)}>
                    View
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Confirmation Dialog Before Mass Send */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-5 shrink-0" />
              <DialogTitle className="text-title text-foreground">Confirm email broadcast</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              You are about to dispatch an announcement email to{' '}
              <strong className="num">
                {selectedRecipientEstimate} {selectedRecipientEstimate === 1 ? 'recipient' : 'recipients'}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4 text-sm my-1">
            <div>
              <span className="text-label text-muted-foreground block">Subject</span>
              <p className="font-semibold text-foreground break-words">{subject}</p>
            </div>
            <div>
              <span className="text-label text-muted-foreground block">Audience</span>
              <p className="font-semibold text-foreground capitalize">{audience.replace('_', ' ')}</p>
            </div>
            {sendInApp && (
              <p className="text-xs text-primary font-semibold flex items-center gap-1.5">
                <Check className="size-3.5 shrink-0" />
                In-app notification bell alert will also be triggered
              </p>
            )}
            <div className="text-xs text-muted-foreground flex items-start gap-1.5">
              <ShieldCheck className="size-3.5 mt-0.5 text-success shrink-0" />
              <span>Anti-ban pacing active: sends with 1.5s interval delay to protect Gmail reputation.</span>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmBroadcast}
              disabled={isSending}
              aria-busy={isSending}
              className="gap-1.5"
            >
              {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send broadcast now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Past Broadcast Modal */}
      <Dialog open={Boolean(viewingBroadcast)} onOpenChange={(open) => !open && setViewingBroadcast(null)}>
        <DialogContent className="sm:max-w-lg p-6 space-y-4">
          {viewingBroadcast && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  {getCategoryBadge(viewingBroadcast.category)}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(viewingBroadcast.created_at)}
                  </span>
                </div>
                <DialogTitle className="text-title text-foreground pt-1 break-words">
                  {viewingBroadcast.subject}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Sent to <span className="num">{viewingBroadcast.recipient_count}</span>{' '}
                  {viewingBroadcast.recipient_count === 1 ? 'recipient' : 'recipients'} ({viewingBroadcast.audience.replace('_', ' ')})
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-xl bg-muted/50 text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed max-h-60 overflow-y-auto">
                {viewingBroadcast.message}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
                <span>Sender: {viewingBroadcast.admin_name || 'Administrator'}</span>
                <span className="num">
                  Delivered: {viewingBroadcast.sent_count + viewingBroadcast.simulated_count} / {viewingBroadcast.recipient_count}
                </span>
              </div>

              <DialogFooter>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewingBroadcast(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
