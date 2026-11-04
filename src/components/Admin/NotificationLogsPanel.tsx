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
    <div className="bg-card text-card-foreground shadow-card rounded-3xl p-6 sm:p-7 overflow-hidden space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-foreground tracking-tight">
              Email & Notification Delivery Logs
            </h2>
            <p className="text-xs text-muted-foreground">
              Search, filter, and inspect delivery status, subject lines, recipients, and diagnostic errors.
            </p>
          </div>
        </div>

        <Button
          onClick={handleRefresh}
          disabled={isRefreshingLogs || isLoadingLogs}
          variant="outline"
          size="sm"
          className="gap-1.5 self-start sm:self-auto text-xs cursor-pointer"
        >
          <RefreshCw className={`size-3.5 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
          {isRefreshingLogs ? 'Refreshing...' : 'Refresh Logs'}
        </Button>
      </div>

      {/* Aggregate Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-muted space-y-0.5">
          <span className="text-2xs text-muted-foreground font-medium uppercase tracking-wider">Total Events</span>
          <p className="text-lg font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 space-y-0.5">
          <span className="text-2xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider">Delivered (Sent)</span>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.sent}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-500/10 space-y-0.5">
          <span className="text-2xs text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider">Simulated / Fallback</span>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.simulated}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-rose-500/10 space-y-0.5">
          <span className="text-2xs text-rose-600 dark:text-rose-400 font-medium uppercase tracking-wider">Failed Dispatches</span>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{stats.failed}</p>
        </div>
      </div>

      {/* Search Bar & Filters Controls */}
      <div className="space-y-3.5">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
            <Search className="size-4" />
          </div>
          <Input
            type="text"
            placeholder="Search by subject, recipient, card name, error reason, or message body..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-10 text-xs sm:text-sm font-medium bg-muted placeholder:text-muted-foreground rounded-xl"
          />
          {isLoadingLogs ? (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
              title="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        {/* Channel & Status Filter Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
          {/* Channel Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted">
            <button
              type="button"
              onClick={() => setChannelFilter('all')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                channelFilter === 'all'
                  ? 'bg-card text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Channels ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('email')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                channelFilter === 'email'
                  ? 'bg-card text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Mail className="size-3.5 text-emerald-500" />
              Email ({stats.email})
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('sms')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                channelFilter === 'sms'
                  ? 'bg-card text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone className="size-3.5 text-blue-500" />
              SMS ({stats.sms})
            </button>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5">
            <span className="text-2xs text-muted-foreground font-semibold mr-1">Status:</span>
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
                  className={`text-xs font-semibold px-2.5 py-1 rounded-xl transition-colors capitalize flex items-center gap-1 cursor-pointer ${
                    statusFilter === st
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{st === 'all' ? 'All' : st}</span>
                  <span className="text-2xs opacity-75 font-mono">({countMap[st]})</span>
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
          <p className="text-sm font-bold text-foreground">No delivery logs found</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery || channelFilter !== 'all' || statusFilter !== 'all'
              ? 'No notifications match your active search and filter criteria.'
              : 'Dispatched alert notifications and automated reminder events will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const isEmail = log.channel === 'email';

            return (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-muted/50 hover:bg-muted/80 transition-colors space-y-3"
              >
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isEmail
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {isEmail ? <Mail className="size-4" /> : <Smartphone className="size-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-foreground truncate">
                          {log.email_subject || (isEmail ? 'Card Due Alert Digest' : 'SMS Due Alert')}
                        </span>
                        <span
                          className={`text-2xs font-bold px-2 py-0.5 rounded-full capitalize ${
                            log.status === 'sent'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : log.status === 'simulated'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>

                      <p className="text-2xs text-muted-foreground truncate mt-0.5">
                        To: <span className="font-medium text-foreground">{log.recipient}</span>
                        {log.card_names && ` • Cards: ${log.card_names}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 text-2xs text-muted-foreground shrink-0 pl-11 sm:pl-0">
                    <span>
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
                  <div className="pt-2 space-y-3 text-xs animate-in fade-in duration-150">
                    {/* Error Box if Failed */}
                    {log.error_message && (
                      <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-start gap-2">
                        <AlertCircle className="size-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-2xs uppercase tracking-wider">Delivery Failure Reason:</p>
                          <p className="text-2xs mt-0.5 font-mono">{log.error_message}</p>
                        </div>
                      </div>
                    )}

                    {/* Message Body Preview */}
                    {log.message_body && (
                      <div className="p-3.5 rounded-xl bg-card space-y-1">
                        <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                          Message Body Dispatched:
                        </span>
                        <p className="text-2xs font-mono whitespace-pre-wrap text-foreground/90 leading-relaxed">
                          {log.message_body}
                        </p>
                      </div>
                    )}

                    {/* Raw Metadata Details */}
                    <div className="flex items-center gap-4 text-2xs text-muted-foreground flex-wrap">
                      <span>Log ID: <code className="font-mono">{log.id}</code></span>
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
            className="text-xs font-semibold cursor-pointer gap-2"
          >
            {isLoadingMore && <Loader2 className="size-3.5 animate-spin" />}
            {isLoadingMore ? 'Loading More Events...' : `Load More (${totalCount - logs.length} remaining)`}
          </Button>
        </div>
      )}
    </div>
  );
}
