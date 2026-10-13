'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface CardsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CardsError({ error, reset }: CardsErrorProps) {
  useEffect(() => {
    console.error('Cards page error:', error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in duration-150">
      <Card className="shadow-card">
        <CardContent className="p-8 sm:p-10 flex flex-col items-center text-center space-y-5">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-danger-soft text-danger-soft-foreground">
            <AlertTriangle className="size-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">
              We couldn't load your credit cards
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              A temporary issue occurred while calculating statement cycles and balances. Your saved data is safe.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="default"
              onClick={() => reset()}
              className="min-h-12 h-12 px-5 font-semibold"
            >
              <RotateCcw className="mr-2 size-4" />
              Try again
            </Button>

            <Button
              variant="soft"
              size="default"
              render={<Link href="/dashboard" />}
              className="min-h-12 h-12 px-5 font-semibold"
            >
              <Home className="mr-2 size-4" />
              Back to Overview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
