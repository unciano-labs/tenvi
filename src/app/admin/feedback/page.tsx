'use client';

import React, { useState, useEffect, useTransition, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  MessageSquare,
  Bug,
  Lightbulb,
  Calculator,
  Palette,
  CheckCircle2,
  Clock,
  ExternalLink,
  Smartphone,
  Monitor,
  Loader2,
  RotateCcw,
  Save,
  Tag,
  AlertCircle,
  FileCode,
  Send,
  CornerDownRight,
  User,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  getAdminFeedbackAction,
  updateFeedbackStatusAction,
  getTicketThreadAction,
  postTicketReplyAction,
  SupportTicketRecord,
  FeedbackMessageRecord,
  FeedbackStatus,
  FeedbackType,
} from '@/app/actions/feedback';
import { formatDate } from '@/lib/finance/calculations';
import { toast } from 'sonner';

function AdminFeedbackContent() {
  const searchParams = useSearchParams();
  const urlTicketId = searchParams.get('id');

  const [items, setItems] = useState<SupportTicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isPending, startTransition] = useTransition();

  // Local state for developer notes editing per item
  const [activeNotes, setActiveNotes] = useState<Record<string, string>>({});

  // Active Thread Modal State
  const [activeThreadId, setActiveThreadId] = useState<string | null>(urlTicketId || null);
  const [threadTicket, setThreadTicket] = useState<SupportTicketRecord | null>(null);
  const [threadMessages, setThreadMessages] = useState<FeedbackMessageRecord[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [isSendingReply, startSendingReply] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchFeedback = () => {
    setLoading(true);
    getAdminFeedbackAction({ status: statusFilter, type: typeFilter })
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
        } else {
          setItems(res.items || []);
          const notesMap: Record<string, string> = {};
          (res.items || []).forEach((item) => {
            notesMap[item.id] = item.dev_notes || '';
          });
          setActiveNotes(notesMap);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFeedback();
  }, [statusFilter, typeFilter]);

  // Handle URL param changes (e.g. from in-app notification link click)
  useEffect(() => {
    if (urlTicketId) {
      setActiveThreadId(urlTicketId);
    }
  }, [urlTicketId]);

  // Fetch thread details when activeThreadId changes
  const fetchActiveThread = async (id: string) => {
    setLoadingThread(true);
    try {
      const res = await getTicketThreadAction(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        setThreadTicket(res.ticket);
        setThreadMessages(res.messages || []);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch {
      toast.error('Failed to load discussion thread');
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    if (activeThreadId) {
      fetchActiveThread(activeThreadId);
    } else {
      setThreadTicket(null);
      setThreadMessages([]);
    }
  }, [activeThreadId]);

  const handleStatusChange = (id: string, newStatus: FeedbackStatus) => {
    const currentNotes = activeNotes[id] ?? '';
    startTransition(async () => {
      const res = await updateFeedbackStatusAction(id, newStatus, currentNotes);
      if (res.success) {
        toast.success(`Ticket marked as ${newStatus} (Member notified)`);
        fetchFeedback();
        if (threadTicket && threadTicket.id === id) {
          setThreadTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      } else {
        toast.error(res.error || 'Failed to update ticket status');
      }
    });
  };

  const handleSaveNotes = (id: string, currentStatus: FeedbackStatus) => {
    const notesToSave = activeNotes[id] ?? '';
    startTransition(async () => {
      const res = await updateFeedbackStatusAction(id, currentStatus, notesToSave);
      if (res.success) {
        toast.success('Developer notes saved');
        fetchFeedback();
      } else {
        toast.error(res.error || 'Failed to save notes');
      }
    });
  };

  const handleSendAdminReply = () => {
    if (!activeThreadId || !adminReplyText.trim()) return;

    startSendingReply(async () => {
      const res = await postTicketReplyAction(activeThreadId, adminReplyText);
      if (res.success) {
        setAdminReplyText('');
        toast.success('Reply sent! Member has received an in-app notification.');
        await fetchActiveThread(activeThreadId);
        fetchFeedback();
      } else {
        toast.error(res.error || 'Failed to post reply');
      }
    });
  };

  function getTypeBadge(type: FeedbackType) {
    switch (type) {
      case 'bug':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-destructive/15 text-destructive">
            <Bug className="size-2.5" /> Bug
          </span>
        );
      case 'feature':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-700 dark:text-purple-400">
            <Lightbulb className="size-2.5" /> Feature
          </span>
        );
      case 'accounting_issue':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400">
            <Calculator className="size-2.5" /> Accounting
          </span>
        );
      case 'ux_ui':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400">
            <Palette className="size-2.5" /> UX / UI
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">
            <MessageSquare className="size-2.5" /> Other
          </span>
        );
    }
  }

  function getStatusBadge(status: FeedbackStatus) {
    switch (status) {
      case 'new':
      case 'open':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 capitalize">
            Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 capitalize">
            In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 capitalize">
            Resolved
          </span>
        );
      case 'closed':
      case 'wont_fix':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground capitalize">
            Closed
          </span>
        );
    }
  }

  const counts = {
    open: items.filter((i) => i.status === 'new' || i.status === 'open').length,
    in_progress: items.filter((i) => i.status === 'in_progress').length,
    resolved: items.filter((i) => i.status === 'resolved').length,
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-display text-foreground">Support & triage inbox</h1>
            <span className="num rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {items.length} {items.length === 1 ? 'ticket' : 'tickets'}
            </span>
          </div>
          <p className="mt-1 max-w-prose text-sm sm:text-base text-muted-foreground">
            Member reported bugs, feature suggestions, and live two-way support threads.
          </p>
        </div>

        <div className="page-header-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFeedback}
            disabled={loading}
            aria-busy={loading}
            className="gap-1.5"
          >
            <RotateCcw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filter by status" className="flex max-w-full items-center gap-2 overflow-x-auto no-scrollbar">
          {(['all', 'open', 'in_progress', 'resolved'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              aria-pressed={statusFilter === status}
              className={`no-spring shrink-0 inline-flex h-10 items-center gap-1.5 px-3.5 rounded-full text-sm font-medium capitalize cursor-pointer outline-none transition-colors duration-(--motion-fast) ease-(--ease-in-out) focus-visible:ring-2 focus-visible:ring-ring ${
                statusFilter === status
                  ? 'bg-foreground text-background font-semibold'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {status.replace('_', ' ')}
              {status !== 'all' && (
                <span className="num rounded-full bg-background/20 px-1.5 text-xs">
                  {counts[status as keyof typeof counts] || 0}
                </span>
              )}
            </button>
          ))}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by category"
          className="h-10 rounded-xl bg-card px-3 text-sm text-foreground shadow-card outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All categories</option>
          <option value="bug">Bugs only</option>
          <option value="feature">Features only</option>
          <option value="accounting_issue">Accounting issues</option>
          <option value="ux_ui">Design & UX</option>
        </select>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-2">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-xs">Loading feedback tickets...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-card shadow-card p-8 space-y-2">
          <MessageSquare className="size-8 opacity-40 mx-auto text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Inbox is all clear</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No feedback tickets found matching the selected filters.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="flex min-w-0 flex-col gap-4 rounded-2xl bg-card p-5 sm:p-6 shadow-card"
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {getTypeBadge(item.type)}
                  {getStatusBadge(item.status)}
                  <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                    <Clock className="size-3" />
                    {formatDate(item.created_at)}
                  </span>
                </div>

                <div className="min-w-0 max-w-full text-left sm:text-right">
                  <span className="block truncate text-sm font-semibold text-foreground">{item.user_name}</span>
                  <span className="block truncate text-xs text-muted-foreground" title={item.user_email}>{item.user_email}</span>
                </div>
              </div>

              {/* Title & Message Body */}
              <div className="space-y-1">
                {item.title && (
                  <h3 className="text-title text-foreground break-words">
                    {item.title}
                  </h3>
                )}
                <div className="max-w-prose text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                  {item.message}
                </div>
              </div>

              {/* Technical Context Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {item.page_url && (
                  <span className="flex min-w-0 max-w-full items-center gap-1 px-2 py-1 rounded-md bg-muted/60 font-mono break-all">
                    📍 Route: <strong className="text-foreground">{item.page_url}</strong>
                  </span>
                )}
                {item.device_meta?.viewport && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 font-mono">
                    <Monitor className="size-3" />
                    {item.device_meta.viewport}
                  </span>
                )}
                {item.device_meta?.isPwa && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary font-bold">
                    <Smartphone className="size-3" />
                    PWA standalone
                  </span>
                )}
              </div>

              {/* Conversation & Action Bar */}
              <div className="flex flex-col gap-4 rounded-xl bg-muted/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Open Thread Drawer Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveThreadId(item.id)}
                    className="gap-1.5 bg-card text-primary hover:bg-lightprimary"
                  >
                    <MessageSquare className="size-4" />
                    <span>Conversation thread</span>
                    {(item.messages_count || 0) > 0 && (
                      <span className="num px-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                        {item.messages_count}
                      </span>
                    )}
                  </Button>

                  {/* Quick Status Buttons */}
                  <div role="group" aria-label="Set status" className="flex flex-wrap items-center gap-1.5">
                    <span className="text-label text-muted-foreground mr-1">Status</span>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'in_progress')}
                      disabled={item.status === 'in_progress' || isPending}
                      className="h-10 sm:h-9 px-3 rounded-lg text-sm font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      In progress
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'resolved')}
                      disabled={item.status === 'resolved' || isPending}
                      className="h-10 sm:h-9 px-3 rounded-lg text-sm font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'closed')}
                      disabled={item.status === 'closed' || isPending}
                      className="h-10 sm:h-9 px-3 rounded-lg text-sm font-semibold bg-card text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* Dev Notes */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-label text-muted-foreground flex items-center gap-1">
                      <FileCode className="size-3.5" />
                      Private dev notes (internal only)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSaveNotes(item.id, item.status)}
                      disabled={isPending}
                      className="gap-1 text-primary hover:text-primary hover:bg-lightprimary"
                    >
                      <Save className="size-4" />
                      Save note
                    </Button>
                  </div>
                  <input
                    type="text"
                    value={activeNotes[item.id] ?? ''}
                    onChange={(e) =>
                      setActiveNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    placeholder="e.g. Fixed in commit abc1234, awaiting release..."
                    aria-label="Private dev notes"
                    className="h-12 sm:h-10 w-full text-base sm:text-sm px-3 rounded-lg bg-card outline-none text-foreground placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Discussion Thread & Admin Reply Dialog */}
      <Dialog open={Boolean(activeThreadId)} onOpenChange={(open) => !open && setActiveThreadId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          {loadingThread ? (
            <div className="py-24 text-center space-y-3">
              <Loader2 className="size-7 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground">Loading ticket conversation...</p>
            </div>
          ) : !threadTicket ? (
            <div className="p-8 text-center text-muted-foreground text-xs">Ticket not found</div>
          ) : (
            <>
              {/* Header */}
              <div className="p-5 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getTypeBadge(threadTicket.type)}
                    {getStatusBadge(threadTicket.status)}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    #{threadTicket.id.slice(0, 8)}
                  </span>
                </div>

                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  {threadTicket.title || 'Support Ticket'}
                </DialogTitle>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    User: {threadTicket.user_name} ({threadTicket.user_email})
                  </span>
                  <span>•</span>
                  <span>Created: {formatDate(threadTicket.created_at)}</span>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[420px]">
                {/* Original Member Submission */}
                <div className="p-4 rounded-xl bg-muted/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <User className="size-3 text-muted-foreground" />
                      Initial User Report
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatDate(threadTicket.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {threadTicket.message}
                  </p>

                  {/* Context Badges */}
                  {(threadTicket.page_url || threadTicket.device_meta?.viewport) && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-muted-foreground">
                      {threadTicket.page_url && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-card font-mono">
                          📍 {threadTicket.page_url}
                        </span>
                      )}
                      {threadTicket.device_meta?.viewport && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-card font-mono">
                          <Monitor className="size-2.5" />
                          {threadTicket.device_meta.viewport}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Reply Messages */}
                {threadMessages.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground text-xs rounded-xl space-y-1">
                    <MessageSquare className="size-5 opacity-40 mx-auto" />
                    <p className="font-semibold">No replies yet</p>
                    <p className="text-xs">Use the box below to send an official response to the user.</p>
                  </div>
                ) : (
                  threadMessages.map((m) => {
                    const isAdmin = m.sender_role === 'admin';
                    return (
                      <div
                        key={m.id}
                        className={`p-4 rounded-xl space-y-1.5 ${
                          isAdmin
                            ? 'bg-amber-500/10 text-foreground mr-3'
                            : 'bg-muted/50 text-foreground ml-3'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {isAdmin ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                <ShieldCheck className="size-3" />
                                Admin (You)
                              </span>
                            ) : (
                              <span className="font-bold text-foreground flex items-center gap-1">
                                <User className="size-3 text-muted-foreground" />
                                {m.sender_name || 'Member'}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            {formatDate(m.created_at)}
                          </span>
                        </div>
                        <p className="text-xs whitespace-pre-wrap leading-relaxed text-foreground">
                          {m.message}
                        </p>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Admin Reply Composer */}
              <div className="p-4 bg-muted/20 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1">
                    <CornerDownRight className="size-3 text-amber-500" />
                    Official Admin Reply
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Sending will automatically notify <strong>{threadTicket.user_name}</strong> via In-App Alert
                  </span>
                </div>

                <textarea
                  rows={3}
                  value={adminReplyText}
                  onChange={(e) => setAdminReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleSendAdminReply();
                    }
                  }}
                  placeholder={`Write your response to ${threadTicket.user_name}... (⌘+Enter to send)`}
                  className="w-full text-xs p-3 rounded-xl bg-card focus-visible:ring-2 focus-visible:ring-ring outline-none text-foreground placeholder:text-muted-foreground/60 resize-none transition-colors"
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Press <kbd className="font-mono bg-muted px-1 py-0.5 rounded">⌘ + Enter</kbd> to send
                  </span>

                  <Button
                    size="sm"
                    onClick={handleSendAdminReply}
                    disabled={isSendingReply || !adminReplyText.trim()}
                    className="cursor-pointer font-bold gap-1.5 ml-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                  >
                    {isSendingReply ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    <span>Send Reply & Notify User</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminFeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex flex-col items-center justify-center text-muted-foreground space-y-2">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-xs">Loading triage center...</p>
        </div>
      }
    >
      <AdminFeedbackContent />
    </Suspense>
  );
}
