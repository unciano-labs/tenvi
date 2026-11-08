'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createTransactionAction, createBatchTransactionsAction } from '@/app/actions/transactions';
import { parseReceiptImageAction, ReceiptParseResult } from '@/app/actions/receipts';
import { toast } from 'sonner';
import {
  X,
  Plus,
  PlusCircle,
  MinusCircle,
  ArrowLeftRight,
  Loader2,
  Calendar,
  FileText,
  CreditCard as CreditCardIcon,
  PiggyBank,
  Building2,
  Camera,
  UploadCloud,
  Check,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { Category, CreditCard, SavingsAccount, Property } from '@/types';
import { PAYMENT_METHODS } from '@/lib/constants';
import { optimizeImageForUpload } from '@/lib/ai/imageOptimizer';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/ui/money-input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

export interface ParsedCardItem {
  id: string;
  merchant: string;
  amount: string;
  date: string;
  categoryId: string;
  paymentMethod: string;
  creditCardId: string;
  savingsId: string;
  propertyId: string;
  itemsSummary: string | null;
  status: 'idle' | 'saving' | 'saved' | 'error';
  errorMessage?: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  creditCards: CreditCard[];
  savingsAccounts?: SavingsAccount[];
  properties?: Property[];
  defaultCreditCardId?: string;
  defaultPropertyId?: string;
  defaultPaymentMethod?: string;
  autoTriggerScan?: boolean;
  initialParsedItems?: ParsedCardItem[];
}

export function TransactionModal({
  isOpen,
  onClose,
  categories,
  creditCards,
  savingsAccounts = [],
  properties = [],
  defaultCreditCardId,
  defaultPropertyId,
  defaultPaymentMethod,
  autoTriggerScan,
  initialParsedItems,
}: TransactionModalProps) {
  // Manual Single Form States
  const [kind, setKind] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>(
    defaultPaymentMethod || (defaultCreditCardId ? 'credit_card' : 'cash')
  );
  const [creditCardId, setCreditCardId] = useState(defaultCreditCardId || '');
  const [savingsId, setSavingsId] = useState('');
  const [transferToSavingsId, setTransferToSavingsId] = useState('');
  const [propertyId, setPropertyId] = useState(defaultPropertyId || '');
  const [occurredOn, setOccurredOn] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Scanner States
  const receiptCameraRef = useRef<HTMLInputElement>(null);
  const receiptFileRef = useRef<HTMLInputElement>(null);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [parsedReceipt, setParsedReceipt] = useState<ReceiptParseResult | null>(null);

  // Multi-Transaction Cards Review States
  const [parsedCardItems, setParsedCardItems] = useState<ParsedCardItem[]>([]);
  const [isBatchSaving, setIsBatchSaving] = useState(false);

  // Clean up object URL
  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    };
  }, [receiptPreviewUrl]);

  useEffect(() => {
    if (isOpen) {
      if (defaultCreditCardId) {
        setPaymentMethod('credit_card');
        setCreditCardId(defaultCreditCardId);
      } else if (defaultPaymentMethod) {
        setPaymentMethod(defaultPaymentMethod);
      }
      if (defaultPropertyId) {
        setPropertyId(defaultPropertyId);
      }

      if (initialParsedItems && initialParsedItems.length > 0) {
        setParsedCardItems(initialParsedItems);
      }

      if (autoTriggerScan) {
        const timer = setTimeout(() => {
          receiptCameraRef.current?.click();
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, defaultCreditCardId, defaultPropertyId, defaultPaymentMethod, autoTriggerScan]);

  const filteredCategories = categories.filter((c) => c.kind === kind);
  const expenseCategories = categories.filter((c) => c.kind === 'expense');

  const clearReceipt = () => {
    setParsedReceipt(null);
    setParsedCardItems([]);
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
      setReceiptPreviewUrl(null);
    }
    if (receiptCameraRef.current) receiptCameraRef.current.value = '';
    if (receiptFileRef.current) receiptFileRef.current.value = '';
  };

  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      setReceiptPreviewUrl(URL.createObjectURL(file));
    }

    setIsScanningReceipt(true);

    try {
      // Scale down large camera photos (e.g. 12-48MP from phones) to prevent payload errors
      const optimizedFile = await optimizeImageForUpload(file);

      const formData = new FormData();
      formData.append('file', optimizedFile);

      const res = await parseReceiptImageAction(formData);

      if (!res.success || !res.result) {
        toast.error(res.error || 'Failed to parse receipt image. Please enter details manually.');
        return;
      }

      const parsed = res.result;
      setParsedReceipt(parsed);

      // Extract transaction list from parsed result
      const rawList = parsed.transactions && parsed.transactions.length > 0
        ? parsed.transactions
        : [
            {
              id: crypto.randomUUID(),
              merchant: parsed.merchant || '',
              amount: parsed.amount || 0,
              date: parsed.date || '',
              paymentMethod: parsed.paymentMethod,
              itemsSummary: parsed.itemsSummary,
              categoryId: parsed.categoryId,
              categoryName: parsed.categoryName,
            },
          ];

      const items: ParsedCardItem[] = rawList.map((tx) => {
        const itemPaymentMethod =
          defaultCreditCardId ? 'credit_card' : tx.paymentMethod || defaultPaymentMethod || 'cash';
        const itemCreditCardId =
          itemPaymentMethod === 'credit_card'
            ? defaultCreditCardId || (creditCards[0]?.id ?? '')
            : '';

        return {
          id: tx.id || crypto.randomUUID(),
          merchant: tx.merchant || '',
          amount: tx.amount > 0 ? String(tx.amount) : '',
          date: tx.date || new Date().toISOString().split('T')[0],
          categoryId: tx.categoryId || '',
          paymentMethod: itemPaymentMethod,
          creditCardId: itemCreditCardId,
          savingsId: '',
          propertyId: defaultPropertyId || '',
          itemsSummary: tx.itemsSummary || null,
          status: 'idle',
        };
      });

      setParsedCardItems(items);

      // Also set standard single form fields with first transaction as fallback
      setKind('expense');
      if (parsed.amount > 0) {
        setAmount(String(parsed.amount));
      }
      if (parsed.date) {
        setOccurredOn(parsed.date);
      }
      if (parsed.merchant) {
        const itemNote = parsed.itemsSummary ? ` (${parsed.itemsSummary})` : '';
        setNote(`${parsed.merchant}${itemNote}`);
      }
      if (parsed.categoryId) {
        setCategoryId(parsed.categoryId);
      }

      if (items.length > 1) {
        toast.success(`Detected ${items.length} transactions from image!`);
      } else if (items.length === 1) {
        toast.success(
          `Receipt parsed: ${items[0].merchant || 'Item'} (₱${parseFloat(items[0].amount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })})`
        );
      }
    } catch (err: any) {
      console.error('Receipt parse error:', err);
      toast.error(err?.message || 'An unexpected error occurred parsing the receipt.');
    } finally {
      setIsScanningReceipt(false);
    }
  };

  const handleModalClose = () => {
    clearReceipt();
    onClose();
  };

  // Card items helpers
  const getItemMissingFields = (item: ParsedCardItem): string[] => {
    const missing: string[] = [];
    const amt = parseFloat(item.amount);
    if (isNaN(amt) || amt <= 0) missing.push('Amount');
    if (!item.merchant || !item.merchant.trim()) missing.push('Description');
    if (!item.date || !item.date.trim()) missing.push('Date');
    if (item.paymentMethod === 'credit_card' && creditCards.length > 0 && !item.creditCardId) {
      missing.push('Credit Card');
    }
    return missing;
  };

  const handleUpdateCardItem = (id: string, updates: Partial<ParsedCardItem>) => {
    setParsedCardItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates, status: 'idle', errorMessage: undefined } : item
      )
    );
  };

  const handleRemoveCardItem = (id: string) => {
    setParsedCardItems((prev) => {
      const remaining = prev.filter((item) => item.id !== id);
      if (remaining.length === 0) {
        clearReceipt();
      }
      return remaining;
    });
  };

  const handleAddCardItem = () => {
    const newItem: ParsedCardItem = {
      id: crypto.randomUUID(),
      merchant: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      categoryId: '',
      paymentMethod: defaultCreditCardId ? 'credit_card' : defaultPaymentMethod || 'cash',
      creditCardId: defaultCreditCardId || (creditCards[0]?.id ?? ''),
      savingsId: '',
      propertyId: defaultPropertyId || '',
      itemsSummary: null,
      status: 'idle',
    };
    setParsedCardItems((prev) => [...prev, newItem]);
  };

  const handleApproveSingle = async (cardItem: ParsedCardItem) => {
    const missing = getItemMissingFields(cardItem);
    if (missing.length > 0) {
      toast.error(`Please provide ${missing.join(', ')} before saving.`);
      return;
    }

    setParsedCardItems((prev) =>
      prev.map((c) =>
        c.id === cardItem.id ? { ...c, status: 'saving', errorMessage: undefined } : c
      )
    );

    const amountNum = parseFloat(cardItem.amount);
    const res = await createTransactionAction({
      kind: 'expense',
      amount: amountNum,
      categoryId: cardItem.categoryId || null,
      paymentMethod: cardItem.paymentMethod,
      creditCardId: cardItem.paymentMethod === 'credit_card' ? cardItem.creditCardId || null : null,
      savingsId: cardItem.savingsId || null,
      propertyId: cardItem.propertyId || null,
      occurredOn: cardItem.date,
      note: cardItem.merchant.trim() + (cardItem.itemsSummary ? ` (${cardItem.itemsSummary})` : ''),
    });

    if (res?.error) {
      setParsedCardItems((prev) =>
        prev.map((c) =>
          c.id === cardItem.id ? { ...c, status: 'error', errorMessage: res.error } : c
        )
      );
      toast.error(res.error);
    } else {
      toast.success(
        `Transaction saved: ${cardItem.merchant} (₱${amountNum.toLocaleString('en-US', { minimumFractionDigits: 2 })})`
      );
      setParsedCardItems((prev) => {
        const remaining = prev.filter((c) => c.id !== cardItem.id);
        if (remaining.length === 0) {
          handleModalClose();
        }
        return remaining;
      });
    }
  };

  const handleApproveAllReady = async () => {
    const readyItems = parsedCardItems.filter(
      (c) => getItemMissingFields(c).length === 0 && c.status !== 'saving' && c.status !== 'saved'
    );

    if (readyItems.length === 0) {
      toast.error('No complete transactions ready to save. Please fill in the missing fields.');
      return;
    }

    setIsBatchSaving(true);
    const readyIds = new Set(readyItems.map((c) => c.id));
    setParsedCardItems((prev) =>
      prev.map((c) =>
        readyIds.has(c.id) ? { ...c, status: 'saving', errorMessage: undefined } : c
      )
    );

    const payload = readyItems.map((item) => ({
      kind: 'expense' as const,
      amount: parseFloat(item.amount),
      categoryId: item.categoryId || null,
      paymentMethod: item.paymentMethod,
      creditCardId: item.paymentMethod === 'credit_card' ? item.creditCardId || null : null,
      savingsId: item.savingsId || null,
      propertyId: item.propertyId || null,
      occurredOn: item.date,
      note: item.merchant.trim() + (item.itemsSummary ? ` (${item.itemsSummary})` : ''),
    }));

    const res = await createBatchTransactionsAction(payload);
    setIsBatchSaving(false);

    if (!res.success) {
      toast.error(res.error || 'Failed to save transactions. Please review the errors on each card.');
      setParsedCardItems((prev) =>
        prev.map((c) =>
          readyIds.has(c.id) ? { ...c, status: 'error', errorMessage: res.error } : c
        )
      );
    } else {
      toast.success(`Successfully saved ${res.savedCount} transaction${res.savedCount > 1 ? 's' : ''}!`);
      setParsedCardItems((prev) => {
        const remaining = prev.filter((c) => !readyIds.has(c.id));
        if (remaining.length === 0) {
          handleModalClose();
        }
        return remaining;
      });
    }
  };

  // Metrics for parsed cards
  const readyCount = useMemo(() => {
    return parsedCardItems.filter((c) => getItemMissingFields(c).length === 0).length;
  }, [parsedCardItems, creditCards]);

  const totalReadyAmount = useMemo(() => {
    return parsedCardItems
      .filter((c) => getItemMissingFields(c).length === 0)
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  }, [parsedCardItems, creditCards]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    if (kind === 'transfer') {
      if (!savingsId || !transferToSavingsId) {
        toast.error('Please select both a source and destination account.');
        return;
      }
      if (savingsId === transferToSavingsId) {
        toast.error('Source and destination accounts must be different.');
        return;
      }
    }

    setIsSubmitting(true);
    const res = await createTransactionAction({
      kind,
      amount: parseFloat(amount),
      categoryId: kind !== 'transfer' ? categoryId || null : null,
      paymentMethod: kind === 'transfer' ? 'bank_transfer' : paymentMethod,
      creditCardId: paymentMethod === 'credit_card' && kind !== 'transfer' ? creditCardId || null : null,
      savingsId: savingsId || null,
      transferToSavingsId: kind === 'transfer' ? transferToSavingsId || null : null,
      propertyId: kind !== 'transfer' ? propertyId || null : null,
      occurredOn,
      note: note.trim() || null,
    });

    setIsSubmitting(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(
        kind === 'transfer'
          ? 'Transfer recorded successfully!'
          : kind === 'expense'
          ? 'Recorded Money Out!'
          : 'Recorded Money In!'
      );
      // Reset & close
      setAmount('');
      setNote('');
      setSavingsId('');
      setTransferToSavingsId('');
      clearReceipt();
      onClose();
    }
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
      <ResponsiveDialogContent className="max-w-xl sm:max-w-2xl max-h-[92dvh] flex flex-col">
        <ResponsiveDialogHeader className="pr-10 sm:pr-12">
          <ResponsiveDialogTitle>
            {parsedCardItems.length > 0 ? 'Review parsed transactions' : 'Record transaction'}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {parsedCardItems.length > 0
              ? 'Review each parsed transaction below. Complete any missing information, then approve to save.'
              : 'Log cash flow, card spending, or scan receipts with Tenvi AI Vision.'}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-4 overflow-y-auto max-h-[75vh] p-1 sm:p-2">
          {/* Hidden Camera & File Inputs for Receipt Scanning */}
          <input
            ref={receiptCameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleReceiptFileChange}
            className="hidden"
          />
          <input
            ref={receiptFileRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleReceiptFileChange}
            className="hidden"
          />

          {/* Receipt Quick Scan Actions */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => receiptCameraRef.current?.click()}
                disabled={isScanningReceipt}
                className="flex-1 py-2.5 px-3.5 rounded-2xl bg-muted/60 hover:bg-muted text-foreground text-xs font-bold flex items-center justify-center gap-2 transition-colors duration-(--motion-fast) ease-(--ease-in-out) cursor-pointer shadow-xs disabled:opacity-60"
              >
                <Camera className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Snap receipt photo</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => receiptFileRef.current?.click()}
                disabled={isScanningReceipt}
                className="py-2.5 px-3.5 rounded-2xl bg-muted/60 hover:bg-muted text-foreground text-xs font-bold flex items-center justify-center gap-1.5 transition-colors duration-(--motion-fast) ease-(--ease-in-out) cursor-pointer shadow-xs disabled:opacity-60"
                title="Upload receipt or statement image from files"
                aria-label="Upload receipt image"
              >
                <UploadCloud className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="hidden sm:inline">Upload image</span>
              </Button>
            </div>

            {/* Scanning In-Progress Feedback */}
            {isScanningReceipt && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 flex items-center gap-3 animate-in fade-in duration-150 shadow-xs">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
                <div className="text-xs">
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Analyzing image with Tenvi AI Vision...
                  </p>
                  <p className="text-indigo-700 dark:text-indigo-300 text-xs mt-0.5">
                    Extracting transactions, amounts, dates, and auto-matching categories
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* MODE A: Multi-Transaction Cards Review Interface */}
          {parsedCardItems.length > 0 ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Review Header Banner */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {receiptPreviewUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={receiptPreviewUrl}
                      alt="Uploaded preview"
                      className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-xs"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                      <h4 className="font-bold text-sm text-foreground">
                        {parsedCardItems.length} Transaction{parsedCardItems.length > 1 ? 's' : ''} Detected
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {readyCount} of {parsedCardItems.length} ready to save
                      {readyCount > 0 && (
                        <span className="font-semibold text-foreground ml-1">
                          (Total: ₱{totalReadyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearReceipt}
                    className="h-9 px-3 text-xs bg-muted/60 hover:bg-muted font-medium cursor-pointer"
                  >
                    Manual Form
                  </Button>
                  <Button
                    type="button"
                    disabled={readyCount === 0 || isBatchSaving}
                    onClick={handleApproveAllReady}
                    className="h-9 px-4 text-xs font-bold shadow-xs cursor-pointer"
                  >
                    {isBatchSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Saving All...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                        Approve All Ready ({readyCount})
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Transaction Cards List */}
              <div className="space-y-3.5 max-h-[52vh] overflow-y-auto pr-1">
                {parsedCardItems.map((item, index) => {
                  const missingFields = getItemMissingFields(item);
                  const isReady = missingFields.length === 0;

                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 rounded-2xl bg-card shadow-xs space-y-3.5"
                    >
                      {/* Card Top Row: Counter, Badge & Action Buttons */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-extrabold text-muted-foreground px-2 py-0.5 rounded-lg bg-muted shrink-0">
                            #{index + 1}
                          </span>

                          {isReady ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Ready to Save
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center gap-1.5 shrink-0">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Needs: {missingFields.join(', ')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            disabled={!isReady || item.status === 'saving'}
                            onClick={() => handleApproveSingle(item)}
                            className="h-8 px-3 text-xs font-bold shadow-xs cursor-pointer"
                          >
                            {item.status === 'saving' ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Check className="w-3 h-3 mr-1" />
                                Approve & Save
                              </>
                            )}
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveCardItem(item.id)}
                            disabled={item.status === 'saving'}
                            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                            title="Dismiss transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Error Banner if Save Failed */}
                      {item.errorMessage && (
                        <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-medium flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.errorMessage}</span>
                        </div>
                      )}

                      {/* Editable Inputs: Description & Amount */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 items-end gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-label text-muted-foreground mb-1">
                            Description / Merchant <span className="text-rose-500">*</span>
                          </label>
                          <Input
                            type="text"
                            placeholder="e.g. Jollibee, Grab, Shell"
                            value={item.merchant}
                            onChange={(e) => handleUpdateCardItem(item.id, { merchant: e.target.value })}
                            className="h-10 text-sm bg-muted/40 rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-label text-muted-foreground mb-1">
                            Amount (PHP) <span className="text-rose-500">*</span>
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={item.amount}
                            onChange={(e) => handleUpdateCardItem(item.id, { amount: e.target.value })}
                            className="h-10 text-sm font-bold bg-muted/40 rounded-xl"
                          />
                        </div>
                      </div>

                      {/* Editable Inputs: Date & Category */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-label text-muted-foreground mb-1">
                            Date <span className="text-rose-500">*</span>
                          </label>
                          <Input
                            type="date"
                            value={item.date}
                            onChange={(e) => handleUpdateCardItem(item.id, { date: e.target.value })}
                            className="h-10 text-sm bg-muted/40 rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-label text-muted-foreground mb-1">
                            Category
                          </label>
                          <select
                            value={item.categoryId}
                            onChange={(e) => handleUpdateCardItem(item.id, { categoryId: e.target.value })}
                            className="h-12 sm:h-10 w-full rounded-xl bg-muted/40 px-3 text-foreground text-sm outline-none transition-[background-color,box-shadow] duration-(--motion-fast) ease-(--ease-in-out) focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="">-- Uncategorized Expense --</option>
                            {expenseCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Editable Inputs: Payment Method & Credit Card */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-label text-muted-foreground mb-1">
                            Payment Method
                          </label>
                          <select
                            value={item.paymentMethod}
                            onChange={(e) => {
                              const newPm = e.target.value;
                              handleUpdateCardItem(item.id, {
                                paymentMethod: newPm,
                                creditCardId:
                                  newPm === 'credit_card'
                                    ? item.creditCardId || defaultCreditCardId || (creditCards[0]?.id ?? '')
                                    : '',
                              });
                            }}
                            className="h-12 sm:h-10 w-full rounded-xl bg-muted/40 px-3 text-foreground text-sm outline-none transition-[background-color,box-shadow] duration-(--motion-fast) ease-(--ease-in-out) focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {PAYMENT_METHODS.map((pm) => (
                              <option key={pm.id} value={pm.id}>
                                {pm.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {item.paymentMethod === 'credit_card' && (
                          <div>
                            <label className="block text-label text-indigo-900 dark:text-indigo-300 mb-1">
                              Credit Card <span className="text-rose-500">*</span>
                            </label>
                            {creditCards.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-2.5">
                                No cards found
                              </p>
                            ) : (
                              <select
                                value={item.creditCardId}
                                onChange={(e) => handleUpdateCardItem(item.id, { creditCardId: e.target.value })}
                                className="h-12 sm:h-10 w-full rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 px-3 text-foreground text-sm outline-none transition-[background-color,box-shadow] duration-(--motion-fast) ease-(--ease-in-out) focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <option value="">-- Choose card --</option>
                                {creditCards.map((card) => (
                                  <option key={card.id} value={card.id}>
                                    {card.bank_name} - {card.name} (•••• {card.last_4})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddCardItem}
                  className="w-full sm:w-auto h-11 px-4 text-xs font-semibold bg-muted/60 hover:bg-muted cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Transaction
                </Button>

                <div className="flex-1" />

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleModalClose}
                  className="w-full sm:w-auto h-11 px-4 text-xs bg-muted/60 hover:bg-muted cursor-pointer"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  disabled={readyCount === 0 || isBatchSaving}
                  onClick={handleApproveAllReady}
                  className="w-full sm:w-auto h-11 px-5 text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isBatchSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      Saving Transactions...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Approve & Save All Ready ({readyCount})
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* MODE B: Standard Manual Entry Form */
            <>
              {/* Kind Switcher: Money Out (Expense), Money In (Income), Transfer */}
              <Tabs
                value={kind}
                onValueChange={(val) => {
                  setKind(val as any);
                  setCategoryId('');
                }}
                className="w-full mb-2"
              >
                <TabsList className="w-full grid grid-cols-3 gap-1 p-1 bg-muted">
                  <TabsTrigger
                    value="expense"
                    className="py-2.5 data-active:text-rose-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MinusCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Expense</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="income"
                    className="py-2.5 data-active:text-emerald-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Income</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="transfer"
                    className="py-2.5 data-active:text-blue-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeftRight className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Transfer</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Amount (PHP)
                  </label>
                  <MoneyInput
                    required
                    autoFocus
                    placeholder="0.00"
                    value={amount}
                    onChange={(val) => setAmount(val)}
                    className="text-2xl font-extrabold h-14"
                  />
                </div>

                {kind === 'transfer' ? (
                  <div className="space-y-4 p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 shadow-xs animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 text-sm font-semibold">
                      <ArrowLeftRight className="w-4 h-4 text-blue-600 shrink-0" />
                      Inter-Account Vault Transfer
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1.5">
                          From Account (Source)
                        </label>
                        <select
                          required
                          value={savingsId}
                          onChange={(e) => setSavingsId(e.target.value)}
                          className="h-12 sm:h-10 w-full rounded-xl bg-card px-3 text-foreground text-sm outline-none transition-[background-color,box-shadow] duration-(--motion-fast) ease-(--ease-in-out) focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="">-- Choose source vault --</option>
                          {savingsAccounts.map((acc) => (
                            <option key={acc.id} value={acc.id} disabled={acc.id === transferToSavingsId}>
                              {acc.name} ({acc.institution_name} • ₱{Number(acc.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1.5">
                          To Account (Destination)
                        </label>
                        <select
                          required
                          value={transferToSavingsId}
                          onChange={(e) => setTransferToSavingsId(e.target.value)}
                          className="h-12 sm:h-10 w-full rounded-xl bg-card px-3 text-foreground text-sm outline-none transition-[background-color,box-shadow] duration-(--motion-fast) ease-(--ease-in-out) focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="">-- Choose destination vault --</option>
                          {savingsAccounts.map((acc) => (
                            <option key={acc.id} value={acc.id} disabled={acc.id === savingsId}>
                              {acc.name} ({acc.institution_name} • ₱{Number(acc.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
                      Transfers move money between your vaults without inflating monthly expenses or gross income totals.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Category Picker */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Category
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1">
                        {filteredCategories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategoryId(cat.id)}
                            aria-pressed={categoryId === cat.id}
                            className={`p-2.5 rounded-xl text-xs font-medium text-left truncate transition-colors duration-(--motion-fast) ease-(--ease-in-out) cursor-pointer ${
                              categoryId === cat.id
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                            }`}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        {PAYMENT_METHODS.map((pm) => (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setPaymentMethod(pm.id)}
                            aria-pressed={paymentMethod === pm.id}
                            className={`py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-xs font-semibold transition-colors duration-(--motion-fast) ease-(--ease-in-out) cursor-pointer text-center truncate ${
                              paymentMethod === pm.id
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                            }`}
                          >
                            {pm.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Linked Credit Card Dropdown if Credit Card chosen */}
                    {paymentMethod === 'credit_card' && (
                      <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 shadow-xs animate-in fade-in duration-150">
                        <label className="block text-xs font-semibold text-indigo-900 dark:text-indigo-200 mb-2 flex items-center gap-1.5">
                          <CreditCardIcon className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                          Select Credit Card
                        </label>
                        {creditCards.length === 0 ? (
                          <p className="text-xs text-indigo-700 dark:text-indigo-300">
                            No credit cards added yet. You can add one in the Cards module.
                          </p>
                        ) : (
                          <select
                            value={creditCardId}
                            onChange={(e) => setCreditCardId(e.target.value)}
                            className="h-12 sm:h-10 w-full rounded-xl bg-card px-3 text-foreground text-sm outline-none transition-[background-color,box-shadow] duration-(--motion-fast) ease-(--ease-in-out) focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="">-- Choose card --</option>
                            {creditCards.map((card) => (
                              <option key={card.id} value={card.id}>
                                {card.bank_name} - {card.name} (•••• {card.last_4})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {/* Linked Savings Account / Vault if applicable */}
                    {savingsAccounts.length > 0 && paymentMethod !== 'credit_card' && (
                      <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 shadow-xs animate-in fade-in duration-150">
                        <label className="block text-xs font-semibold text-emerald-950 dark:text-emerald-200 mb-2 flex items-center gap-1.5">
                          <PiggyBank className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                          Connect to Savings / Vault Account (Optional)
                        </label>
                        <select
                          value={savingsId}
                          onChange={(e) => setSavingsId(e.target.value)}
                          className="h-12 sm:h-10 w-full rounded-xl bg-card px-3 text-foreground text-sm outline-none transition-[background-color,box-shadow] duration-(--motion-fast) ease-(--ease-in-out) focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="">-- None (General Cash Flow) --</option>
                          {savingsAccounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({acc.institution_name} • ₱
                              {Number(acc.current_balance).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                              })})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-1.5">
                          {kind === 'income'
                            ? 'Deposit will be automatically added to this vault balance.'
                            : 'Expense will be automatically deducted from this vault balance.'}
                        </p>
                      </div>
                    )}

                    {/* Linked Property / Asset (Optional) */}
                    {properties.length > 0 && (
                      <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 shadow-xs animate-in fade-in duration-150">
                        <label className="block text-xs font-semibold text-amber-950 dark:text-amber-200 mb-2 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                          Connect to Property / Vehicle (Optional)
                        </label>
                        <select
                          value={propertyId}
                          onChange={(e) => setPropertyId(e.target.value)}
                          className="h-12 sm:h-10 w-full rounded-xl bg-card px-3 text-foreground text-sm outline-none transition-[background-color,box-shadow] duration-(--motion-fast) ease-(--ease-in-out) focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="">-- None (Personal / General) --</option>
                          {properties.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.identifier ? `(${p.identifier})` : ''} • {p.property_type}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1.5">
                          {kind === 'income'
                            ? 'Earnings will be attributed to this property/vehicle revenue.'
                            : 'Costs will be attributed to this property/vehicle expenses.'}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Date & Note */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Date
                    </label>
                    <Input
                      type="date"
                      required
                      value={occurredOn}
                      onChange={(e) => setOccurredOn(e.target.value)}
                      className="w-full text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Note (Optional)
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Lunch with team"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full text-sm"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleModalClose}
                    className="flex-1 py-3 h-11 text-sm bg-muted/60 hover:bg-muted"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 h-11 text-sm shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Transaction'
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
