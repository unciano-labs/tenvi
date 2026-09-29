'use client';

import React, { useState, useEffect } from 'react';
import { createBillSplitAction } from '@/app/actions/splits';
import { toast } from 'sonner';
import { X, Receipt, Plus, Trash2, Loader2, CreditCard as CardIcon } from 'lucide-react';
import { Contact, CreditCard } from '@/types';
import { calculateSplitShares, formatMoney } from '@/lib/finance/calculations';

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
    const total = parseFloat(totalAmount);
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

  if (!isOpen) return null;

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
    const total = parseFloat(totalAmount);
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
      toast.success('Bill split created successfully!');
      setTitle('');
      setTotalAmount('');
      setParticipants([]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto bili-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6 pr-10 sm:pr-12">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900">Split a Bill</h2>
            <p className="text-xs text-slate-500">
              For shared restaurant bills, groceries, or trips
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              What was this for?
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Samgyupsal with College Friends, Team Lunch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bili-input w-full text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Total Bill Amount (PHP)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-lg font-bold text-slate-400">
                  ₱
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="bili-input w-full pl-9 text-lg font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Date of Bill
              </label>
              <input
                type="date"
                required
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                className="bili-input w-full text-sm"
              />
            </div>
          </div>

          {/* Optional Credit Card */}
          {creditCards.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CardIcon className="w-3.5 h-3.5" />
                Did you charge this on your card? (Optional)
              </label>
              <select
                value={creditCardId}
                onChange={(e) => setCreditCardId(e.target.value)}
                className="bili-input w-full text-sm"
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
          <div className="p-4 rounded-2xl bg-slate-50 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Who's Chipping In? ({participants.length})
              </span>
              {participants.length > 0 && (
                <span className="text-xs font-semibold text-slate-500">
                  {formatMoney(participants[0]?.shareAmount)} each
                </span>
              )}
            </div>

            {/* Input to add person */}
            <div className="flex gap-2">
              <input
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
                className="bili-input flex-1 bg-white text-sm"
              />
              <button
                type="button"
                onClick={handleAddPerson}
                className="bili-btn-primary px-4 py-2 text-xs font-semibold"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {/* Existing contacts quick pills */}
            {contacts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 self-center mr-1">
                  Quick pick:
                </span>
                {contacts.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    type="button"
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
                    className="text-xs px-2.5 py-1 rounded-lg bg-white text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    + {c.name}
                  </button>
                ))}
              </div>
            )}

            {/* Added Participants List */}
            {participants.length > 0 && (
              <div className="space-y-2 pt-2">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white shadow-sm text-sm"
                  >
                    <span className="font-semibold text-slate-900">{p.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-700">
                        {formatMoney(p.shareAmount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePerson(p.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="bili-btn-secondary flex-1 py-3 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bili-btn-primary flex-1 py-3 text-sm shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Splitting...
                </>
              ) : (
                'Create Bill Split'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
