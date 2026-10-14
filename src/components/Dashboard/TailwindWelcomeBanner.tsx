'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TailwindWelcomeBannerProps {
  userName: string;
  onNewTransaction: () => void;
  onStartTour?: () => void;
}

export function TailwindWelcomeBanner({
  userName,
  onNewTransaction,
  onStartTour,
}: TailwindWelcomeBannerProps) {
  const firstName = userName ? userName.split(' ')[0] : 'Friend';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-lightprimary/60 border border-primary/20 p-5 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
      <div className="relative z-10 max-w-lg space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-2xs font-bold uppercase tracking-wider">
          <Sparkles className="size-3" />
          <span>Simple Money Hub</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-foreground">
          Welcome back, {firstName} 👋
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Here is your simple wealth summary today. Everything is organized so you can make informed decisions in seconds.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-2.5">
          <Button
            onClick={onNewTransaction}
            className="rounded-xl px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Record Transaction</span>
          </Button>

          {onStartTour && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    onClick={onStartTour}
                    className="rounded-xl px-3.5 py-2 text-xs font-semibold bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/70 cursor-pointer"
                  />
                }
              >
                <span>Take a 1-Min Tour</span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Quick interactive walkthrough of your dashboard features
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Decorative Friendly Graphic from Template */}
      <div className="hidden md:block relative z-10 shrink-0 self-end -mb-7 -mr-2">
        <Image
          src="/images/dashboard/customer-support-img.png"
          alt="Support Illustration"
          width={150}
          height={115}
          className="object-contain drop-shadow-sm select-none pointer-events-none"
          priority
        />
      </div>

      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 size-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
    </div>
  );
}
