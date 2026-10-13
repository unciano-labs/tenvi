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
    <Card className="rounded-3xl p-12 text-center shadow-xs">
      <CardContent className="p-0 flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-4">
          <Icon className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
          {description}
        </p>
        {actionText && onAction && (
          <Button onClick={onAction} size="sm">
            {actionText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
