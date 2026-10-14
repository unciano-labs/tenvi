'use client';

import React from 'react';
import { CreditCard } from '@/types';
import { FlippableCreditCard, CardSpendingSummary } from './FlippableCreditCard';

export type { CardSpendingSummary };

interface CreditCardTileProps {
  card: CreditCard;
  spending: CardSpendingSummary;
  onEdit: (card: CreditCard) => void;
  onDelete: (cardId: string) => void;
}

export function CreditCardTile({
  card,
  spending,
  onEdit,
  onDelete,
}: CreditCardTileProps) {
  return (
    <FlippableCreditCard
      card={card}
      spending={spending}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}
