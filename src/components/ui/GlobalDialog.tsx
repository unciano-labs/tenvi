'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type DialogVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmModalOptions {
  title?: string;
  description: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
}

export interface AlertModalOptions {
  title?: string;
  description: string | React.ReactNode;
  buttonText?: string;
  variant?: DialogVariant;
}

interface DialogState {
  id: string;
  type: 'confirm' | 'alert';
  title: string;
  description: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  buttonText?: string;
  variant: DialogVariant;
  resolve: (value: boolean) => void;
}

let activeDialog: DialogState | null = null;
const listeners = new Set<(dialog: DialogState | null) => void>();

function notify() {
  listeners.forEach((listener) => listener(activeDialog));
}

/**
 * Open a global confirmation modal that returns a Promise resolving to true or false.
 */
export function confirmModal(options: ConfirmModalOptions | string): Promise<boolean> {
  return new Promise((resolve) => {
    const opts =
      typeof options === 'string'
        ? {
            title:
              options.toLowerCase().includes('delete') || options.toLowerCase().includes('remove')
                ? 'Confirm Action'
                : 'Are you sure?',
            description: options,
            variant: (options.toLowerCase().includes('delete') ||
            options.toLowerCase().includes('remove')
              ? 'danger'
              : 'info') as DialogVariant,
          }
        : options;

    activeDialog = {
      id: Math.random().toString(),
      type: 'confirm',
      title: opts.title || 'Are you sure?',
      description: opts.description,
      confirmText: opts.confirmText || 'Confirm',
      cancelText: opts.cancelText || 'Cancel',
      variant: opts.variant || 'danger',
      resolve: (val: boolean) => {
        activeDialog = null;
        notify();
        resolve(val);
      },
    };
    notify();
  });
}

/**
 * Open a global alert modal that returns a Promise resolving when dismissed.
 */
export function alertModal(options: AlertModalOptions | string): Promise<void> {
  return new Promise((resolve) => {
    const opts =
      typeof options === 'string'
        ? {
            title: 'Notice',
            description: options,
            variant: 'info' as DialogVariant,
          }
        : options;

    activeDialog = {
      id: Math.random().toString(),
      type: 'alert',
      title: opts.title || 'Notice',
      description: opts.description,
      buttonText: opts.buttonText || 'Got it',
      variant: opts.variant || 'info',
      resolve: () => {
        activeDialog = null;
        notify();
        resolve(undefined as any);
      },
    };
    notify();
  });
}

export function GlobalDialog() {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    listeners.add(setDialog);
    return () => {
      listeners.delete(setDialog);
    };
  }, []);

  // Handle keyboard events (ESC to cancel, Enter to confirm)
  useEffect(() => {
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        dialog.resolve(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog]);

  // Auto-focus confirm/OK button when dialog opens
  useEffect(() => {
    if (dialog && confirmBtnRef.current) {
      confirmBtnRef.current.focus();
    }
  }, [dialog]);

  if (!dialog) return null;

  const getIcon = () => {
    switch (dialog.variant) {
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mb-4 ring-8 ring-rose-500/10">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mb-4 ring-8 ring-amber-500/10">
            <AlertCircle className="w-6 h-6" />
          </div>
        );
      case 'success':
        return (
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mb-4 ring-8 ring-emerald-500/10">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mb-4 ring-8 ring-blue-500/10">
            <Info className="w-6 h-6" />
          </div>
        );
    }
  };

  const getConfirmBtnClasses = () => {
    switch (dialog.variant) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/20';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-900/20';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20';
      case 'info':
      default:
        return 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs';
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md animate-in fade-in duration-150"
      onClick={() => dialog.resolve(false)}
    >
      <div
        className="bg-card text-card-foreground w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-lift relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={() => dialog.resolve(false)}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {getIcon()}

        <h3 className="text-lg font-extrabold text-foreground tracking-tight">
          {dialog.title}
        </h3>

        <div className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {dialog.description}
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          {dialog.type === 'confirm' ? (
            <>
              <button
                type="button"
                onClick={() => dialog.resolve(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-sm text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 transition-colors cursor-pointer"
              >
                {dialog.cancelText}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={() => dialog.resolve(true)}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all cursor-pointer ${getConfirmBtnClasses()}`}
              >
                {dialog.confirmText}
              </button>
            </>
          ) : (
            <button
              ref={confirmBtnRef}
              type="button"
              onClick={() => dialog.resolve(true)}
              className="w-full px-5 py-2.5 rounded-xl font-semibold text-sm text-primary-foreground bg-primary hover:bg-primary/90 shadow-sm transition-all cursor-pointer"
            >
              {dialog.buttonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
