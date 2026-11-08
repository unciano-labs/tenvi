'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Server,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Key,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { testGeminiConnectionAction, getGeminiUsageStatsAction } from '@/app/actions/gemini';
import { GeminiUsageStats } from '@/types';

interface AiIntelligencePanelProps {
  initialStats?: GeminiUsageStats | null;
}

export function AiIntelligencePanel({ initialStats = null }: AiIntelligencePanelProps) {
  const [stats, setStats] = useState<GeminiUsageStats | null>(initialStats);
  const [isLoading, setIsLoading] = useState(!initialStats);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    model: string;
    error?: string;
  } | null>(null);

  const loadStats = async () => {
    setIsLoading(true);
    const res = await getGeminiUsageStatsAction();
    if (res.stats) {
      setStats(res.stats);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!initialStats) {
      loadStats();
    }
  }, []);

  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    setGeminiTestResult(null);

    const res = await testGeminiConnectionAction();
    setIsTestingGemini(false);
    setGeminiTestResult(res);

    if (res.success) {
      toast.success(`Tenvi AI connection verified (${res.latencyMs}ms)! Model: ${res.model}`);
      const statsRes = await getGeminiUsageStatsAction();
      if (statsRes.stats) setStats(statsRes.stats);
    } else {
      toast.error(res.error || 'Tenvi AI connection test failed.');
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-xs">Connecting to Tenvi AI Engine telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Status Banner */}
      <div className="bg-card text-card-foreground shadow-card rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="size-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Sparkles className="size-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Tenvi AI Vision & Intelligence Engine
              </h2>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  stats?.hasKeyConfigured
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {stats?.hasKeyConfigured ? 'Active & Connected' : 'Offline Mode'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Tenvi AI leverages high-precision multimodal vision and conversational intelligence to parse financial statements, bills, and OCR receipts.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleTestGemini}
          disabled={isTestingGemini}
          className="gap-2 shrink-0 self-start sm:self-center font-semibold cursor-pointer"
        >
          {isTestingGemini ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Testing Ping...
            </>
          ) : (
            <>
              <Server className="size-4" />
              Test API Connection Live
            </>
          )}
        </Button>
      </div>

      {/* Test Result Toast/Banner */}
      {geminiTestResult && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 ${
            geminiTestResult.success
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {geminiTestResult.success ? (
              <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="size-5 text-rose-500 shrink-0" />
            )}
            <div>
              <span className="font-bold block">
                {geminiTestResult.success
                  ? `Tenvi AI Connection Verified (${geminiTestResult.latencyMs}ms round-trip)`
                  : 'Connection Test Failed'}
              </span>
              <span className="text-xs opacity-80">
                {geminiTestResult.success
                  ? `Tenvi Intelligence Engine (${geminiTestResult.model}) responded successfully. Your AI pipeline is ready!`
                  : geminiTestResult.error}
              </span>
            </div>
          </div>

          <span className="font-mono text-xs font-bold shrink-0">
            {geminiTestResult.latencyMs}ms
          </span>
        </div>
      )}

      {/* Quota & Consumption Cards */}
      <div className="grid-fluid gap-3 sm:gap-4 [--grid-min:9.5rem]">
        {/* Daily Requests */}
        <div className="bg-card text-card-foreground shadow-card rounded-2xl p-5 sm:p-6 space-y-2">
          <span className="text-xs font-semibold text-muted-foreground block">
            Daily Requests Used
          </span>
          <div className="text-xl font-bold text-foreground">
            {stats?.dailyRequestsUsed || 0}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              / {stats?.dailyRequestsLimit || 1500}
            </span>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
            {stats?.dailyRemainingRequests ?? 1500} free requests remaining today
          </p>
        </div>

        {/* Rate Limit */}
        <div className="bg-card text-card-foreground shadow-card rounded-2xl p-5 sm:p-6 space-y-2">
          <span className="text-xs font-semibold text-muted-foreground block">
            Burst Rate Limit
          </span>
          <div className="text-xl font-bold text-foreground">
            {stats?.minuteRateLimit || 15}
            <span className="text-xs font-normal text-muted-foreground ml-1">RPM</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Up to 15 requests per minute allowed on free tier
          </p>
        </div>

        {/* Tokens Processed */}
        <div className="bg-card text-card-foreground shadow-card rounded-2xl p-5 sm:p-6 space-y-2">
          <span className="text-xs font-semibold text-muted-foreground block">
            Tokens Processed Today
          </span>
          <div className="text-xl font-bold text-foreground">
            {(stats?.tokensUsedToday || 0).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Cap: 1,000,000 tokens / min (TPM)
          </p>
        </div>

        {/* Daily Reset Countdown */}
        <div className="bg-card text-card-foreground shadow-card rounded-2xl p-5 sm:p-6 space-y-2">
          <span className="text-xs font-semibold text-muted-foreground block">
            Daily Quota Reset
          </span>
          <div className="text-xl font-bold text-foreground">
            ~{stats?.resetHoursRemaining || 24}h
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Resets daily at 00:00 UTC (8:00 AM PHT)
          </p>
        </div>
      </div>

      {/* Daily Consumption Progress Meter Card */}
      <div className="bg-card text-card-foreground shadow-card rounded-2xl p-5 sm:p-6 overflow-hidden space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Daily Free Quota Consumption
            </h3>
            <p className="text-xs text-muted-foreground">
              Tenvi AI High-Speed Allocation (1,500 requests / day).
            </p>
          </div>

          <span className="text-sm font-bold text-indigo-500 bg-indigo-500/10 px-3.5 py-1.5 rounded-xl">
            {stats?.dailyPercentUsed || 0}% Consumed
          </span>
        </div>

        <Progress
          value={Math.max(2, stats?.dailyPercentUsed || 0)}
          aria-label="Daily AI Free Quota Consumption"
          className="h-3"
        />

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>0 requests</span>
          <span>750 requests (50%)</span>
          <span>1,500 requests (Daily Cap)</span>
        </div>
      </div>

      {/* Configuration & Details Grid */}
      <div className="grid grid-cols-1 @3xl/main:grid-cols-2 gap-6">
        {/* Key & Models Configuration */}
        <div className="bg-card text-card-foreground shadow-card rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs capitalize font-bold text-muted-foreground tracking-wider">
            <Key className="size-4 text-indigo-500" />
            Engine & Key Configuration
          </div>

          <div className="space-y-2.5">
            <div className="p-3.5 rounded-2xl bg-muted flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Configured Key:</span>
              <span className="font-mono font-bold text-foreground">
                {stats?.maskedKey || 'Not Configured'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Key Storage:</span>
              <span className="font-mono text-foreground">.env.local (GEMINI_API_KEY)</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Primary Vision Model:</span>
              <span className="font-bold text-indigo-500 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg">
                gemini-flash-latest
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Secondary Fallback:</span>
              <span className="font-medium text-foreground">gemini-2.5-flash-lite</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Local Offline Engine:</span>
              <span className="font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg">
                pdf-parse + tesseract.js
              </span>
            </div>
          </div>
        </div>

        {/* Feature Usage Breakdown */}
        <div className="bg-card text-card-foreground shadow-card rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs capitalize font-bold text-muted-foreground tracking-wider">
            <Sparkles className="size-4 text-emerald-500" />
            Usage Breakdown Today
          </div>

          <div className="space-y-2.5">
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-foreground block">Statement Vision Scans</span>
                <span className="text-xs text-indigo-500">PDF statements & receipt photos</span>
              </div>
              <span className="text-lg font-bold text-foreground">
                {stats?.usageByFeature.statementVision || 0}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-foreground block">AI Wealth Chat Assistant</span>
                <span className="text-xs text-emerald-700 dark:text-emerald-400">Natural language prompt entries</span>
              </div>
              <span className="text-lg font-bold text-foreground">
                {stats?.usageByFeature.aiChat || 0}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-foreground block">Health & Latency Tests</span>
                <span className="text-xs text-muted-foreground">Manual connection pings</span>
              </div>
              <span className="text-lg font-bold text-foreground">
                {stats?.usageByFeature.other || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Zero Downtime & Safety Box */}
      <div className="p-5 rounded-3xl bg-blue-500/10 text-xs text-blue-700 dark:text-blue-400 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-blue-500 shrink-0" />
          <h4 className="font-bold text-sm">Tenvi Zero-Downtime Guarantee</h4>
        </div>
        <p className="leading-relaxed opacity-90 text-foreground">
          Even if you ever exceed the 1,500 daily free requests, lose internet connection to Google, or remove your API key, Tenvi will automatically and transparently switch to its built-in local PDF and OCR parser. Your statements will continue to parse with zero interruptions.
        </p>
      </div>
    </div>
  );
}

