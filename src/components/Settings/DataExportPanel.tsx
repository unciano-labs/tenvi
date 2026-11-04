'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileJson, Shield, Database, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function DataExportPanel() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (url: string, filename: string, key: string) => {
    setDownloading(key);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Could not create your download file.');
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Your file is downloading now!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download your file. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <Card className="rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
      <CardHeader className="p-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
            <Download className="size-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-foreground">
              Download a Copy of Your Records
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              You can save a copy of your records to your computer or phone anytime.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 space-y-4">
        {/* Item 1: Transactions History */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-muted/50 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-sm font-bold text-foreground">
                Your Spending & Income History
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A complete list of your daily expenses, income received, and transfers between accounts.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={downloading === 'tx-csv'}
              onClick={() =>
                handleDownload(
                  '/api/export/transactions?format=csv',
                  `tenvi_transactions_${todayStr}.csv`,
                  'tx-csv'
                )
              }
              className="rounded-xl text-xs font-semibold h-10 px-3 cursor-pointer"
            >
              <Download className="size-3.5 mr-1.5" />
              {downloading === 'tx-csv' ? 'Downloading...' : 'Excel / Spreadsheet'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={downloading === 'tx-json'}
              onClick={() =>
                handleDownload(
                  '/api/export/transactions?format=json',
                  `tenvi_transactions_${todayStr}.json`,
                  'tx-json'
                )
              }
              className="rounded-xl text-xs font-semibold h-10 px-3 cursor-pointer"
            >
              <FileJson className="size-3.5 mr-1.5" />
              {downloading === 'tx-json' ? 'Downloading...' : 'Data File (JSON)'}
            </Button>
          </div>
        </div>

        {/* Item 2: Accounts & Net Worth */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-muted/50 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-primary shrink-0" />
              <span className="text-sm font-bold text-foreground">
                Your Savings & Debts Summary
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A snapshot of your bank accounts, credit cards, money lent to others, and loans.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={downloading === 'nw-csv'}
              onClick={() =>
                handleDownload(
                  '/api/export/net-worth?format=csv',
                  `tenvi_savings_and_debts_${todayStr}.csv`,
                  'nw-csv'
                )
              }
              className="rounded-xl text-xs font-semibold h-10 px-3 cursor-pointer"
            >
              <Download className="size-3.5 mr-1.5" />
              {downloading === 'nw-csv' ? 'Downloading...' : 'Excel / Spreadsheet'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={downloading === 'nw-json'}
              onClick={() =>
                handleDownload(
                  '/api/export/net-worth?format=json',
                  `tenvi_savings_and_debts_${todayStr}.json`,
                  'nw-json'
                )
              }
              className="rounded-xl text-xs font-semibold h-10 px-3 cursor-pointer"
            >
              <FileJson className="size-3.5 mr-1.5" />
              {downloading === 'nw-json' ? 'Downloading...' : 'Data File (JSON)'}
            </Button>
          </div>
        </div>

        {/* Safe & Private Reassurance */}
        <div className="p-4 rounded-2xl bg-blue-500/10 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-3">
          <CheckCircle2 className="size-5 shrink-0 text-blue-500" />
          <p className="leading-relaxed text-foreground/90">
            <strong>Safe and private:</strong> Your downloads are saved directly to your device and are never shared with anyone.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
