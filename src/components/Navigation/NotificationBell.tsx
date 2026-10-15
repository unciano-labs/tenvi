'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Clock,
  Search,
  Inbox,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  getInAppNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  InAppNotification,
} from '@/app/actions/inAppNotifications';

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [selectedNotification, setSelectedNotification] = useState<InAppNotification | null>(null);
  const [allNotificationsOpen, setAllNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'support' | 'system'>('all');

  const fetchNotifications = async () => {
    try {
      const res = await getInAppNotificationsAction({ limit: 50 });
      if (!res.error) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch {
      // Fail quietly
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 45 seconds for new notifications
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, []);

  const handleNotificationItemClick = async (notification: InAppNotification) => {
    if (!notification.is_read) {
      await markNotificationReadAction(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(c - 1, 0));
    }
    setOpen(false);
    setSelectedNotification(notification);
  };

  const handleNavigateFromNotification = (link: string) => {
    setSelectedNotification(null);
    setAllNotificationsOpen(false);
    setOpen(false);
    router.push(link);
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    await markAllNotificationsReadAction();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    setLoading(false);
  };

  function formatNotificationDate(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'ticket_new':
        return <MessageSquare className="size-3.5 text-blue-500" />;
      case 'ticket_reply':
        return <MessageSquare className="size-3.5 text-purple-500" />;
      case 'ticket_status':
        return <Check className="size-3.5 text-emerald-500" />;
      case 'system':
      default:
        return <Sparkles className="size-3.5 text-amber-500" />;
    }
  }

  function getNotificationBadge(type: string) {
    switch (type) {
      case 'ticket_new':
        return (
          <span className="px-1.5 py-0.5 rounded text-3xs font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400">
            Ticket Opened
          </span>
        );
      case 'ticket_reply':
        return (
          <span className="px-1.5 py-0.5 rounded text-3xs font-extrabold bg-purple-500/10 text-purple-600 dark:text-purple-400">
            New Reply
          </span>
        );
      case 'ticket_status':
        return (
          <span className="px-1.5 py-0.5 rounded text-3xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            Status Update
          </span>
        );
      case 'system':
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-3xs font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400">
            Announcement
          </span>
        );
    }
  }

  function getNotificationActionLabel(item: InAppNotification) {
    if (!item.link) return 'Open Link';
    if (item.link.includes('/support')) return 'View Support Ticket';
    if (item.link.includes('/feedback')) return 'Open in Feedback Inbox';
    if (item.link.includes('/dashboard')) return 'Go to Dashboard';
    return 'Open Related Page';
  }

  // Filtered notifications for "All Notifications" modal
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Tab filter
      if (filterTab === 'unread' && item.is_read) return false;
      if (filterTab === 'support' && !item.type.startsWith('ticket_')) return false;
      if (filterTab === 'system' && item.type !== 'system') return false;

      // Query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(query) ||
          item.message.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [notifications, filterTab, searchQuery]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <TooltipProvider delay={150}>
          <Tooltip>
            <TooltipTrigger
              render={
                <PopoverTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative size-8 sm:size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                      aria-label="Alerts and notifications"
                    />
                  }
                >
                  <Bell className="size-4" />
                  {unreadCount > 0 ? (
                    <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[14px] h-3.5 px-1 rounded-full bg-primary text-[9px] font-black text-primary-foreground shadow-2xs animate-in zoom-in-50">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  ) : (
                    <span className="sr-only">Notifications</span>
                  )}
                </PopoverTrigger>
              }
            />
            <TooltipContent side="bottom">Notifications & Announcements</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-80 sm:w-96 p-0 rounded-2xl shadow-lift border border-border/60 bg-card overflow-hidden"
        >
          {/* Popover Header */}
          <div className="p-3.5 px-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-3xs font-extrabold bg-primary/10 text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="text-3xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="size-3" />
                  Mark read
                </button>
              )}
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-1.5">
                <Bell className="size-6 opacity-30 mx-auto" />
                <p className="text-xs font-semibold text-foreground/80">No notifications yet</p>
                <p className="text-3xs text-muted-foreground max-w-xs mx-auto px-4">
                  You'll receive alerts here when announcements are broadcast or support replies.
                </p>
              </div>
            ) : (
              notifications.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationItemClick(item)}
                  className={`p-3.5 px-4 flex items-start gap-3 hover:bg-muted/40 transition-colors cursor-pointer group ${
                    !item.is_read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="size-7 rounded-xl bg-muted/80 border border-border/50 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    {getNotificationIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs font-bold truncate ${
                          !item.is_read ? 'text-foreground' : 'text-foreground/80'
                        }`}
                      >
                        {item.title}
                      </p>
                      <span className="text-3xs text-muted-foreground whitespace-nowrap font-mono flex items-center gap-1 shrink-0">
                        <Clock className="size-2.5" />
                        {formatNotificationDate(item.created_at).split(',')[0]}
                      </span>
                    </div>

                    <p className="text-2xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  {!item.is_read && (
                    <span className="size-2 rounded-full bg-primary shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Popover Footer */}
          <div className="p-2.5 px-4 border-t border-border/50 bg-muted/20 flex items-center justify-between text-2xs">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setAllNotificationsOpen(true);
              }}
              className="font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All ({notifications.length})</span>
              <ArrowRight className="size-3" />
            </button>

            <Link
              href="/dashboard/support"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <span>Support Hub</span>
              <ExternalLink className="size-3" />
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      {/* 1. Specific Notification Detail Modal */}
      <Dialog
        open={Boolean(selectedNotification)}
        onOpenChange={(isOpen) => !isOpen && setSelectedNotification(null)}
      >
        <DialogContent className="sm:max-w-lg p-6 space-y-4">
          {selectedNotification && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-xl bg-muted/80 border border-border/50 flex items-center justify-center shrink-0 shadow-2xs">
                      {getNotificationIcon(selectedNotification.type)}
                    </div>
                    {getNotificationBadge(selectedNotification.type)}
                  </div>
                  <span className="text-3xs text-muted-foreground font-mono flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatNotificationDate(selectedNotification.created_at)}
                  </span>
                </div>
                <DialogTitle className="text-base font-bold text-foreground text-left mt-2 leading-snug">
                  {selectedNotification.title}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Detailed view of notification
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/50 max-h-72 overflow-y-auto">
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">
                  {selectedNotification.message}
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 flex flex-col sm:flex-row sm:items-center justify-between">
                <div>
                  {selectedNotification.link ? (
                    <Button
                      size="sm"
                      onClick={() => handleNavigateFromNotification(selectedNotification.link!)}
                      className="gap-1.5 cursor-pointer bg-primary text-primary-foreground font-semibold"
                    >
                      <span>{getNotificationActionLabel(selectedNotification)}</span>
                      <ExternalLink className="size-3.5" />
                    </Button>
                  ) : (
                    <div />
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedNotification(null)}
                  className="cursor-pointer"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. All Notifications History Modal */}
      <Dialog
        open={allNotificationsOpen}
        onOpenChange={setAllNotificationsOpen}
      >
        <DialogContent className="sm:max-w-2xl p-6 space-y-4">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Bell className="size-4.5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    All Notifications
                  </DialogTitle>
                  <p className="text-2xs text-muted-foreground">
                    Complete history of announcements, ticket updates, and notices
                  </p>
                </div>
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="gap-1.5 cursor-pointer text-xs"
                >
                  <CheckCheck className="size-3.5 text-primary" />
                  Mark all read ({unreadCount})
                </Button>
              )}
            </div>
            <DialogDescription className="sr-only">
              Browse, filter, and inspect all in-app notifications
            </DialogDescription>
          </DialogHeader>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <div className="relative flex-1">
              <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/30"
              />
            </div>
            <div className="flex items-center gap-1 p-0.5 bg-muted/50 rounded-lg self-start sm:self-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-2.5 py-1 text-3xs font-semibold rounded-md transition-colors cursor-pointer ${
                  filterTab === 'all'
                    ? 'bg-card text-foreground shadow-2xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('unread')}
                className={`px-2.5 py-1 text-3xs font-semibold rounded-md transition-colors cursor-pointer ${
                  filterTab === 'unread'
                    ? 'bg-card text-foreground shadow-2xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Unread ({unreadCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('support')}
                className={`px-2.5 py-1 text-3xs font-semibold rounded-md transition-colors cursor-pointer ${
                  filterTab === 'support'
                    ? 'bg-card text-foreground shadow-2xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Support ({notifications.filter((n) => n.type.startsWith('ticket_')).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('system')}
                className={`px-2.5 py-1 text-3xs font-semibold rounded-md transition-colors cursor-pointer ${
                  filterTab === 'system'
                    ? 'bg-card text-foreground shadow-2xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Announcements ({notifications.filter((n) => n.type === 'system').length})
              </button>
            </div>
          </div>

          {/* Filtered Notifications List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border/40 rounded-xl border border-border/50 bg-card">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-1.5">
                <Inbox className="size-6 opacity-30 mx-auto" />
                <p className="text-xs font-semibold text-foreground/80">No notifications match your filter</p>
                <p className="text-3xs text-muted-foreground">Try clearing search or choosing another category.</p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationItemClick(item)}
                  className={`p-3.5 px-4 flex items-start gap-3 hover:bg-muted/40 transition-colors cursor-pointer group ${
                    !item.is_read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="size-8 rounded-xl bg-muted/80 border border-border/50 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    {getNotificationIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p
                          className={`text-xs font-bold truncate ${
                            !item.is_read ? 'text-foreground' : 'text-foreground/80'
                          }`}
                        >
                          {item.title}
                        </p>
                        {getNotificationBadge(item.type)}
                      </div>
                      <span className="text-3xs text-muted-foreground whitespace-nowrap font-mono flex items-center gap-1 shrink-0">
                        <Clock className="size-2.5" />
                        {formatNotificationDate(item.created_at)}
                      </span>
                    </div>
                    <p className="text-2xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                  {!item.is_read && (
                    <span className="size-2 rounded-full bg-primary shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAllNotificationsOpen(false)}
              className="cursor-pointer"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
