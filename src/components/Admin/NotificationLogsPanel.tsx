'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Search,
  X,
  Loader2,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getNotificationLogsAction } from '@/app/actions/notifications';
import { NotificationLog, NotificationLogsStats } from '@/types';
import { formatDate } from '@/lib/finance/calculations';

interface NotificationLogsPanelProps {
  initialLogs?: NotificationLog[];
  initialTotalCount?: number;
  initialStats?: NotificationLogsStats;
}

export function NotificationLogsPanel({
  initialLogs = [],
  initialTotalCount = 0,
  initialStats,
}: NotificationLogsPanelProps) {
  const [logs, setLogs] = useState<NotificationLog[]>(initialLogs);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(initialTotalCount > initialLogs.length);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'email' | 'sms'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'simulated' | 'failed'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Stats
  const defaultStats: NotificationLogsStats = {
    total: initialTotalCount,
    sent: initialLogs.filter((l) => l.status === 'sent').length,
    simulated: initialLogs.filter((l) => l.status === 'simulated').length,
    failed: initialLogs.filter((l) => l.status === 'failed').length,
    email: initialLogs.filter((l) => l.channel === 'email').length,
    sms: initialLogs.filter((l) => l.channel === 'sms').length,
  };
  const [stats, setStats] = useState<NotificationLogsStats>(initialStats || defaultStats);

  // Debounce search input by 280ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isFirstMount = useRef(true);

  // Central fetch function
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

  // Re-fetch on filter or search change
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (initialLogs.length === 0) {
        fetchLogs(1, false);
      }
      return;
    }
    fetchLogs(1, false, debouncedSearch, channelFilter, statusFilter);
  }, [debouncedSearch, channelFilter, statusFilter]);

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return;
    fetchLogs(page + 1, true);
  };

  const handleRefresh = async () => {
    setIsRefreshingLogs(true);
    await fetchLogs(1, false);
    setIsRefreshingLogs(false);
    toast.success('Notification logs refreshed.');
  };

  return (
    <div className="flex flex-col gap-6 bg-card text-card-foreground shadow-card rounded-2xl p-5 sm:p-6 min-w-0">
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-[1_1_18rem] items-start gap-3">
          <div className="size-10 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-title text-foreground">Email & notification delivery logs</h2>
            <p className="text-sm text-muted-foreground">
              Search, filter, and inspect delivery status, subject lines, recipients, and diagnostic errors.
            </p>
          </div>
        </div>

        <Button
          onClick={handleRefresh}
          disabled={isRefreshingLogs || isLoadingLogs}
          variant="outline"
          size="sm"
          aria-busy={isRefreshingLogs}
          className="gap-1.5"
        >
          <RefreshCw className={`size-4 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
          {isRefreshingLogs ? 'Refreshing...' : 'Refresh logs'}
        </Button>
      </div>

      {/* Aggregate Stats Row */}
      <div className="grid-fluid gap-3 [--grid-min:9rem]">
        <div className="p-3.5 rounded-2xl bg-muted space-y-0.5">
          <span className="text-label text-muted-foreground">Total events</span>
          <p className="num text-xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 space-y-0.5">
          <span className="text-label text-emerald-700 dark:text-emerald-400">Delivered (sent)</span>
          <p className="num text-xl font-bold text-emerald-700 dark:text-emerald-400">{stats.sent}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-500/10 space-y-0.5">
          <span className="text-label text-amber-700 dark:text-amber-400">Simulated / fallback</span>
          <p className="num text-xl font-bold text-amber-700 dark:text-amber-400">{stats.simulated}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-rose-500/10 space-y-0.5">
          <span className="text-label text-rose-700 dark:text-rose-400">Failed dispatches</span>
          <p className="num text-xl font-bold text-rose-700 dark:text-rose-400">{stats.failed}</p>
        </div>
      </div>

      {/* Search Bar & Filters Controls */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
            <Search className="size-4" />
          </div>
          <Input
            type="text"
            placeholder="Search by subject, recipient, card name, error reason, or message body..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search delivery logs"
            className="pl-10 pr-12 h-12 sm:h-10 bg-muted placeholder:text-muted-foreground rounded-xl"
          />
          {isLoadingLogs ? (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer rounded-r-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        {/* Channel & Status Filter Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Channel Tabs */}
          <div role="group" aria-label="Filter by channel" className="flex max-w-full items-center gap-1 overflow-x-auto no-scrollbar p-1 rounded-xl bg-muted">
            <button
              type="button"
              onClick={() => setChannelFilter('all')}
              aria-pressed={channelFilter === 'all'}
              className={`no-spring shrink-0 h-10 sm:h-8 text-sm font-medium px-3 rounded-lg transition-colors duration-(--motion-fast) ease-(--ease-in-out) cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                channelFilter === 'all'
                  ? 'bg-card text-foreground font-semibold shadow-card'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All channels ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('email')}
              aria-pressed={channelFilter === 'email'}
              className={`no-spring shrink-0 h-10 sm:h-8 text-sm font-medium px-3 rounded-lg transition-colors duration-(--motion-fast) ease-(--ease-in-out) flex items-center gap-1.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                channelFilter === 'email'
                  ? 'bg-card text-foreground font-semibold shadow-card'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Mail className="size-3.5 text-emerald-500" />
              Email ({stats.email})
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('sms')}
              aria-pressed={channelFilter === 'sms'}
              className={`no-spring shrink-0 h-10 sm:h-8 text-sm font-medium px-3 rounded-lg transition-colors duration-(--motion-fast) ease-(--ease-in-out) flex items-center gap-1.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                channelFilter === 'sms'
                  ? 'bg-card text-foreground font-semibold shadow-card'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone className="size-3.5 text-blue-500" />
              SMS ({stats.sms})
            </button>
          </div>

          {/* Status Tabs */}
          <div role="group" aria-label="Filter by status" className="flex max-w-full items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="shrink-0 text-label text-muted-foreground mr-1">Status</span>
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
                  aria-pressed={statusFilter === st}
                  className={`no-spring shrink-0 h-10 sm:h-8 text-sm font-medium px-3 rounded-full transition-colors duration-(--motion-fast) ease-(--ease-in-out) capitalize flex items-center gap-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    statusFilter === st
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{st === 'all' ? 'All' : st}</span>
                  <span className="num text-xs opacity-75">({countMap[st]})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Logs List Table */}
      {logs.length === 0 && !isLoadingLogs ? (
        <div className="p-12 rounded-2xl bg-muted text-center space-y-2">
          <Clock className="size-8 text-muted-foreground mx-auto opacity-50" />
          <p className="text-sm font-semibold text-foreground">No delivery logs found</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery || channelFilter !== 'all' || statusFilter !== 'all'
              ? 'No notifications match your active search and filter criteria.'
              : 'Dispatched alert notifications and automated reminder events will appear here.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const isEmail = log.channel === 'email';

            return (
              <div
                key={log.id}
                className="flex flex-col gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors duration-(--motion-fast) ease-(--ease-in-out)"
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  className="flex flex-col @2xl/main:flex-row @2xl/main:items-center justify-between gap-3 cursor-pointer select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-muted"
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedLogId(isExpanded ? null : log.id);
                    }
                  }}
                >
                  <div className="flex flex-1 items-start gap-3 min-w-0">
                    <div
                      className={`size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isEmail
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                      }`}
                    >
                      {isEmail ? <Mail className="size-4" /> : <Smartphone className="size-4" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
                        <span className="min-w-0 max-w-full text-sm font-semibold text-foreground truncate">
                          {log.email_subject || (isEmail ? 'Card Due Alert Digest' : 'SMS Due Alert')}
                        </span>
                        <span
                          className={`shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                            log.status === 'sent'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : log.status === 'simulated'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground truncate mt-1" title={log.recipient}>
                        To: <span className="font-medium text-foreground">{log.recipient}</span>
                        {log.card_names && ` • Cards: ${log.card_names}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between @2xl/main:justify-end gap-3 text-xs text-muted-foreground shrink-0 pl-11 @2xl/main:pl-0">
                    <span className="num whitespace-nowrap">
                      {formatDate(log.created_at)} at{' '}
                      {new Date(log.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </div>
                </div>

                {/* Expanded Details Pane */}
                {isExpanded && (
                  <div className="flex flex-col gap-3 text-xs">
                    {/* Error Box if Failed */}
                    {log.error_message && (
                      <div className="p-3 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-start gap-2">
                        <AlertCircle className="size-4 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-semibold text-xs">Delivery failure reason</p>
                          <p className="text-xs mt-0.5 font-mono break-words">{log.error_message}</p>
                        </div>
                      </div>
                    )}

                    {/* Message Body Preview */}
                    {log.message_body && (
                      <div className="p-3.5 rounded-xl bg-card space-y-1">
                        <span className="text-label text-muted-foreground block">
                          Message body dispatched
                        </span>
                        <p className="text-xs font-mono whitespace-pre-wrap break-words text-foreground/90 leading-relaxed">
                          {log.message_body}
                        </p>
                      </div>
                    )}

                    {/* Raw Metadata Details */}
                    <div className="flex items-center gap-x-4 gap-y-1 text-xs text-muted-foreground flex-wrap">
                      <span className="min-w-0 break-all">Log ID: <code className="font-mono">{log.id}</code></span>
                      <span className="capitalize">Channel: {log.channel}</span>
                      <span>Dispatched: {new Date(log.created_at).toISOString()}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination & Load More */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {isLoadingMore && <Loader2 className="size-3.5 animate-spin" />}
            {isLoadingMore ? 'Loading More Events...' : `Load More (${totalCount - logs.length} remaining)`}
          </Button>
        </div>
      )}
    </div>
  );
}
