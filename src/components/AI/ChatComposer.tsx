'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  Send,
  Loader2,
  ImagePlus,
  Mic,
  MicOff,
  X,
  Lock,
  FileText,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { isPdfMedia, isHeicMedia, shouldDisplayFileNameFallback } from './mediaUtils';

export interface AttachedFileItem {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
  isPdf?: boolean;
  isHeic?: boolean;
}

interface ChatComposerProps {
  inputText: string;
  isProcessing: boolean;
  isListening: boolean;
  attachedImage: AttachedFileItem | null;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSendMessage: () => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onToggleVoiceInput: () => void;
  onStopVoiceInput: () => void;
}

export function ChatComposer({
  inputText,
  isProcessing,
  isListening,
  attachedImage,
  inputRef,
  fileInputRef,
  onInputChange,
  onKeyDown,
  onSendMessage,
  onImageSelect,
  onRemoveImage,
  onToggleVoiceInput,
  onStopVoiceInput,
}: ChatComposerProps) {
  const hasContent = Boolean(inputText.trim() || attachedImage);
  const [previewError, setPreviewError] = useState(false);

  // Reset preview error state whenever a new attachment is chosen
  useEffect(() => {
    setPreviewError(false);
  }, [attachedImage]);

  // Compute file formats using shared mediaUtils
  const isPdf = isPdfMedia(
    attachedImage?.isPdf ? 'pdf' : undefined,
    attachedImage?.file.name,
    attachedImage?.mimeType
  );

  const isHeic = isHeicMedia(
    attachedImage?.file.name,
    attachedImage?.mimeType
  );

  const showFileNameFallback = shouldDisplayFileNameFallback(isHeic, previewError);

  // Auto-resize textarea height
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    const target = e.target;
    target.style.height = 'auto';
    // Grow from 1 to 5 lines (~24px to ~120px), then scroll
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  return (
    <div className="p-3 bg-card/90 dark:bg-card/95 backdrop-blur-md border-t border-border/40 shrink-0">
      {/* Voice Listening Active Indicator Banner */}
      {isListening && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between animate-in fade-in duration-150 select-none">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-rose-500" />
            </span>
            <span className="font-semibold text-2xs sm:text-xs">
              Listening... speak naturally (e.g. &ldquo;paid 250 for lunch via Maya&rdquo;)
            </span>
          </div>
          <button
            type="button"
            onClick={onStopVoiceInput}
            className="text-2xs font-bold underline hover:opacity-80 cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      {/* Selected Image, PDF, or HEIC Preview Pill */}
      {attachedImage && (
        <div className="mb-2 p-1.5 pr-2.5 rounded-2xl bg-muted/60 flex items-center justify-between gap-2 max-w-fit animate-in fade-in duration-150">
          <div className="flex items-center gap-2 min-w-0">
            {isPdf ? (
              <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
            ) : showFileNameFallback ? (
              /* If .heic (unsupported by web browsers for preview) or broken preview, display file icon + file name */
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4" />
              </div>
            ) : (
              <img
                src={attachedImage.previewUrl}
                alt={attachedImage.file.name}
                className="w-8 h-8 rounded-xl object-cover shrink-0"
                onError={() => setPreviewError(true)}
              />
            )}
            <div className="flex flex-col min-w-0 text-left">
              <span className="text-2xs font-semibold text-foreground truncate max-w-[160px]">
                {attachedImage.file.name}
              </span>
              <span className="text-3xs text-muted-foreground uppercase font-medium">
                {isPdf
                  ? 'PDF Document'
                  : isHeic
                  ? 'HEIC Photo'
                  : `${Math.max(1, Math.round(attachedImage.file.size / 1024))} KB`}
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onRemoveImage}
            className="rounded-lg text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
            title="Remove file"
            aria-label="Remove file"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Floating Rounded Pill Container */}
      <div className="relative rounded-2xl bg-muted/50 border border-border/40 p-1.5 pl-3.5 flex items-end gap-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 shadow-2xs transition-all">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,.pdf,.heic,.heif,image/heic,image/heif"
          onChange={onImageSelect}
          className="hidden"
          aria-label="Upload receipt or financial statement (Image or PDF)"
        />

        {/* Auto-growing Textarea */}
        <textarea
          ref={inputRef}
          value={inputText}
          onChange={handleTextareaInput}
          onKeyDown={onKeyDown}
          placeholder={
            isListening
              ? 'Listening to your voice... Speak now...'
              : attachedImage
              ? 'Add note (e.g. "Maya wallet" or "Food expense")...'
              : 'Ask or log spending…'
          }
          rows={1}
          disabled={isProcessing}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none py-2 font-medium border-0 max-h-32 leading-relaxed"
          aria-label="Ask Tenvi AI or log an expense"
        />

        {/* Action Buttons inside the pill */}
        <div className="flex items-center gap-1 shrink-0 pb-1">
          {/* Photo / Receipt Attachment Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => fileInputRef.current?.click()}
            title="Upload receipt / photo"
            aria-label="Upload receipt or photo"
            disabled={isProcessing}
            className="rounded-xl text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-muted/80 cursor-pointer transition-colors"
          >
            <ImagePlus className="w-4 h-4" />
          </Button>

          {/* Voice Input (Microphone) Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onToggleVoiceInput}
            title={isListening ? 'Stop listening' : 'Voice input (Speak to Tenvi)'}
            aria-label={isListening ? 'Stop listening' : 'Voice input (Speak to Tenvi)'}
            disabled={isProcessing}
            className={`rounded-xl transition-all cursor-pointer ${
              isListening
                ? 'text-rose-600 dark:text-rose-400 bg-rose-500/15 animate-pulse hover:bg-rose-500/25'
                : 'text-muted-foreground hover:text-rose-500 hover:bg-muted/80'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>

          {/* Send Action Button */}
          <Button
            type="button"
            size="icon-xs"
            onClick={onSendMessage}
            disabled={!hasContent || isProcessing}
            aria-label="Send message"
            className={`rounded-xl transition-all cursor-pointer ${
              hasContent
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs active:scale-95'
                : 'bg-muted text-muted-foreground/40 cursor-not-allowed opacity-60'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Footer Meta Row */}
      <div className="mt-1.5 px-2 flex items-center justify-between text-3xs text-muted-foreground select-none">
        <span className="hidden md:inline font-medium text-muted-foreground/80">
          Press Enter to send, Shift+Enter for newline
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex items-center gap-1 cursor-default text-muted-foreground/80 hover:text-foreground transition-colors" tabIndex={0}>
                  <Lock className="w-2.5 h-2.5" />
                  <span>Private & Encrypted</span>
                </span>
              }
            />
            <TooltipContent side="top" className="text-2xs max-w-xs">
              Conversations are processed securely for financial queries and never shared.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

