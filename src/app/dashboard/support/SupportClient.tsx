'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  LifeBuoy,
  MessageSquare,
  Bug,
  Lightbulb,
  Calculator,
  Palette,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  Plus,
  Search,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Monitor,
  AlertCircle,
  CornerDownRight,
  User,
  X,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getMemberTicketsAction,
  getTicketThreadAction,
  postTicketReplyAction,
  SupportTicketRecord,
  FeedbackMessageRecord,
  FeedbackType,
  FeedbackStatus,
} from '@/app/actions/feedback';
import { FeedbackModal } from '@/components/Forms/FeedbackModal';
import { formatDate } from '@/lib/finance/calculations';
import { toast } from 'sonner';

export function SupportClient() {
  const searchParams = useSearchParams();
  const urlTicketId = searchParams.get('id');

  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(urlTicketId || null);

  // Thread details state
  const [threadTicket, setThreadTicket] = useState<SupportTicketRecord | null>(null);
  const [messages, setMessages] = useState<FeedbackMessageRecord[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, startSendingReply] = useTransition();

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New ticket modal
  const [newTicketOpen, setNewTicketOpen] = useState(false);

  // Mobile detail view toggle
  const [mobileThreadOpen, setMobileThreadOpen] = useState(Boolean(urlTicketId));

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchThread = async (ticketId: string) => {
    setLoadingThread(true);
    try {
      const res = await getTicketThreadAction(ticketId);
      if (res.error) {
        toast.error(res.error);
      } else {
        setThreadTicket(res.ticket);
        setMessages(res.messages || []);
        setTimeout(scrollToBottom, 100);
      }
    } catch {
      toast.error('Failed to load discussion thread');
    } finally {
      setLoadingThread(false);
    }
  };

  const fetchTickets = async (maintainSelection = true) => {
    setLoadingTickets(true);
    try {
      const res = await getMemberTicketsAction();
      if (res.error) {
        toast.error(res.error);
      } else {
        const list = res.tickets || [];
        setTickets(list);

        if (!maintainSelection && list.length > 0 && !selectedTicketId) {
          const firstId = list[0].id;
          setSelectedTicketId(firstId);
          fetchThread(firstId);
        } else if (maintainSelection && selectedTicketId) {
          // If the selected ticket is still in list, re-fetch thread
          const exists = list.some((t) => t.id === selectedTicketId);
          if (exists) {
            fetchThread(selectedTicketId);
          }
        }
      }
    } catch {
      toast.error('Failed to load tickets');
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets(false);
  }, []);

  // Sync if URL query param changes
  useEffect(() => {
    if (urlTicketId) {
      setSelectedTicketId(urlTicketId);
      setMobileThreadOpen(true);
      fetchThread(urlTicketId);
    }
  }, [urlTicketId]);

  const handleSelectTicket = (id: string) => {
    setSelectedTicketId(id);
    setMobileThreadOpen(true);
    fetchThread(id);
  };

  const handleSendReply = () => {
    if (!selectedTicketId || !replyText.trim()) return;

    startSendingReply(async () => {
      const res = await postTicketReplyAction(selectedTicketId, replyText);
      if (res.success) {
        setReplyText('');
        toast.success('Reply submitted');
        await fetchThread(selectedTicketId);
        // Refresh ticket list to reflect updated timestamp & reply count
        fetchTickets(true);
      } else {
        toast.error(res.error || 'Failed to post reply');
      }
    });
  };

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'open' && t.status !== 'open' && t.status !== 'new') return false;
      if (statusFilter === 'in_progress' && t.status !== 'in_progress') return false;
      if (statusFilter === 'resolved' && t.status !== 'resolved') return false;
      if (statusFilter === 'closed' && t.status !== 'closed' && t.status !== 'wont_fix') return false;
    }
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = (t.title || '').toLowerCase().includes(query);
      const matchMsg = t.message.toLowerCase().includes(query);
      if (!matchTitle && !matchMsg) return false;
    }
    return true;
  });

  // Category badge helper
  function getTypeBadge(type: FeedbackType) {
    switch (type) {
      case 'bug':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-destructive/15 text-destructive shrink-0">
            <Bug className="size-2.5" /> Bug Report
          </span>
        );
      case 'feature':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0">
            <Lightbulb className="size-2.5" /> Feature Idea
          </span>
        );
      case 'accounting_issue':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
            <Calculator className="size-2.5" /> Accounting
          </span>
        );
      case 'ux_ui':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
            <Palette className="size-2.5" /> Design / UX
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-muted text-muted-foreground shrink-0">
            <MessageSquare className="size-2.5" /> General
          </span>
        );
    }
  }

  // Status badge helper
  function getStatusBadge(status: FeedbackStatus) {
    switch (status) {
      case 'new':
      case 'open':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase tracking-wide shrink-0">
            Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400 uppercase tracking-wide shrink-0">
            In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 uppercase tracking-wide shrink-0">
            Resolved
          </span>
        );
      case 'closed':
      case 'wont_fix':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-extrabold bg-muted text-muted-foreground uppercase tracking-wide shrink-0">
            Closed
          </span>
        );
    }
  }

  // Statistics counts
  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'open' || t.status === 'new').length,
    in_progress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
  };

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in-50 duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <LifeBuoy className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Support & Help Desk
              </h1>
              <p className="text-xs text-muted-foreground">
                Report bugs, ask accounting questions, and chat directly with our engineering team.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTickets(true)}
            disabled={loadingTickets}
            className="cursor-pointer gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loadingTickets ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setNewTicketOpen(true)}
            className="cursor-pointer gap-1.5 font-bold shadow-xs"
          >
            <Plus className="size-4" />
            <span>New Ticket</span>
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
          <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider block">
            Total Tickets
          </span>
          <span className="text-xl font-black text-foreground mt-0.5 block">{stats.total}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
          <span className="text-2xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            Awaiting Review
          </span>
          <span className="text-xl font-black text-foreground mt-0.5 block">{stats.open}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
          <span className="text-2xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
            In Progress
          </span>
          <span className="text-xl font-black text-foreground mt-0.5 block">{stats.in_progress}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
          <span className="text-2xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Resolved
          </span>
          <span className="text-xl font-black text-foreground mt-0.5 block">{stats.resolved}</span>
        </div>
      </div>

      {/* Loading State */}
      {loadingTickets ? (
        <div className="py-20 text-center space-y-2 text-muted-foreground bg-card rounded-2xl border border-border/60 shadow-xs">
          <Loader2 className="size-7 animate-spin text-primary mx-auto" />
          <p className="text-xs font-semibold">Loading your support tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        /* Zero Tickets Welcome & Guide Card */
        <div className="p-8 sm:p-12 rounded-3xl bg-card border border-border/60 shadow-card text-center space-y-8">
          <div className="max-w-lg mx-auto space-y-3">
            <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
              <LifeBuoy className="size-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground">
              Tenvi Member Help & Ticket Desk
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Have an issue with a transaction, noticed a calculation discrepancy, or want to suggest a new feature? You can chat directly with our engineering team right here.
            </p>
            <div className="pt-2">
              <Button
                size="lg"
                onClick={() => setNewTicketOpen(true)}
                className="cursor-pointer gap-2 font-black shadow-lift text-xs h-10 px-6"
              >
                <Plus className="size-4" />
                <span>Submit Your First Support Ticket</span>
              </Button>
            </div>
          </div>

          {/* 3 Categories Guide Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left pt-4 border-t border-border/40">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-2">
              <div className="flex items-center gap-2 text-destructive font-bold text-xs">
                <Bug className="size-4" />
                <span>Report a Bug</span>
              </div>
              <p className="text-3xs text-muted-foreground leading-relaxed">
                Found a display glitch, broken button, or statement parsing error? Let us know and we&apos;ll investigate immediately.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-2">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs">
                <Lightbulb className="size-4" />
                <span>Feature Ideas</span>
              </div>
              <p className="text-3xs text-muted-foreground leading-relaxed">
                Have a recommendation for a new chart, card sorting filter, or split bills feature? We build what our members request.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-2">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs">
                <Calculator className="size-4" />
                <span>Accounting & Math</span>
              </div>
              <p className="text-3xs text-muted-foreground leading-relaxed">
                Need clarification on how amortization, net receivables, or credit card debt balances are calculated? We&apos;re here to help.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Master / Detail Two-Column Layout (when tickets exist) */
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full min-w-0">
          {/* Left Column: Tickets List */}
          <div
            className={`w-full lg:w-[360px] xl:w-[390px] lg:shrink-0 space-y-3 min-w-0 ${
              mobileThreadOpen ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* Filters Bar */}
            <div className="p-3.5 rounded-2xl bg-card border border-border/60 space-y-3 shadow-xs">
              {/* Search Input */}
              <div className="relative">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your tickets..."
                  className="w-full text-xs pl-8 pr-8 py-2 rounded-xl bg-muted/40 border border-border/60 outline-none focus:border-primary text-foreground"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-3xs font-bold capitalize transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-foreground text-background shadow-2xs'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}

                <div className="ml-auto">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="text-3xs py-1 px-2 rounded-lg bg-card border border-border/60 text-muted-foreground outline-none cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    <option value="bug">Bug</option>
                    <option value="feature">Feature</option>
                    <option value="accounting_issue">Accounting</option>
                    <option value="ux_ui">Design</option>
                    <option value="other">General</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tickets List Items */}
            {filteredTickets.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-border/80 p-5 space-y-2 bg-muted/10">
                <MessageSquare className="size-6 opacity-40 mx-auto text-muted-foreground" />
                <p className="text-xs font-bold text-foreground">No matching tickets</p>
                <p className="text-3xs text-muted-foreground max-w-xs mx-auto">
                  No tickets match the selected filters or search query.
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setSearchQuery('');
                  }}
                  className="cursor-pointer text-xs h-7 text-primary hover:bg-lightprimary"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredTickets.map((t) => {
                  const isSelected = selectedTicketId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTicket(t.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40'
                          : 'border-border/60 bg-card hover:border-border hover:bg-muted/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 pb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getTypeBadge(t.type)}
                          {getStatusBadge(t.status)}
                        </div>
                        <span className="text-3xs text-muted-foreground font-mono flex items-center gap-1 shrink-0">
                          <Clock className="size-2.5" />
                          {formatDate(t.created_at)}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-foreground line-clamp-1">
                        {t.title || t.message.slice(0, 50)}
                      </h4>

                      <p className="text-3xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {t.message}
                      </p>

                      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border/40 text-3xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <MessageSquare className="size-3" />
                          {(t.messages_count || 0) === 0
                            ? 'No replies yet'
                            : `${t.messages_count} ${t.messages_count === 1 ? 'reply' : 'replies'}`}
                        </span>
                        <ChevronRight className="size-3 text-muted-foreground/60" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Ticket Conversation Thread */}
          <div
            className={`flex-1 min-w-0 w-full ${
              mobileThreadOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            {loadingThread ? (
              <div className="p-16 text-center rounded-2xl bg-card border border-border/60 shadow-xs space-y-3">
                <Loader2 className="size-7 animate-spin text-primary mx-auto" />
                <p className="text-xs text-muted-foreground font-semibold">Loading ticket conversation...</p>
              </div>
            ) : !threadTicket ? (
              <div className="p-16 text-center rounded-2xl bg-card border border-dashed border-border/80 shadow-xs space-y-3 text-muted-foreground">
                <LifeBuoy className="size-10 opacity-30 mx-auto text-primary" />
                <div>
                  <p className="text-sm font-bold text-foreground">Select a ticket</p>
                  <p className="text-xs max-w-xs mx-auto mt-1">
                    Choose a support ticket from the list to view its complete discussion thread and reply.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col overflow-hidden w-full">
                {/* Thread Header */}
                <div className="p-4 sm:p-5 border-b border-border/50 bg-muted/20 flex flex-col gap-2">
                  {/* Mobile Back Button */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setMobileThreadOpen(false)}
                      className="lg:hidden flex items-center gap-1.5 text-xs font-bold text-primary cursor-pointer hover:underline mb-1"
                    >
                      <ArrowLeft className="size-3.5" />
                      Back to all tickets
                    </button>

                    <div className="flex items-center gap-2 ml-auto">
                      {getTypeBadge(threadTicket.type)}
                      {getStatusBadge(threadTicket.status)}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-base sm:text-lg font-black text-foreground break-words">
                      {threadTicket.title || 'Support Ticket'}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-3xs text-muted-foreground mt-1 font-mono">
                      <span>Ticket ID: #{threadTicket.id.slice(0, 8)}</span>
                      <span>•</span>
                      <span>Created: {formatDate(threadTicket.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Thread Content Area */}
                <div className="p-4 sm:p-5 space-y-4 max-h-[550px] overflow-y-auto">
                  {/* 1. Original User Report Card */}
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                    <div className="flex items-center justify-between text-2xs">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <User className="size-3 text-muted-foreground" />
                        Original Report
                      </span>
                      <span className="text-3xs text-muted-foreground font-mono">
                        {formatDate(threadTicket.created_at)}
                      </span>
                    </div>
                    <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {threadTicket.message}
                    </div>

                    {/* Auto-captured Technical Metadata */}
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
                        {threadTicket.device_meta?.isPwa && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                            <Smartphone className="size-2.5" />
                            PWA App
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. Chronological Thread Messages */}
                  {messages.length === 0 ? (
                    <div className="p-5 rounded-xl border border-dashed border-border/80 text-center text-muted-foreground text-xs bg-muted/10 space-y-1">
                      <Clock className="size-5 opacity-40 mx-auto" />
                      <p className="font-semibold text-foreground">No replies yet</p>
                      <p className="text-3xs">
                        Our engineering and support team reviews every ticket and will reply here soon.
                      </p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isAdmin = m.sender_role === 'admin';
                      return (
                        <div
                          key={m.id}
                          className={`p-4 rounded-xl border space-y-2 animate-in fade-in-30 ${
                            isAdmin
                              ? 'bg-amber-500/10 border-amber-500/30 text-foreground mr-0 sm:mr-4'
                              : 'bg-muted/30 border-border/60 text-foreground ml-0 sm:ml-4'
                          }`}
                        >
                          <div className="flex items-center justify-between text-2xs">
                            <div className="flex items-center gap-2">
                              {isAdmin ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                  <ShieldCheck className="size-3" />
                                  Tenvi Support Team
                                </span>
                              ) : (
                                <span className="font-bold text-foreground flex items-center gap-1">
                                  <User className="size-3 text-muted-foreground" />
                                  You ({m.sender_name || 'Member'})
                                </span>
                              )}
                            </div>
                            <span className="text-3xs text-muted-foreground font-mono">
                              {formatDate(m.created_at)}
                            </span>
                          </div>

                          <div className="text-xs whitespace-pre-wrap leading-relaxed text-foreground">
                            {m.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Composer */}
                <div className="p-4 border-t border-border/50 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between text-2xs">
                    <span className="font-bold text-muted-foreground flex items-center gap-1.5">
                      <CornerDownRight className="size-3 text-primary" />
                      Post a Reply or Update
                    </span>
                    {(threadTicket.status === 'resolved' || threadTicket.status === 'closed') && (
                      <span className="text-3xs text-amber-600 dark:text-amber-400 font-semibold">
                        Note: Replying will automatically reopen this ticket.
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                      placeholder="Type your response or follow-up question here (⌘+Enter to submit)..."
                      className="w-full text-xs p-3 rounded-xl bg-card border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground placeholder:text-muted-foreground/60 resize-none transition-all"
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-3xs text-muted-foreground hidden sm:inline">
                        Press <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border text-foreground">⌘ + Enter</kbd> to send
                      </span>

                      <Button
                        size="sm"
                        onClick={handleSendReply}
                        disabled={isSendingReply || !replyText.trim()}
                        className="cursor-pointer font-bold gap-1.5 ml-auto"
                      >
                        {isSendingReply ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Send className="size-3.5" />
                        )}
                        <span>Send Reply</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Support Ticket Modal */}
      <FeedbackModal
        open={newTicketOpen}
        onOpenChange={(open) => {
          setNewTicketOpen(open);
          if (!open) {
            // Re-fetch tickets after modal closes
            fetchTickets(true);
          }
        }}
      />
    </div>
  );
}
