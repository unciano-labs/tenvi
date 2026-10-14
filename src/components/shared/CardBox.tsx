'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CardBoxProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const CardBox: React.FC<CardBoxProps> = ({ children, className, id }) => {
  return (
    <Card
      id={id}
      className={cn(
        'rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs transition-shadow hover:shadow-card',
        className
      )}
    >
      {children}
    </Card>
  );
};

export default CardBox;
