'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Bug,
  Lightbulb,
  Calculator,
  Palette,
  MessageSquare,
  Loader2,
  CheckCircle2,
  Smartphone,
  Monitor,
  ExternalLink,
} from 'lucide-react';
import { submitFeedbackAction, FeedbackType } from '@/app/actions/feedback';
import { toast } from 'sonner';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FEEDBACK_TYPES: { type: FeedbackType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'bug', label: 'Report a Bug', icon: Bug },
  { type: 'feature', label: 'Feature Request', icon: Lightbulb },
  { type: 'accounting_issue', label: 'Accounting Question', icon: Calculator },
  { type: 'ux_ui', label: 'Design & UX', icon: Palette },
  { type: 'other', label: 'General Feedback', icon: MessageSquare },
];

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const pathname = usePathname();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 5) {
      toast.error('Please write a brief description (min 5 characters)');
      return;
    }

    startTransition(async () => {
      // Auto-collect technical environment
      const isStandalonePwa =
        typeof window !== 'undefined' &&
        (window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true);

      const deviceMeta = {
        viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
        screen: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        isPwa: isStandalonePwa,
        submittedAt: new Date().toISOString(),
      };

      const res = await submitFeedbackAction({
        title: title.trim() || undefined,
        type,
        message,
        page_url: pathname,
        device_meta: deviceMeta,
      });

      if (res.success) {
        toast.success('Thank you! Your ticket has been submitted to the support team.');
        setTitle('');
        setMessage('');
        onOpenChange(false);
      } else {
        toast.error(res.error || 'Failed to submit feedback');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <MessageSquare className="size-5" />
            <DialogTitle className="text-base font-bold">Send Feedback or Report Bug</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Have an issue or a feature idea? Let us know and we'll review it immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Feedback Category Pills */}
          <div className="space-y-1.5">
            <label className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
              Feedback Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FEEDBACK_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = type === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setType(t.type)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary shadow-2xs'
                        : 'border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject / Title Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-2xs">
              <label className="font-bold uppercase tracking-wider text-muted-foreground">
                Subject / Title
              </label>
              <span className="text-muted-foreground">{title.length}/120</span>
            </div>
            <input
              type="text"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Issue with statement balance, Feature suggestion"
              className="w-full text-xs p-2.5 rounded-xl bg-muted/40 border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground"
            />
          </div>

          {/* Message Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-2xs">
              <label className="font-bold uppercase tracking-wider text-muted-foreground">
                Description
              </label>
              <span className="text-muted-foreground">{message.length}/2000</span>
            </div>
            <textarea
              rows={4}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What happened? What would you like to see improved?"
              className="w-full text-xs p-3 rounded-xl bg-muted/40 border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none text-foreground"
            />
          </div>

          {/* Auto-detected metadata preview */}
          <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40 text-3xs text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono truncate">
              📍 Route: <code className="text-foreground">{pathname}</code>
            </span>
            <span className="shrink-0 text-foreground/80 font-semibold">
              Context auto-attached
            </span>
          </div>

          {/* Link to dedicated tickets hub */}
          <div className="text-center pt-1">
            <Link
              href="/dashboard/support"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-1.5 text-2xs text-primary hover:underline font-semibold"
            >
              <span>View your past tickets & support replies</span>
              <ExternalLink className="size-3" />
            </Link>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || message.trim().length < 5}
              className="cursor-pointer font-bold"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              Send Feedback
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
