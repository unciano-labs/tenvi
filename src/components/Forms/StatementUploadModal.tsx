'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Plus,
  ArrowRight,
  Receipt,
  CreditCard as CreditCardIcon,
  Filter,
  CheckSquare,
  Square,
  Key,
} from 'lucide-react';
import { toast } from 'sonner';
import { CreditCard, Category } from '@/types';
import {
  parseStatementFileAction,
  importStatementTransactionsAction,
} from '@/app/actions/statements';
import {
  ParsedStatementTransaction,
  StatementParseResult,
} from '@/lib/ai/statementParser';
import { formatMoney } from '@/lib/finance/calculations';
import { useRouter } from 'next/navigation';

interface StatementUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CreditCard;
  categories: Category[];
}

export function StatementUploadModal({
  isOpen,
  onClose,
  card,
  categories,
}: StatementUploadModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload & parse states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [inputTab, setInputTab] = useState<'file' | 'paste'>('file');
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStep, setParsingStep] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Staged review states
  const [parseResult, setParseResult] = useState<StatementParseResult | null>(null);
  const [stagedTransactions, setStagedTransactions] = useState<
    (ParsedStatementTransaction & { selected: boolean })[]
  >([]);
  const [filterTab, setFilterTab] = useState<'all' | 'purchases' | 'credits' | 'duplicates'>('purchases');
  const [isImporting, setIsImporting] = useState(false);
  const [geminiStats, setGeminiStats] = useState<any>(null);

  // Fetch real-time Gemini usage stats when modal opens
  React.useEffect(() => {
    if (isOpen) {
      import('@/app/actions/gemini').then(({ getGeminiUsageStatsAction }) => {
        getGeminiUsageStatsAction().then((res) => {
          if (res.stats) setGeminiStats(res.stats);
        });
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleStartParsing = async () => {
    if (inputTab === 'file' && !selectedFile) {
      toast.error('Please choose a statement PDF or image to upload.');
      return;
    }
    if (inputTab === 'paste' && !pastedText.trim()) {
      toast.error('Please paste your statement text.');
      return;
    }

    setIsParsing(true);
    setParsingStep(
      inputTab === 'paste'
        ? 'Parsing statement lines...'
        : selectedFile?.name.endsWith('.pdf')
        ? 'Extracting text from PDF statement...'
        : 'Analyzing statement image with Tenvi AI Vision...'
    );

    try {
      const formData = new FormData();
      if (inputTab === 'file' && selectedFile) {
        formData.append('file', selectedFile);
      } else {
        formData.append('pastedText', pastedText);
      }

      const res = await parseStatementFileAction(formData, card.id, geminiApiKey.trim() || undefined);

      if (res.error || !res.result) {
        toast.error(res.error || 'Failed to parse statement.');
        return;
      }

      if (res.result.transactions.length === 0) {
        toast.error(
          'No transactions could be detected in this file. Try pasting the text directly or uploading a clearer file.'
        );
        return;
      }

      setParseResult(res.result);
      // Purchases selected by default, UNLESS flagged as duplicate; payments unselected by default
      setStagedTransactions(
        res.result.transactions.map((tx) => ({
          ...tx,
          selected: !tx.isDuplicate && !tx.isPayment,
        }))
      );
      if (res.result.duplicateCount && res.result.duplicateCount > 0) {
        toast.success(
          `Parsed ${res.result.transactions.length} items (${res.result.duplicateCount} duplicate(s) flagged & unselected)`
        );
      } else {
        toast.success(`Successfully parsed ${res.result.transactions.length} transactions!`);
      }
    } catch (err: any) {
      console.error('Error during statement parse:', err);
      toast.error(
        err?.message || 'An unexpected error occurred while parsing the statement. Please try again.'
      );
    } finally {
      setIsParsing(false);
    }
  };

  // Staged item updates
  const handleToggleSelect = (id: string) => {
    setStagedTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setStagedTransactions((prev) =>
      prev.map((t) => {
        if (filterTab === 'purchases' && t.isPayment) return t;
        if (filterTab === 'credits' && !t.isPayment) return t;
        if (filterTab === 'duplicates' && !t.isDuplicate) return t;
        return { ...t, selected: select };
      })
    );
  };

  const handleUpdateItem = (
    id: string,
    field: keyof ParsedStatementTransaction,
    value: any
  ) => {
    setStagedTransactions((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (field === 'categoryId') {
          const matchedCat = categories.find((c) => c.id === value);
          return {
            ...t,
            categoryId: value || null,
            categoryName: matchedCat ? matchedCat.name : null,
          };
        }
        return { ...t, [field]: value };
      })
    );
  };

  const handleDeleteItem = (id: string) => {
    setStagedTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddManualItem = () => {
    const defaultCat = categories.find((c) => c.kind === 'expense');
    const newItem: ParsedStatementTransaction & { selected: boolean } = {
      id: `manual-tx-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      rawDate: 'Manual',
      description: 'Card Purchase',
      amount: 0,
      isPayment: false,
      categoryId: defaultCat?.id || null,
      categoryName: defaultCat?.name || null,
      confidence: 1,
      selected: true,
    };
    setStagedTransactions((prev) => [newItem, ...prev]);
  };

  // Import confirmed transactions
  const handleImport = async () => {
    const selected = stagedTransactions.filter((t) => t.selected && t.amount > 0);
    if (selected.length === 0) {
      toast.error('Please select at least one transaction to import.');
      return;
    }

    setIsImporting(true);
    const res = await importStatementTransactionsAction(
      card.id,
      selected.map((t) => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        isPayment: t.isPayment,
        categoryId: t.categoryId,
      }))
    );
    setIsImporting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(
        `Successfully logged ${res.importedCount} transactions to ${card.bank_name} ${card.name}!`
      );
      router.refresh();
      onClose();
    }
  };

  const resetAll = () => {
    setSelectedFile(null);
    setPastedText('');
    setParseResult(null);
    setStagedTransactions([]);
  };

  // Filtered views for review
  const visibleTransactions = stagedTransactions.filter((t) => {
    if (filterTab === 'purchases') return !t.isPayment;
    if (filterTab === 'credits') return t.isPayment;
    if (filterTab === 'duplicates') return Boolean(t.isDuplicate);
    return true;
  });

  const duplicateCount = stagedTransactions.filter((t) => t.isDuplicate).length;
  const selectedCount = stagedTransactions.filter((t) => t.selected).length;
  const selectedTotal = stagedTransactions
    .filter((t) => t.selected)
    .reduce((sum, t) => sum + (t.isPayment ? -t.amount : t.amount), 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-3xl p-6 sm:p-8 shadow-xl my-6 space-y-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight text-slate-900">
                  Upload Card Statement
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700">
                  {card.bank_name} •••• {card.last_4}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically extract swipe transactions, dates, merchants, and amounts from PDF or image bills.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: STEP 1 (Upload) or STEP 2 (Review) */}
        {!parseResult ? (
          <div className="space-y-5 overflow-y-auto pr-1">
            {/* Gemini AI Live Status & Quota Bar */}
            {geminiStats?.hasKeyConfigured ? (
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-950">Tenvi AI Vision Active</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 uppercase">
                        Tenvi Vision
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-700">
                      Key configured ({geminiStats.maskedKey}) • Free Tier Limit: 1,500 requests/day
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-right">
                    <div className="font-extrabold text-indigo-950">
                      {geminiStats.dailyRequestsUsed} / {geminiStats.dailyRequestsLimit}
                      <span className="font-normal text-slate-500 text-[11px] ml-1">used today</span>
                    </div>
                    <span className="text-[10px] text-indigo-600 font-semibold block">
                      {geminiStats.dailyRemainingRequests} requests remaining
                    </span>
                  </div>
                  <div className="w-16 h-2 rounded-full bg-indigo-200 overflow-hidden shrink-0">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${Math.max(4, geminiStats.dailyPercentUsed)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-[#F6F7F9] flex items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-slate-400" />
                  <span>Using built-in local PDF & OCR parser (100% free & offline).</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">Offline Parser</span>
              </div>
            )}

            {/* Tab switch: File upload vs Paste text */}
            <div className="flex p-1.5 rounded-2xl bg-[#F6F7F9] max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setInputTab('file')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  inputTab === 'file'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-indigo-600" />
                Upload PDF / Image File
              </button>
              <button
                type="button"
                onClick={() => setInputTab('paste')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  inputTab === 'paste'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-4 h-4 text-indigo-600" />
                Paste Statement Text
              </button>
            </div>

            {inputTab === 'file' ? (
              /* Drag & Drop Zone */
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 sm:p-12 rounded-3xl bg-[#F6F7F9] hover:bg-indigo-50/40 transition-colors text-center cursor-pointer flex flex-col items-center justify-center gap-3 ${
                  selectedFile ? 'ring-2 ring-indigo-600' : ''
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-white shadow-xs text-indigo-600 flex items-center justify-center">
                  {selectedFile ? (
                    selectedFile.name.endsWith('.pdf') ? (
                      <FileText className="w-7 h-7" />
                    ) : (
                      <ImageIcon className="w-7 h-7" />
                    )
                  ) : (
                    <UploadCloud className="w-7 h-7" />
                  )}
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedFile ? selectedFile.name : 'Click to upload or drag & drop'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports electronic PDF statements, e-bill screenshots, or photos (PDF, PNG, JPG, WEBP).
                  </p>
                </div>

                {selectedFile && (
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready to parse
                  </span>
                )}
              </div>
            ) : (
              /* Paste Statement Text */
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Paste raw transaction lines or statement text:</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    From online banking / email bill
                  </span>
                </label>
                <textarea
                  rows={8}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Example:\n08/15/2026 GRAB* TRIP MANILA PH 450.00\n08/18/2026 SHOPEE PHILIPPINES 1,250.00\n08/20/2026 PAYMENT - THANK YOU 15,000.00 CR\n08/22/2026 SHELL EDSA MAKATI 2,100.00`}
                  className="w-full p-4 rounded-2xl bg-[#F6F7F9] font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed"
                />
              </div>
            )}

            {/* Optional Gemini Key Accordion */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {showApiKeyInput
                  ? 'Hide Custom AI Vision Key'
                  : 'Optional: Use Custom AI Vision Key for complex or scanned PDFs'}
              </button>

              {showApiKeyInput && (
                <div className="mt-2.5 p-4 rounded-2xl bg-indigo-50/50 space-y-2 text-xs">
                  <label className="font-bold text-indigo-950 block">AI Vision API Key</label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white text-xs text-slate-900 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500">
                    If left blank, Tenvi uses its built-in local PDF and OCR parser with 100% privacy and zero API costs.
                  </p>
                </div>
              )}
            </div>

            {/* Parse Action Button */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isParsing}
                className="px-5 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartParsing}
                disabled={isParsing || (inputTab === 'file' && !selectedFile) || (inputTab === 'paste' && !pastedText.trim())}
                className="bili-btn-primary py-2.5 px-6 text-xs font-semibold shadow-sm flex items-center gap-2"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{parsingStep}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Parse Statement Transactions
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* STEP 2: STAGED TRANSACTION REVIEW & CUSTOMIZATION */
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            {/* Top Summary Bar */}
            <div className="p-4 rounded-2xl bg-[#F6F7F9] flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {stagedTransactions.length} Transactions Detected
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-500">
                      Source: {parseResult.source.replace('_', ' ').toUpperCase()} • Review and adjust categories or uncheck items before importing.
                    </span>
                    {duplicateCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                        {duplicateCount} duplicate{duplicateCount > 1 ? 's' : ''} detected & unchecked
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Selected To Log
                  </span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {selectedCount} swipes ({formatMoney(selectedTotal)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-colors shadow-xs"
                >
                  Upload Another
                </button>
              </div>
            </div>

            {/* Filter Tabs & Bulk Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F6F7F9] flex-wrap">
                <button
                  type="button"
                  onClick={() => setFilterTab('purchases')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterTab === 'purchases'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Purchases ({stagedTransactions.filter((t) => !t.isPayment).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('credits')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterTab === 'credits'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Payments / Credits ({stagedTransactions.filter((t) => t.isPayment).length})
                </button>
                {duplicateCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterTab('duplicates')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      filterTab === 'duplicates'
                        ? 'bg-white text-amber-800 shadow-xs'
                        : 'text-amber-700 hover:text-amber-900'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Duplicates ({duplicateCount})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterTab === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({stagedTransactions.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Deselect All
                </button>
                <button
                  type="button"
                  onClick={handleAddManualItem}
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-900 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
              </div>
            </div>

            {/* Staged Items Table / List */}
            <div className="flex-1 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100">
              {visibleTransactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No transactions match the selected filter.
                </div>
              ) : (
                visibleTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={`p-3 sm:px-4 flex flex-col gap-2 text-xs transition-colors ${
                      tx.isDuplicate
                        ? 'bg-amber-50/20'
                        : tx.selected
                        ? 'bg-white hover:bg-slate-50/60'
                        : 'bg-slate-50/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(tx.id)}
                        className="text-slate-400 hover:text-indigo-600 shrink-0 cursor-pointer"
                      >
                        {tx.selected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      {/* Date */}
                      <input
                        type="date"
                        value={tx.date}
                        onChange={(e) => handleUpdateItem(tx.id, 'date', e.target.value)}
                        className="px-2 py-1 rounded-lg bg-[#F6F7F9] font-medium text-slate-800 w-32 shrink-0 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />

                      {/* Description / Merchant */}
                      <input
                        type="text"
                        value={tx.description}
                        onChange={(e) => handleUpdateItem(tx.id, 'description', e.target.value)}
                        placeholder="Merchant name"
                        className="flex-1 px-3 py-1 rounded-lg bg-[#F6F7F9] font-semibold text-slate-900 min-w-[140px] focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />

                      {/* Category Selector */}
                      <select
                        value={tx.categoryId || ''}
                        onChange={(e) => handleUpdateItem(tx.id, 'categoryId', e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-[#F6F7F9] text-slate-700 w-36 shrink-0 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="">(No category)</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>

                      {/* Amount */}
                      <div className="relative w-28 shrink-0">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                          ₱
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={tx.amount}
                          onChange={(e) =>
                            handleUpdateItem(tx.id, 'amount', parseFloat(e.target.value) || 0)
                          }
                          className={`w-full pl-6 pr-2 py-1 rounded-lg bg-[#F6F7F9] font-bold text-right focus:outline-none focus:ring-1 focus:ring-slate-900 ${
                            tx.isPayment ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        />
                      </div>

                      {/* Duplicate Badge */}
                      {tx.isDuplicate && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 ${
                            tx.duplicateType === 'loan_installment'
                              ? 'bg-purple-50 text-purple-800'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                          title={tx.duplicateReason}
                        >
                          {tx.duplicateType === 'loan_installment' ? (
                            <>
                              <AlertCircle className="w-3 h-3 text-purple-600" />
                              Installment Match
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Duplicate
                            </>
                          )}
                        </span>
                      )}

                      {/* Payment vs Swipe Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                          tx.isPayment
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {tx.isPayment ? 'Payment' : 'Swipe'}
                      </span>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(tx.id)}
                        className="p-1 rounded-lg text-slate-300 hover:text-rose-600 transition-colors shrink-0"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Duplicate Reason Subtext */}
                    {tx.isDuplicate && tx.duplicateReason && (
                      <div className="flex items-center gap-1.5 pl-7 text-[11px] font-medium text-amber-800/90 bg-amber-50/70 p-1.5 rounded-xl">
                        <span className="font-bold">⚠️ Flagged:</span>
                        <span className="truncate">{tx.duplicateReason}</span>
                        <span className="text-[10px] text-slate-400 ml-auto shrink-0 font-normal">
                          (Unchecked by default to prevent double counting)
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
              <span className="text-xs text-slate-500">
                {selectedCount} of {stagedTransactions.length} items will be imported as swipes on{' '}
                <span className="font-bold text-slate-900">{card.name}</span>.
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isImporting}
                  className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isImporting || selectedCount === 0}
                  className="bili-btn-primary py-2.5 px-6 text-xs font-bold shadow-sm flex items-center gap-2"
                >
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Import {selectedCount} Transactions ({formatMoney(selectedTotal)})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
