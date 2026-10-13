'use client';

import React, { useState, useEffect } from 'react';
import { createBillSplitAction } from '@/app/actions/splits';
import { toast } from 'sonner';
import { Receipt, Plus, Trash2, Loader2, CreditCard as CardIcon } from 'lucide-react';
import { Contact, CreditCard } from '@/types';
import { calculateSplitShares, formatMoney } from '@/lib/finance/calculations';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';

interface BillSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  creditCards: CreditCard[];
}

interface ParticipantItem {
  id: string; // temporary local id
  contactId?: string;
  name: string;
  shareAmount: number;
}

export function BillSplitModal({
  isOpen,
  onClose,
  contacts,
  creditCards,
}: BillSplitModalProps) {
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [creditCardId, setCreditCardId] = useState('');
  const [occurredOn, setOccurredOn] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [note, setNote] = useState('');

  // List of friends chipping in
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [personInput, setPersonInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recalculate shares evenly when totalAmount or participant count changes
  useEffect(() => {
    const total = parseFloat(totalAmount.replace(/,/g, ''));
    if (!isNaN(total) && total > 0 && participants.length > 0) {
      const shares = calculateSplitShares(total, participants.length);
      setParticipants((prev) =>
        prev.map((p, idx) => ({
          ...p,
          shareAmount: shares[idx] ?? 0,
        }))
      );
    }
  }, [totalAmount, participants.length]);

  const handleAddPerson = () => {
    if (!personInput.trim()) return;

    // Check if matching contact
    const existing = contacts.find(
      (c) => c.name.toLowerCase() === personInput.trim().toLowerCase()
    );

    const newItem: ParticipantItem = {
      id: Math.random().toString(),
      contactId: existing?.id,
      name: existing ? existing.name : personInput.trim(),
      shareAmount: 0,
    };

    setParticipants([...participants, newItem]);
    setPersonInput('');
  };

  const handleRemovePerson = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(totalAmount.replace(/,/g, ''));
    if (!total || total <= 0) {
      toast.error('Please enter a valid bill total.');
      return;
    }

    if (participants.length === 0) {
      toast.error('Please add at least one person who is chipping in.');
      return;
    }

    setIsSubmitting(true);
    const res = await createBillSplitAction({
      title,
      totalAmount: total,
      creditCardId: creditCardId || null,
      occurredOn,
      note: note.trim() || null,
      participants: participants.map((p) => ({
        contactId: p.contactId || null,
        name: p.name,
        shareAmount: p.shareAmount,
      })),
    });

    setIsSubmitting(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Bill split recorded!');
      setTitle('');
      setTotalAmount('');
      setCreditCardId('');
      setNote('');
      setParticipants([]);
      onClose();
    }
  };

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent className="max-w-lg">
        <ResponsiveDialogHeader className="pr-10 sm:pr-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <ResponsiveDialogTitle className="truncate">Split a Bill</ResponsiveDialogTitle>
              <ResponsiveDialogDescription className="truncate">
                For shared restaurant bills, groceries, or group trips
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                What was this for?
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. Samgyupsal with Friends, Team Lunch"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Total Bill Amount (PHP)
                </label>
                <MoneyInput
                  required
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(val) => setTotalAmount(val)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Date of Bill
                </label>
                <Input
                  type="date"
                  required
                  value={occurredOn}
                  onChange={(e) => setOccurredOn(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Optional Credit Card */}
            {creditCards.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CardIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  Did you charge this on your card? (Optional)
                </label>
                <select
                  value={creditCardId}
                  onChange={(e) => setCreditCardId(e.target.value)}
                  className="w-full min-h-12 h-12 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:ring-2 focus:ring-ring"
                >
                  <option value="">-- No, paid via Cash or GCash --</option>
                  {creditCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.bank_name} - {c.name} (•••• {c.last_4})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* People Chipping In */}
            <div className="p-4 rounded-2xl bg-muted/60 space-y-3">
              <div className="flex justify-between items-center min-w-0">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider truncate">
                  Who's Chipping In? ({participants.length})
                </span>
                {participants.length > 0 && (
                  <span className="text-xs font-semibold text-muted-foreground shrink-0 ml-2">
                    {formatMoney(participants[0]?.shareAmount)} each
                  </span>
                )}
              </div>

              {/* Input to add person */}
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Type friend's name (e.g. John, Sarah)..."
                  value={personInput}
                  onChange={(e) => setPersonInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddPerson();
                    }
                  }}
                  className="flex-1 text-sm bg-background"
                />
                <Button
                  type="button"
                  onClick={handleAddPerson}
                  size="default"
                  className="shrink-0 gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>

              {/* Existing contacts quick pills */}
              {contacts.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs text-muted-foreground shrink-0 mr-1">
                    Quick pick:
                  </span>
                  {contacts.slice(0, 5).map((c) => (
                    <Button
                      key={c.id}
                      type="button"
                      size="xs"
                      variant="soft"
                      onClick={() => {
                        if (!participants.some((p) => p.name === c.name)) {
                          setParticipants([
                            ...participants,
                            {
                              id: Math.random().toString(),
                              contactId: c.id,
                              name: c.name,
                              shareAmount: 0,
                            },
                          ]);
                        }
                      }}
                      className="text-xs rounded-lg"
                    >
                      + {c.name}
                    </Button>
                  ))}
                </div>
              )}

              {/* Added Participants List */}
              {participants.length > 0 && (
                <div className="space-y-2 pt-2">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-card shadow-xs text-sm min-w-0 gap-3"
                    >
                      <span className="font-semibold text-foreground truncate min-w-0 flex-1">{p.name}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-foreground">
                          {formatMoney(p.shareAmount)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleRemovePerson(p.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 flex gap-3">
              <Button
                type="button"
                variant="soft"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Splitting...
                  </>
                ) : (
                  'Create Bill Split'
                )}
              </Button>
            </div>
          </form>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
