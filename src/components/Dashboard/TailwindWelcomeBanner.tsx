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
    <section className="flex items-end justify-between gap-6">
      <div className="min-w-0 flex-1 flex flex-col gap-2">
        <p className="inline-flex items-center gap-1.5 text-label text-primary">
          <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
          <span>Simple money hub</span>
        </p>
        <h1 className="text-display text-foreground">
          Welcome back, {firstName} <span aria-hidden="true">👋</span>
        </h1>
        <p className="max-w-prose text-sm sm:text-base text-muted-foreground">
          Here is your simple wealth summary today. Everything is organized so you can make informed decisions in seconds.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-2">
          <Button onClick={onNewTransaction} className="gap-2">
            <Plus className="size-4" />
            <span>Record transaction</span>
          </Button>

          {onStartTour && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="soft"
                    onClick={onStartTour}
                  />
                }
              >
                <span>Take a 1-minute tour</span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Quick interactive walkthrough of your dashboard features
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Friendly illustration — decorative, only where there's room for it */}
      <div className="hidden @2xl/main:block shrink-0" aria-hidden="true">
        <Image
          src="/images/dashboard/customer-support-img.png"
          alt=""
          width={150}
          height={115}
          className="h-auto w-[132px] @4xl/main:w-[150px] object-contain select-none pointer-events-none"
          priority
        />
      </div>
    </section>
  );
}
