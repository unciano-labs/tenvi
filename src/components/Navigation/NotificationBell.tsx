'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Clock,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  getInAppNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  InAppNotification,
} from '@/app/actions/inAppNotifications';
import { formatDate } from '@/lib/finance/calculations';

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await getInAppNotificationsAction();
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

  const handleNotificationClick = async (notification: InAppNotification) => {
    if (!notification.is_read) {
      await markNotificationReadAction(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(c - 1, 0));
    }
    setOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    await markAllNotificationsReadAction();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    setLoading(false);
  };

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'ticket_new':
        return <MessageSquare className="size-3.5 text-blue-500" />;
      case 'ticket_reply':
        return <MessageSquare className="size-3.5 text-purple-500" />;
      case 'ticket_status':
        return <Check className="size-3.5 text-emerald-500" />;
      default:
        return <Sparkles className="size-3.5 text-amber-500" />;
    }
  }

  return (
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
          <TooltipContent side="bottom">Notifications & Ticket Updates</TooltipContent>
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

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={loading}
              className="text-3xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="size-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-1.5">
              <Bell className="size-6 opacity-30 mx-auto" />
              <p className="text-xs font-semibold text-foreground/80">No notifications yet</p>
              <p className="text-3xs text-muted-foreground max-w-xs mx-auto px-4">
                You'll receive alerts here when support responds or your ticket status updates.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
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
                      {formatDate(item.created_at)}
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

        {/* Footer */}
        <div className="p-2.5 px-4 border-t border-border/50 bg-muted/20 text-center">
          <Link
            href="/dashboard/support"
            onClick={() => setOpen(false)}
            className="text-2xs font-semibold text-primary hover:underline flex items-center justify-center gap-1.5"
          >
            <span>View All Support Tickets</span>
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
