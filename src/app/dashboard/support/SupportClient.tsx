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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-destructive/15 text-destructive shrink-0">
            <Bug className="size-2.5" /> Bug Report
          </span>
        );
      case 'feature':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-700 dark:text-purple-400 shrink-0">
            <Lightbulb className="size-2.5" /> Feature Idea
          </span>
        );
      case 'accounting_issue':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 shrink-0">
            <Calculator className="size-2.5" /> Accounting
          </span>
        );
      case 'ux_ui':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 shrink-0">
            <Palette className="size-2.5" /> Design / UX
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground shrink-0">
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
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 shrink-0">
            Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 shrink-0">
            In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shrink-0">
            Resolved
          </span>
        );
      case 'closed':
      case 'wont_fix':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground shrink-0">
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
    <div className="flex w-full flex-col gap-6 sm:gap-8">
      {/* Top Header */}
      <div className="page-header">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <LifeBuoy className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-display text-foreground">Support & help desk</h1>
            <p className="mt-1 max-w-prose text-sm sm:text-base text-muted-foreground">
              Report bugs, ask accounting questions, and chat directly with our engineering team.
            </p>
          </div>
        </div>

        <div className="page-header-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTickets(true)}
            disabled={loadingTickets}
            aria-busy={loadingTickets}
            className="gap-1.5"
          >
            <RefreshCw className={`size-4 ${loadingTickets ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button size="sm" onClick={() => setNewTicketOpen(true)} className="gap-1.5">
            <Plus className="size-4" />
            <span>New ticket</span>
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid-fluid gap-3 sm:gap-4 [--grid-min:9.5rem]">
        <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-card p-5 shadow-card">
          <span className="text-label text-muted-foreground">Total tickets</span>
          <span className="num text-figure text-foreground">{stats.total}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-card p-5 shadow-card">
          <span className="text-label text-amber-700 dark:text-amber-400">Awaiting review</span>
          <span className="num text-figure text-foreground">{stats.open}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-card p-5 shadow-card">
          <span className="text-label text-blue-700 dark:text-blue-400">In progress</span>
          <span className="num text-figure text-foreground">{stats.in_progress}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-card p-5 shadow-card">
          <span className="text-label text-emerald-700 dark:text-emerald-400">Resolved</span>
          <span className="num text-figure text-foreground">{stats.resolved}</span>
        </div>
      </div>

      {/* Loading State */}
      {loadingTickets ? (
        <div className="py-20 text-center space-y-2 text-muted-foreground bg-card rounded-2xl">
          <Loader2 className="size-7 animate-spin text-primary mx-auto" />
          <p className="text-xs font-semibold">Loading your support tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        /* Zero Tickets Welcome & Guide Card */
        <div className="p-8 sm:p-12 rounded-3xl bg-card shadow-card text-center space-y-8">
          <div className="max-w-lg mx-auto space-y-3">
            <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <LifeBuoy className="size-7" />
            </div>
            <h2 className="text-title sm:text-2xl font-bold tracking-tight text-foreground">
              Tenvi member help & ticket desk
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Have an issue with a transaction, noticed a calculation discrepancy, or want to suggest a new feature? You can chat directly with our engineering team right here.
            </p>
            <div className="pt-2">
              <Button
                size="lg"
                onClick={() => setNewTicketOpen(true)}
                className="gap-2 px-6"
              >
                <Plus className="size-4" />
                <span>Submit your first support ticket</span>
              </Button>
            </div>
          </div>

          {/* 3 Categories Guide Cards */}
          <div className="grid-fluid gap-4 [--grid-min:14rem] text-left">
            <div className="p-4 rounded-2xl bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-danger-soft-foreground font-semibold text-sm">
                <Bug className="size-4" />
                <span>Report a bug</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Found a display glitch, broken button, or statement parsing error? Let us know and we&apos;ll investigate immediately.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-semibold text-sm">
                <Lightbulb className="size-4" />
                <span>Feature ideas</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Have a recommendation for a new chart, card sorting filter, or split bills feature? We build what our members request.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold text-sm">
                <Calculator className="size-4" />
                <span>Accounting & math</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Need clarification on how amortization, net receivables, or credit card debt balances are calculated? We&apos;re here to help.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Master / Detail Two-Column Layout (when tickets exist) */
        <div className="flex flex-col @4xl/main:flex-row gap-6 items-start w-full min-w-0">
          {/* Left Column: Tickets List */}
          <div
            className={`w-full @4xl/main:w-[22rem] @4xl/main:shrink-0 space-y-3 min-w-0 ${
              mobileThreadOpen ? 'hidden @4xl/main:block' : 'block'
            }`}
          >
            {/* Filters Bar */}
            <div className="p-3.5 rounded-2xl bg-card shadow-card space-y-3">
              {/* Search Input */}
              <div className="relative">
                <Search className="pointer-events-none size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your tickets..."
                  aria-label="Search your tickets"
                  className="h-12 sm:h-10 w-full text-base sm:text-sm pl-9 pr-10 rounded-xl bg-muted/60 outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-0 inset-y-0 w-10 flex items-center justify-center rounded-r-xl text-muted-foreground hover:text-foreground cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-4" />
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
                    aria-pressed={statusFilter === st}
                    className={`no-spring h-9 px-3 rounded-full text-xs font-semibold capitalize transition-colors duration-(--motion-fast) ease-(--ease-in-out) cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      statusFilter === st
                        ? 'bg-foreground text-background'
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
                    aria-label="Filter by ticket type"
                    className="h-10 text-sm px-3 rounded-lg bg-muted/60 text-foreground outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="all">All types</option>
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
              <div className="py-12 text-center rounded-2xl p-5 space-y-2 bg-muted/40">
                <MessageSquare className="size-6 opacity-40 mx-auto text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">No matching tickets</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
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
                  className="text-primary hover:bg-lightprimary"
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredTickets.map((t) => {
                  const isSelected = selectedTicketId === t.id;
                  return (
                    <div
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => handleSelectTicket(t.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectTicket(t.id);
                        }
                      }}
                      className={`motion-surface p-4 rounded-2xl transition-[background-color,box-shadow] duration-(--motion-fast) ease-(--ease-in-out) cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isSelected
                          ? 'bg-primary/5 ring-1 ring-primary/40'
                          : 'bg-card shadow-card hover:shadow-lift'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 pb-2">
                        <div className="flex min-w-0 items-center gap-1.5 flex-wrap">
                          {getTypeBadge(t.type)}
                          {getStatusBadge(t.status)}
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 whitespace-nowrap">
                          <Clock className="size-3" />
                          {formatDate(t.created_at)}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {t.title || t.message.slice(0, 50)}
                      </h4>

                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {t.message}
                      </p>

                      <div className="flex items-center justify-between pt-2.5 mt-2 text-xs text-muted-foreground">
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
              mobileThreadOpen ? 'block' : 'hidden @4xl/main:block'
            }`}
          >
            {loadingThread ? (
              <div className="p-16 text-center rounded-2xl bg-card shadow-card space-y-3">
                <Loader2 className="size-7 animate-spin text-primary mx-auto" />
                <p className="text-xs text-muted-foreground font-semibold">Loading ticket conversation...</p>
              </div>
            ) : !threadTicket ? (
              <div className="p-10 sm:p-16 text-center rounded-2xl bg-card shadow-card space-y-3 text-muted-foreground">
                <LifeBuoy className="size-10 opacity-30 mx-auto text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Select a ticket</p>
                  <p className="text-xs max-w-xs mx-auto mt-1">
                    Choose a support ticket from the list to view its complete discussion thread and reply.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-card shadow-card flex flex-col overflow-hidden w-full">
                {/* Thread Header */}
                <div className="p-4 sm:p-5 bg-muted/40 flex flex-col gap-2">
                  {/* Mobile Back Button */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileThreadOpen(false)}
                      className="@4xl/main:hidden flex min-h-10 items-center gap-1.5 text-sm font-semibold text-primary cursor-pointer hover:underline mb-1"
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
                    <h2 className="text-title text-foreground break-words">
                      {threadTicket.title || 'Support Ticket'}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1 font-mono">
                      <span>Ticket ID: #{threadTicket.id.slice(0, 8)}</span>
                      <span>•</span>
                      <span>Created: {formatDate(threadTicket.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Thread Content Area */}
                <div className="p-4 sm:p-5 space-y-4 max-h-[550px] overflow-y-auto">
                  {/* 1. Original User Report Card */}
                  <div className="p-4 rounded-xl bg-muted/40 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <User className="size-3 text-muted-foreground" />
                        Original Report
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatDate(threadTicket.created_at)}
                      </span>
                    </div>
                    <div className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                      {threadTicket.message}
                    </div>

                    {/* Auto-captured Technical Metadata */}
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
                    <div className="p-5 rounded-xl text-center text-muted-foreground text-xs bg-muted/40 space-y-1">
                      <Clock className="size-5 opacity-40 mx-auto" />
                      <p className="font-semibold text-foreground">No replies yet</p>
                      <p className="text-xs">
                        Our engineering and support team reviews every ticket and will reply here soon.
                      </p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isAdmin = m.sender_role === 'admin';
                      return (
                        <div
                          key={m.id}
                          className={`p-4 rounded-xl space-y-2 ${
                            isAdmin
                              ? 'bg-amber-500/10 text-foreground mr-0 sm:mr-4'
                              : 'bg-muted/50 text-foreground ml-0 sm:ml-4'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                            <div className="flex items-center gap-2">
                              {isAdmin ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
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
                            <span className="text-xs text-muted-foreground font-mono">
                              {formatDate(m.created_at)}
                            </span>
                          </div>

                          <div className="text-sm whitespace-pre-wrap break-words leading-relaxed text-foreground">
                            {m.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Composer */}
                <div className="p-4 bg-muted/40 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                    <span className="font-bold text-muted-foreground flex items-center gap-1.5">
                      <CornerDownRight className="size-3 text-primary" />
                      Post a Reply or Update
                    </span>
                    {(threadTicket.status === 'resolved' || threadTicket.status === 'closed') && (
                      <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
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
                      className="w-full text-base sm:text-sm p-3 rounded-xl bg-card focus-visible:ring-2 focus-visible:ring-ring outline-none text-foreground placeholder:text-muted-foreground/60 resize-none transition-colors"
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        Press <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">⌘ + Enter</kbd> to send
                      </span>

                      <Button
                        size="sm"
                        onClick={handleSendReply}
                        disabled={isSendingReply || !replyText.trim()}
                        className="gap-1.5 ml-auto"
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
