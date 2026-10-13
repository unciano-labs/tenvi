'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Plus,
  Receipt,
  Camera,
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
import { optimizeImageForUpload } from '@/lib/ai/imageOptimizer';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
} from '@/components/ui/responsive-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

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
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Upload & parse states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

  // Clean up object URL when previewUrl changes or component unmounts
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
      const file = e.target.files[0];
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
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
        const optimizedFile = await optimizeImageForUpload(selectedFile);
        formData.append('file', optimizedFile);
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
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent className="max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <ResponsiveDialogTitle>Upload Card Statement</ResponsiveDialogTitle>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 font-bold">
                  {card.bank_name} •••• {card.last_4}
                </Badge>
              </div>
              <ResponsiveDialogDescription>
                Automatically extract swipe transactions, dates, merchants, and amounts from PDF or image bills.
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-5 overflow-y-auto pr-1">
          {/* Modal Body: STEP 1 (Upload) or STEP 2 (Review) */}
          {!parseResult ? (
            <div className="space-y-5">
              {/* Gemini AI Live Status & Quota Bar */}
              {geminiStats?.hasKeyConfigured ? (
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">Tenvi AI Vision Active</span>
                        <Badge variant="secondary" className="uppercase text-[10px]">
                          Tenvi Vision
                        </Badge>
                      </div>
                      <p className="text-xs text-indigo-500">
                        Key configured ({geminiStats.maskedKey}) • Free Tier Limit: 1,500 requests/day
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <div className="font-extrabold text-foreground">
                        {geminiStats.dailyRequestsUsed} / {geminiStats.dailyRequestsLimit}
                        <span className="font-normal text-muted-foreground text-xs ml-1">used today</span>
                      </div>
                      <span className="text-xs text-indigo-500 font-semibold block">
                        {geminiStats.dailyRemainingRequests} requests remaining
                      </span>
                    </div>
                    <div className="w-16">
                      <Progress value={Math.max(4, geminiStats.dailyPercentUsed)} className="h-2" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-muted/60 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-muted-foreground" />
                    <span>Using built-in local PDF & OCR parser (100% free & offline).</span>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">Offline Parser</span>
                </div>
              )}

              {/* Tabs for Upload vs Paste */}
              <Tabs value={inputTab} onValueChange={(val) => setInputTab(val as 'file' | 'paste')} className="w-full">
                <TabsList className="w-full max-w-md mx-auto grid grid-cols-2 bg-muted/60">
                  <TabsTrigger value="file" className="gap-1.5 font-bold text-xs">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Upload PDF / Image File
                  </TabsTrigger>
                  <TabsTrigger value="paste" className="gap-1.5 font-bold text-xs">
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    Paste Statement Text
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="file" className="space-y-3 mt-4">
                  {/* Hidden camera & file inputs */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp,image/heic"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Mobile / Quick Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => cameraInputRef.current?.click()}
                      className="rounded-2xl gap-2 font-bold text-xs shadow-xs"
                    >
                      <Camera className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Take Photo of SOA / Bill</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-2xl gap-2 font-bold text-xs shadow-xs"
                    >
                      <UploadCloud className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span>Upload PDF or Image File</span>
                    </Button>
                  </div>

                  {/* Selected File / Photo Preview or Drag-and-Drop Area */}
                  {selectedFile ? (
                    <div className="p-4 sm:p-5 rounded-3xl bg-muted/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
                        {previewUrl ? (
                          <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-900/5 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={previewUrl}
                              alt="Statement Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-card shadow-xs text-indigo-600 flex items-center justify-center shrink-0">
                            <FileText className="w-7 h-7" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {(selectedFile.size / 1024).toFixed(1)} KB •{' '}
                            {selectedFile.type.startsWith('image/')
                              ? 'Camera / Image Scan'
                              : 'PDF Document'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => cameraInputRef.current?.click()}
                          className="rounded-xl gap-1.5"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Retake</span>
                        </Button>
                        <Button
                          type="button"
                          variant="destructive-soft"
                          size="sm"
                          onClick={handleRemoveFile}
                          className="rounded-xl gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="p-8 sm:p-10 rounded-3xl bg-muted/60 hover:bg-muted transition-colors text-center cursor-pointer flex flex-col items-center justify-center gap-2.5"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-card shadow-xs text-indigo-600 flex items-center justify-center">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          Drop statement file here or tap above
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Electronic PDF statements, e-bill screenshots, or paper camera photos (PDF, PNG, JPG, WEBP).
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="paste" className="space-y-2 mt-4">
                  <label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Paste raw transaction lines or statement text:</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      From online banking / email bill
                    </span>
                  </label>
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={`Example:\n08/15/2026 GRAB* TRIP MANILA PH 450.00\n08/18/2026 SHOPEE PHILIPPINES 1,250.00\n08/20/2026 PAYMENT - THANK YOU 15,000.00 CR\n08/22/2026 SHELL EDSA MAKATI 2,100.00`}
                    className="w-full p-4 rounded-2xl bg-muted/60 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                  />
                </TabsContent>
              </Tabs>

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
                    <Input
                      type="password"
                      placeholder="AIzaSy..."
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      className="w-full bg-card text-xs text-foreground"
                    />
                    <p className="text-xs text-muted-foreground">
                      If left blank, Tenvi uses its built-in local PDF and OCR parser with 100% privacy and zero API costs.
                    </p>
                  </div>
                )}
              </div>

              {/* Parsing Progress Bar */}
              {isParsing && (
                <div className="p-4 rounded-2xl bg-muted/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2 text-primary">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {parsingStep}
                    </span>
                  </div>
                  <Progress value={null} className="h-1.5" />
                </div>
              )}

              {/* Parse Action Button */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={isParsing}
                  className="rounded-2xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleStartParsing}
                  disabled={isParsing || (inputTab === 'file' && !selectedFile) || (inputTab === 'paste' && !pastedText.trim())}
                  className="rounded-2xl gap-2 font-semibold shadow-sm"
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
                </Button>
              </div>
            </div>
          ) : (
            /* STEP 2: STAGED TRANSACTION REVIEW & CUSTOMIZATION */
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              {/* Top Summary Bar */}
              <div className="p-4 rounded-2xl bg-muted/60 flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      {stagedTransactions.length} Transactions Detected
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        Source: {parseResult.source.replace('_', ' ').toUpperCase()} • Review and adjust categories or uncheck items before importing.
                      </span>
                      {duplicateCount > 0 && (
                        <Badge variant="warning" className="gap-1 font-bold">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          {duplicateCount} duplicate{duplicateCount > 1 ? 's' : ''} detected & unchecked
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs uppercase font-bold text-muted-foreground block">
                      Selected To Log
                    </span>
                    <span className="text-sm font-extrabold text-foreground">
                      {selectedCount} swipes ({formatMoney(selectedTotal)})
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetAll}
                    className="rounded-xl shadow-xs"
                  >
                    Upload Another
                  </Button>
                </div>
              </div>

              {/* Filter Tabs & Bulk Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/60 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFilterTab('purchases')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      filterTab === 'purchases'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Purchases ({stagedTransactions.filter((t) => !t.isPayment).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('credits')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      filterTab === 'credits'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
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
                          ? 'bg-card text-amber-800 shadow-xs'
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
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All ({stagedTransactions.length})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => handleSelectAll(true)}
                    className="font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => handleSelectAll(false)}
                    className="font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Deselect All
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    onClick={handleAddManualItem}
                    className="gap-1 font-bold rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Row
                  </Button>
                </div>
              </div>

              {/* Staged Items Table */}
              <div className="flex-1 overflow-y-auto rounded-2xl bg-card shadow-card">
                {visibleTransactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No transactions match the selected filter.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Select</TableHead>
                        <TableHead className="w-36">Date</TableHead>
                        <TableHead>Merchant / Description</TableHead>
                        <TableHead className="w-40">Category</TableHead>
                        <TableHead className="w-32 text-right">Amount (₱)</TableHead>
                        <TableHead className="w-24">Type</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleTransactions.map((tx) => (
                        <React.Fragment key={tx.id}>
                          <TableRow
                            className={`transition-colors ${
                              tx.isDuplicate
                                ? 'bg-amber-50/20'
                                : tx.selected
                                ? 'bg-card'
                                : 'bg-muted/30 opacity-60'
                            }`}
                          >
                            {/* Checkbox */}
                            <TableCell>
                              <Checkbox
                                checked={tx.selected}
                                onCheckedChange={() => handleToggleSelect(tx.id)}
                                aria-label={`Select ${tx.description}`}
                              />
                            </TableCell>

                            {/* Date */}
                            <TableCell>
                              <Input
                                type="date"
                                value={tx.date}
                                onChange={(e) => handleUpdateItem(tx.id, 'date', e.target.value)}
                                className="h-8 text-xs bg-muted/60"
                              />
                            </TableCell>

                            {/* Description / Merchant */}
                            <TableCell>
                              <div className="space-y-1">
                                <Input
                                  type="text"
                                  value={tx.description}
                                  onChange={(e) => handleUpdateItem(tx.id, 'description', e.target.value)}
                                  placeholder="Merchant name"
                                  className="h-8 text-xs font-semibold bg-muted/60"
                                />
                                {tx.isDuplicate && (
                                  <div className="flex items-center gap-1 text-[11px] font-medium text-amber-800">
                                    <Badge variant="warning" className="h-5 px-1.5 text-[10px]">
                                      {tx.duplicateType === 'loan_installment' ? 'Installment Match' : 'Duplicate'}
                                    </Badge>
                                    <span className="truncate">{tx.duplicateReason}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* Category Selector */}
                            <TableCell>
                              <select
                                value={tx.categoryId || ''}
                                onChange={(e) => handleUpdateItem(tx.id, 'categoryId', e.target.value)}
                                className="h-8 py-0 px-2 text-xs w-full rounded-lg bg-muted/60 text-foreground outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <option value="">(No category)</option>
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </TableCell>

                            {/* Amount */}
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.01"
                                value={tx.amount}
                                onChange={(e) =>
                                  handleUpdateItem(tx.id, 'amount', parseFloat(e.target.value) || 0)
                                }
                                className={`h-8 text-xs font-bold text-right bg-muted/60 ${
                                  tx.isPayment ? 'text-emerald-700' : 'text-foreground'
                                }`}
                              />
                            </TableCell>

                            {/* Payment vs Swipe Badge */}
                            <TableCell>
                              <Badge
                                variant={tx.isPayment ? 'success' : 'neutral'}
                                className="uppercase text-[10px]"
                              >
                                {tx.isPayment ? 'Payment' : 'Swipe'}
                              </Badge>
                            </TableCell>

                            {/* Delete button */}
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleDeleteItem(tx.id)}
                                className="text-muted-foreground hover:text-rose-600"
                                title="Remove row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-3 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {selectedCount} of {stagedTransactions.length} items will be imported as swipes on{' '}
                  <span className="font-bold text-foreground">{card.name}</span>.
                </span>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                    disabled={isImporting}
                    className="rounded-2xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleImport}
                    disabled={isImporting || selectedCount === 0}
                    className="rounded-2xl gap-2 font-bold shadow-sm"
                  >
                    {isImporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Import {selectedCount} Transactions ({formatMoney(selectedTotal)})
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
