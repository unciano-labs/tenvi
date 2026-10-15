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
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-destructive/15 text-destructive">
            <Bug className="size-2.5" /> Bug
          </span>
        );
      case 'feature':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-purple-500/15 text-purple-600 dark:text-purple-400">
            <Lightbulb className="size-2.5" /> Feature
          </span>
        );
      case 'accounting_issue':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400">
            <Calculator className="size-2.5" /> Accounting
          </span>
        );
      case 'ux_ui':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Palette className="size-2.5" /> UX / UI
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-muted text-muted-foreground">
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
          <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase">
            Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400 uppercase">
            In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 uppercase">
            Resolved
          </span>
        );
      case 'closed':
      case 'wont_fix':
        return (
          <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-muted text-muted-foreground uppercase">
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
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Support & Triage Inbox
            </h1>
            <span className="px-2 py-0.5 text-2xs font-bold bg-primary/10 text-primary rounded-md">
              {items.length} Tickets
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Member reported bugs, feature suggestions, and live two-way support threads.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchFeedback}
          disabled={loading}
          className="gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-border/50 pb-3">
        {(['all', 'open', 'in_progress', 'resolved'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
              statusFilter === status
                ? 'bg-foreground text-background font-bold shadow-2xs'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {status.replace('_', ' ')}
            {status !== 'all' && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-3xs font-mono bg-background/20">
                {counts[status as keyof typeof counts] || 0}
              </span>
            )}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs py-1 px-2.5 rounded-lg bg-card border border-border/60 text-muted-foreground outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="bug">Bugs Only</option>
            <option value="feature">Features Only</option>
            <option value="accounting_issue">Accounting Issues</option>
            <option value="ux_ui">Design & UX</option>
          </select>
        </div>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-2">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-xs">Loading feedback tickets...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-dashed border-border/70 p-8 space-y-2">
          <MessageSquare className="size-8 opacity-40 mx-auto text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">Inbox is all clear</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No feedback tickets found matching the selected filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-card border border-border/60 hover:border-border transition-all shadow-xs space-y-4"
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  {getTypeBadge(item.type)}
                  {getStatusBadge(item.status)}
                  <span className="text-3xs text-muted-foreground flex items-center gap-1 font-mono">
                    <Clock className="size-2.5" />
                    {formatDate(item.created_at)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-2xs font-bold text-foreground">{item.user_name}</span>
                  <span className="text-3xs text-muted-foreground block font-mono">{item.user_email}</span>
                </div>
              </div>

              {/* Title & Message Body */}
              <div className="space-y-1">
                {item.title && (
                  <h3 className="text-sm font-bold text-foreground">
                    {item.title}
                  </h3>
                )}
                <div className="text-xs font-normal text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {item.message}
                </div>
              </div>

              {/* Technical Context Badges */}
              <div className="flex flex-wrap items-center gap-2 text-3xs text-muted-foreground">
                {item.page_url && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 font-mono">
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
                    PWA Standalone
                  </span>
                )}
              </div>

              {/* Conversation & Action Bar */}
              <div className="pt-3 border-t border-border/40 space-y-3 bg-muted/10 p-3 rounded-xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Open Thread Drawer Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveThreadId(item.id)}
                    className="h-8 text-xs font-bold gap-1.5 cursor-pointer border-primary/30 text-primary hover:bg-lightprimary"
                  >
                    <MessageSquare className="size-3.5" />
                    <span>Conversation Thread</span>
                    {(item.messages_count || 0) > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-3xs font-extrabold bg-primary text-primary-foreground">
                        {item.messages_count}
                      </span>
                    )}
                  </Button>

                  {/* Quick Status Buttons */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-3xs text-muted-foreground font-semibold mr-1">Status:</span>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'in_progress')}
                      disabled={item.status === 'in_progress' || isPending}
                      className="px-2.5 py-1 rounded-md text-3xs font-bold bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      In Progress
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'resolved')}
                      disabled={item.status === 'resolved' || isPending}
                      className="px-2.5 py-1 rounded-md text-3xs font-bold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'closed')}
                      disabled={item.status === 'closed' || isPending}
                      className="px-2.5 py-1 rounded-md text-3xs font-bold bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* Dev Notes */}
                <div className="pt-2 border-t border-border/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-3xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <FileCode className="size-3" />
                      Private Dev Notes (Internal Only)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSaveNotes(item.id, item.status)}
                      disabled={isPending}
                      className="h-6 text-2xs gap-1 text-primary hover:text-primary hover:bg-lightprimary cursor-pointer"
                    >
                      <Save className="size-3" />
                      Save Note
                    </Button>
                  </div>
                  <input
                    type="text"
                    value={activeNotes[item.id] ?? ''}
                    onChange={(e) =>
                      setActiveNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    placeholder="e.g. Fixed in commit abc1234, awaiting release..."
                    className="w-full text-xs p-2 rounded-lg bg-card border border-border/60 outline-none text-foreground placeholder:text-muted-foreground/60 focus:border-primary"
                  />
                </div>
              </div>
            </div>
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
              <div className="p-5 border-b border-border/50 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getTypeBadge(threadTicket.type)}
                    {getStatusBadge(threadTicket.status)}
                  </div>
                  <span className="text-3xs text-muted-foreground font-mono">
                    #{threadTicket.id.slice(0, 8)}
                  </span>
                </div>

                <DialogTitle className="text-base sm:text-lg font-black text-foreground">
                  {threadTicket.title || 'Support Ticket'}
                </DialogTitle>

                <div className="flex flex-wrap items-center gap-3 text-3xs text-muted-foreground">
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
                <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                  <div className="flex items-center justify-between text-2xs">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <User className="size-3 text-muted-foreground" />
                      Initial User Report
                    </span>
                    <span className="text-3xs text-muted-foreground font-mono">
                      {formatDate(threadTicket.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {threadTicket.message}
                  </p>

                  {/* Context Badges */}
                  {(threadTicket.page_url || threadTicket.device_meta?.viewport) && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40 text-3xs text-muted-foreground">
                      {threadTicket.page_url && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-card border border-border/40 font-mono">
                          📍 {threadTicket.page_url}
                        </span>
                      )}
                      {threadTicket.device_meta?.viewport && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-card border border-border/40 font-mono">
                          <Monitor className="size-2.5" />
                          {threadTicket.device_meta.viewport}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Reply Messages */}
                {threadMessages.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground text-xs rounded-xl border border-dashed border-border/70 space-y-1">
                    <MessageSquare className="size-5 opacity-40 mx-auto" />
                    <p className="font-semibold">No replies yet</p>
                    <p className="text-3xs">Use the box below to send an official response to the user.</p>
                  </div>
                ) : (
                  threadMessages.map((m) => {
                    const isAdmin = m.sender_role === 'admin';
                    return (
                      <div
                        key={m.id}
                        className={`p-4 rounded-xl border space-y-1.5 animate-in fade-in-30 ${
                          isAdmin
                            ? 'bg-amber-500/10 border-amber-500/30 text-foreground mr-3'
                            : 'bg-muted/30 border-border/60 text-foreground ml-3'
                        }`}
                      >
                        <div className="flex items-center justify-between text-2xs">
                          <div className="flex items-center gap-2">
                            {isAdmin ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300">
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
                          <span className="text-3xs text-muted-foreground font-mono">
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
              <div className="p-4 border-t border-border/50 bg-muted/20 space-y-2.5">
                <div className="flex items-center justify-between text-2xs">
                  <span className="font-bold text-foreground flex items-center gap-1">
                    <CornerDownRight className="size-3 text-amber-500" />
                    Official Admin Reply
                  </span>
                  <span className="text-3xs text-muted-foreground">
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
                  className="w-full text-xs p-3 rounded-xl bg-card border border-border/60 focus:border-primary outline-none text-foreground placeholder:text-muted-foreground/60 resize-none transition-all"
                />

                <div className="flex items-center justify-between">
                  <span className="text-3xs text-muted-foreground hidden sm:inline">
                    Press <kbd className="font-mono bg-muted px-1 py-0.5 rounded border border-border">⌘ + Enter</kbd> to send
                  </span>

                  <Button
                    size="sm"
                    onClick={handleSendAdminReply}
                    disabled={isSendingReply || !adminReplyText.trim()}
                    className="cursor-pointer font-bold gap-1.5 ml-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-black"
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
