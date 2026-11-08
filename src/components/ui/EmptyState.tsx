import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <Card className="rounded-2xl bg-muted/40 px-6 py-10 sm:p-12 text-center shadow-none">
      <CardContent className="p-0 flex flex-col items-center">
        <div className="size-12 rounded-2xl bg-card text-muted-foreground shadow-card flex items-center justify-center mx-auto mb-4">
          <Icon className="size-6" aria-hidden="true" />
        </div>
        <h3 className="text-title text-foreground mb-1.5">{title}</h3>
        <p className="text-sm sm:text-base text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
          {description}
        </p>
        {actionText && onAction && (
          <Button onClick={onAction}>
            {actionText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
