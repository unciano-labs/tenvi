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
    { category: 'feature_update', label: 'Feature Update', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30' },
    { category: 'announcement', label: 'Announcement', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' },
    { category: 'maintenance', label: 'Maintenance', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
    { category: 'security_notice', label: 'Security Notice', color: 'text-destructive', bg: 'bg-destructive/15 border-destructive/30' },
  ];

  function getCategoryBadge(cat: BroadcastCategory) {
    const p = categoryPills.find((item) => item.category === cat) || categoryPills[0];
    return (
      <span className={`px-2 py-0.5 rounded-full text-3xs font-extrabold uppercase border ${p.bg} ${p.color}`}>
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
    <div className="space-y-6 pb-16 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Mail className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Email Broadcast & Announcements
              </h1>
              <p className="text-xs text-muted-foreground">
                Dispatch platform announcements, update notes, and system notices directly to member inboxes.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="cursor-pointer gap-1.5 self-start sm:self-auto"
        >
          <RotateCcw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
          <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider block">
            Total Broadcasts
          </span>
          <span className="text-xl font-black text-foreground mt-0.5 block">{stats.totalBroadcasts}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
          <span className="text-2xs font-bold text-primary uppercase tracking-wider block">
            Emails Delivered
          </span>
          <span className="text-xl font-black text-foreground mt-0.5 block">{stats.totalDelivered}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
          <span className="text-2xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Active Members
          </span>
          <span className="text-xl font-black text-foreground mt-0.5 block">
            {stats.activeMemberCount} Recipients
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
          <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider block">
            SMTP Gateway
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            {stats.smtpConfigured ? (
              <>
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
                  Live Gmail SMTP
                </span>
              </>
            ) : (
              <>
                <span className="size-2 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  Simulation Mode
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Two-Column: Composer & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Email Blast Composer (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-card border border-border/60 shadow-xs p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2 text-foreground font-bold text-sm">
              <Send className="size-4 text-primary" />
              <span>Compose Announcement</span>
            </div>
            <span className="text-3xs text-muted-foreground font-mono">
              Targeting: ~{selectedRecipientEstimate} recipient(s)
            </span>
          </div>

          {/* Audience Selection */}
          <div className="space-y-2">
            <label className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
              Target Audience
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAudience('all_members')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  audience === 'all_members'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                    : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Users className="size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs truncate">All Members</p>
                  <p className="text-3xs opacity-80 font-normal truncate">{stats.activeMemberCount} members</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAudience('admins_only')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  audience === 'admins_only'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                    : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <ShieldAlert className="size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs truncate">Admins Only</p>
                  <p className="text-3xs opacity-80 font-normal truncate">Internal test</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAudience('test_only')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  audience === 'test_only'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                    : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Mail className="size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs truncate">Test to Self</p>
                  <p className="text-3xs opacity-80 font-normal truncate">Admin inbox</p>
                </div>
              </button>
            </div>
          </div>

          {/* Category Pills */}
          <div className="space-y-2">
            <label className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
              Announcement Category
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {categoryPills.map((cp) => (
                <button
                  key={cp.category}
                  type="button"
                  onClick={() => setCategory(cp.category)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    category === cp.category
                      ? `${cp.bg} ${cp.color} font-bold shadow-2xs`
                      : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {cp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject Line */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-2xs">
              <label className="font-bold uppercase tracking-wider text-muted-foreground">
                Email Subject Line
              </label>
              <span className="text-muted-foreground">{subject.length}/140</span>
            </div>
            <input
              type="text"
              maxLength={140}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Tenvi Platform Update: New Support Ticket Desk & Bug Tracker Live!"
              className="w-full text-xs p-3 rounded-xl bg-muted/30 border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground transition-all"
            />
          </div>

          {/* Message Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-2xs">
              <label className="font-bold uppercase tracking-wider text-muted-foreground">
                Announcement Message
              </label>
              <span className="text-muted-foreground">{message.length}/4000</span>
            </div>
            <textarea
              rows={7}
              maxLength={4000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your announcement message here. Separate paragraphs with double enter for clean spacing in the email template..."
              className="w-full text-xs p-3 rounded-xl bg-muted/30 border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground resize-y leading-relaxed transition-all"
            />
          </div>

          {/* In-App Notification Toggle */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bell className="size-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Also send in-app notification</p>
                <p className="text-3xs text-muted-foreground">
                  Recipients will also receive an unread alert badge on their dashboard bell.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              id="send-in-app"
              checked={sendInApp}
              onChange={(e) => setSendInApp(e.target.checked)}
              className="size-4 accent-primary rounded cursor-pointer"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendTestToSelf}
              disabled={isSending || !subject.trim() || !message.trim()}
              className="cursor-pointer gap-1.5 text-xs h-9"
            >
              <Mail className="size-3.5" />
              <span>Send Test Email to Me</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={isSending || !subject.trim() || !message.trim()}
              className="cursor-pointer gap-1.5 font-bold text-xs h-9 px-5 bg-primary shadow-xs"
            >
              {isSending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              <span>Broadcast to Members ({selectedRecipientEstimate})</span>
            </Button>
          </div>
        </div>

        {/* Right Column: Live Email Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
            <span className="flex items-center gap-1.5">
              <Eye className="size-3.5 text-primary" />
              Recipient Email Preview
            </span>
            <span className="text-3xs uppercase font-mono tracking-wider bg-muted px-2 py-0.5 rounded">
              HTML Output
            </span>
          </div>

          {/* Email Preview Card */}
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-card">
            {/* Window bar */}
            <div className="px-4 py-2.5 bg-muted/60 border-b border-border/50 flex items-center justify-between text-3xs text-muted-foreground font-mono">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-400" />
                <span className="size-2 rounded-full bg-amber-400" />
                <span className="size-2 rounded-full bg-emerald-400" />
              </div>
              <span>From: Tenvi &lt;noreply@tenvi.app&gt;</span>
            </div>

            {/* Email Canvas */}
            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-900/60">
              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                {/* Email Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                      Tenvi
                    </span>
                    {getCategoryBadge(category)}
                  </div>
                </div>

                {/* Email Title */}
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                  {subject.trim() || 'Subject: Announcement headline will appear here'}
                </h3>

                {/* Email Salutation & Body */}
                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-2.5 leading-relaxed">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Hello Member,
                  </p>
                  {message.trim() ? (
                    message
                      .split('\n\n')
                      .map((paragraph, idx) => (
                        <p key={idx} className="whitespace-pre-wrap">
                          {paragraph}
                        </p>
                      ))
                  ) : (
                    <p className="text-slate-400 italic">
                      Your announcement body content will be formatted into readable paragraphs here...
                    </p>
                  )}
                </div>

                {/* CTA Button */}
                <div className="pt-2">
                  <span className="inline-block px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-2xs shadow-xs">
                    Open Your Tenvi Dashboard &rarr;
                  </span>
                </div>

                {/* Email Footer */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-900 text-3xs text-slate-400 space-y-0.5">
                  <p className="font-semibold text-slate-500 dark:text-slate-400">
                    Tenvi — Personal Wealth Infrastructure
                  </p>
                  <p>This message was broadcast by the Tenvi administration team.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast History & Delivery Logs */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2 font-bold text-sm text-foreground">
            <Clock className="size-4 text-primary" />
            <span>Broadcast Announcement History</span>
          </div>
          <span className="text-3xs text-muted-foreground font-mono">
            {history.length} broadcast records
          </span>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center rounded-xl border border-dashed border-border/80 text-muted-foreground text-xs space-y-1 bg-muted/10">
            <Mail className="size-6 opacity-40 mx-auto" />
            <p className="font-bold text-foreground">No broadcast announcements sent yet</p>
            <p className="text-3xs">Use the composer above to dispatch your first update.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getCategoryBadge(b.category)}
                    <span className="text-3xs text-muted-foreground font-mono flex items-center gap-1">
                      <Clock className="size-2.5" />
                      {formatDate(b.created_at)}
                    </span>
                    <span className="text-3xs font-semibold px-2 py-0.2 rounded bg-muted text-muted-foreground">
                      Audience: {b.audience.replace('_', ' ')}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-foreground truncate">
                    {b.subject}
                  </h4>

                  <p className="text-3xs text-muted-foreground line-clamp-1">
                    {b.message}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right text-3xs">
                    <span className="font-bold text-foreground block">
                      {(b.sent_count || 0) + (b.simulated_count || 0)} / {b.recipient_count} Delivered
                    </span>
                    <span className="text-muted-foreground font-mono">
                      {b.sent_count > 0 ? `${b.sent_count} live` : ''}
                      {b.simulated_count > 0 ? ` ${b.simulated_count} simulated` : ''}
                      {b.failed_count > 0 ? ` (${b.failed_count} failed)` : ''}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewingBroadcast(b)}
                    className="h-8 text-2xs cursor-pointer"
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog Before Mass Send */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="size-5" />
              <DialogTitle className="text-base font-bold">Confirm Email Broadcast</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              You are about to dispatch an announcement email to <strong>{selectedRecipientEstimate} recipient(s)</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-2 my-2">
            <div>
              <span className="text-3xs font-bold uppercase text-muted-foreground block">Subject</span>
              <p className="font-semibold text-foreground">{subject}</p>
            </div>
            <div>
              <span className="text-3xs font-bold uppercase text-muted-foreground block">Audience</span>
              <p className="font-semibold text-foreground capitalize">{audience.replace('_', ' ')}</p>
            </div>
            {sendInApp && (
              <p className="text-3xs text-primary font-semibold flex items-center gap-1">
                <Check className="size-3" />
                In-app notification bell alert will also be triggered
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={isSending}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmBroadcast}
              disabled={isSending}
              className="cursor-pointer font-bold bg-primary"
            >
              {isSending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Send className="size-3.5 mr-1.5" />}
              Send Broadcast Now
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
                <div className="flex items-center gap-2">
                  {getCategoryBadge(viewingBroadcast.category)}
                  <span className="text-3xs text-muted-foreground font-mono">
                    {formatDate(viewingBroadcast.created_at)}
                  </span>
                </div>
                <DialogTitle className="text-base font-bold pt-1">
                  {viewingBroadcast.subject}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Sent to {viewingBroadcast.recipient_count} recipients ({viewingBroadcast.audience.replace('_', ' ')})
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {viewingBroadcast.message}
              </div>

              <div className="p-3 rounded-lg bg-card border border-border/40 text-3xs text-muted-foreground flex items-center justify-between">
                <span>Sender: {viewingBroadcast.admin_name || 'Administrator'}</span>
                <span>
                  Delivered: {viewingBroadcast.sent_count + viewingBroadcast.simulated_count} / {viewingBroadcast.recipient_count}
                </span>
              </div>

              <DialogFooter>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewingBroadcast(null)}
                  className="cursor-pointer"
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
