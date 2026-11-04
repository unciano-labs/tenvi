'use client';

import React from 'react';
import { CreditCard } from '@/types';
import type { CardDueDetails } from '@/lib/finance/calculations';
import { FlippableCreditCard, CardSpendingSummary } from './FlippableCreditCard';

export type { CardSpendingSummary };

interface CreditCardTileProps {
  card: CreditCard;
  spending: CardSpendingSummary;
  dueDetails?: CardDueDetails;
  onEdit: (card: CreditCard) => void;
  onDelete: (cardId: string) => void;
}

export function CreditCardTile({
  card,
  spending,
  dueDetails,
  onEdit,
  onDelete,
}: CreditCardTileProps) {
  return (
    <FlippableCreditCard
      card={card}
      spending={spending}
      dueDetails={dueDetails}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}
