'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileJson, Shield, Database } from 'lucide-react';
import { toast } from 'sonner';

export function DataExportPanel() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (url: string, filename: string, key: string) => {
    setDownloading(key);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Export generation failed.');
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
      toast.success('Download initiated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download export file.');
    } finally {
      setDownloading(null);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <Card className="rounded-3xl p-6 sm:p-8 shadow-xs border border-border/60">
      <CardHeader className="p-0 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-foreground">
              Data Portability & Accounting Ledger Export
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Export complete transactional records, balance sheets, and audit-ready commercial accounting files.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 space-y-4">
        {/* Export Item 1: Transactions Ledger */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border/40 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-bold text-foreground">General Transactions Ledger</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Complete history of income, expenses, and inter-account transfers with linked accounts, cards, and categories.
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
              className="rounded-xl text-xs font-semibold h-9"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {downloading === 'tx-csv' ? 'Exporting...' : 'Export CSV'}
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
              className="rounded-xl text-xs font-semibold h-9"
            >
              <FileJson className="w-3.5 h-3.5 mr-1.5" />
              {downloading === 'tx-json' ? 'Exporting...' : 'Export JSON'}
            </Button>
          </div>
        </div>

        {/* Export Item 2: Balance Sheet & Net Worth */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border/40 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">
                Balance Sheet & Net Worth Statement
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Consolidated snapshot of liquid bank accounts, receivables, fixed properties, card debts, and term liabilities.
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
                  `tenvi_balance_sheet_${todayStr}.csv`,
                  'nw-csv'
                )
              }
              className="rounded-xl text-xs font-semibold h-9"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {downloading === 'nw-csv' ? 'Exporting...' : 'Export CSV'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={downloading === 'nw-json'}
              onClick={() =>
                handleDownload(
                  '/api/export/net-worth?format=json',
                  `tenvi_balance_sheet_${todayStr}.json`,
                  'nw-json'
                )
              }
              className="rounded-xl text-xs font-semibold h-9"
            >
              <FileJson className="w-3.5 h-3.5 mr-1.5" />
              {downloading === 'nw-json' ? 'Exporting...' : 'Export JSON'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
