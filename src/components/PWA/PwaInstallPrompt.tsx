'use client';

import React, { useState } from 'react';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { TenviIcon } from '@/components/ui/TenviIcon';
import { Button } from '@/components/ui/button';
import {
  Download,
  Share,
  PlusSquare,
  X,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function PwaInstallPrompt() {
  const {
    isMounted,
    isStandalone,
    canInstall,
    isIos,
    isDismissed,
    hasNativePrompt,
    promptInstall,
    dismissPrompt,
  } = usePwaInstall();

  const [iosDialogOpen, setIosDialogOpen] = useState(false);

  if (!isMounted || isStandalone || isDismissed || !canInstall) {
    return null;
  }

  const handleInstallClick = () => {
    if (hasNativePrompt) {
      promptInstall();
    } else if (isIos) {
      setIosDialogOpen(true);
    }
  };

  return (
    <>
      {/* Non-intrusive floating installation card */}
      <aside
        aria-label="Install Tenvi App"
        className="fixed top-[max(1rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md bg-card/95 backdrop-blur-xl border border-border/70 rounded-2xl shadow-xl p-3 sm:p-3.5 transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <TenviIcon variant="solid" className="w-9 h-9 rounded-xl shadow-2xs" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs border border-background">
                <Download className="w-2 h-2 text-white" />
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground truncate">Install Tenvi App</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary">
                  Native
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                Install for fast, fullscreen wealth tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              size="xs"
              onClick={handleInstallClick}
              className="rounded-xl font-bold text-xs gap-1 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={dismissPrompt}
              title="Dismiss"
              aria-label="Dismiss install banner"
              className="rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* iOS Safari Installation Instructions Dialog */}
      <Dialog open={iosDialogOpen} onOpenChange={setIosDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-5 border-border/70 bg-card/95 backdrop-blur-xl">
          <DialogHeader className="text-left space-y-1.5">
            <div className="flex items-center gap-2.5 pb-1">
              <TenviIcon variant="solid" className="w-8 h-8 rounded-xl shadow-xs" />
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Install Tenvi on iOS
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Follow these 2 simple steps in Safari:
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs text-foreground">
            {/* Step 1 */}
            <div className="flex items-start gap-3 bg-muted/50 p-3 rounded-2xl border border-border/40">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                1
              </div>
              <div className="space-y-0.5">
                <div className="font-semibold flex items-center gap-1.5">
                  <span>Tap the Share button</span>
                  <Share className="w-3.5 h-3.5 text-primary inline" />
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Located at the bottom of your Safari browser window.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 bg-muted/50 p-3 rounded-2xl border border-border/40">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                2
              </div>
              <div className="space-y-0.5">
                <div className="font-semibold flex items-center gap-1.5">
                  <span>Select &apos;Add to Home Screen&apos;</span>
                  <PlusSquare className="w-3.5 h-3.5 text-primary inline" />
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Scroll down the share sheet and tap &quot;Add to Home Screen&quot;, then tap &quot;Add&quot; in the top-right.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              onClick={() => {
                setIosDialogOpen(false);
                dismissPrompt();
              }}
              className="w-full rounded-xl font-bold shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
