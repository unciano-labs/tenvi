'use client';

import React from 'react';
import {
  RotateCcw,
  X,
  MoreHorizontal,
  Minus,
  Maximize2,
  Minimize2,
  Trash2,
} from 'lucide-react';
import { TenviIcon } from '@/components/ui/TenviIcon';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface ChatHeaderProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNewChat: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

export function ChatHeader({
  isExpanded,
  onToggleExpand,
  onNewChat,
  onMinimize,
  onClose,
}: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-20 px-4 py-3 bg-card/85 dark:bg-card/90 backdrop-blur-md border-b border-border/40 text-foreground flex items-center justify-between shrink-0 select-none">
      {/* Brand & Assistant identity */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0 flex items-center justify-center">
          <TenviIcon variant="solid" className="w-8 h-8 rounded-xl shadow-xs" />
          {/* Subtle live status dot */}
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-background"
            aria-hidden="true"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold tracking-tight text-foreground truncate">
              Tenvi AI
            </h2>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium truncate">
            Financial Assistant
          </p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Visible Action 1: New Chat */}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onNewChat}
          title="Start a new chat"
          aria-label="Start a new chat"
          className="rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        {/* Overflow Menu ("...") for secondary actions */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                title="More options"
                aria-label="More options"
                className="rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
              />
            }
          >
            <MoreHorizontal className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 p-1 rounded-2xl shadow-lift">
            <DropdownMenuItem
              onClick={onToggleExpand}
              className="gap-2 text-xs font-semibold cursor-pointer rounded-xl hidden md:flex"
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Restore Standard Size</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Expand to Side Panel</span>
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={onMinimize}
              className="gap-2 text-xs font-semibold cursor-pointer rounded-xl hidden md:flex"
            >
              <Minus className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Minimize Window</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="hidden md:block my-1" />

            <DropdownMenuItem
              onClick={onNewChat}
              className="gap-2 text-xs font-semibold cursor-pointer rounded-xl text-rose-600 dark:text-rose-400 focus:text-rose-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Session & History</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Visible Action 2: Close */}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          title="Close chat assistant"
          aria-label="Close chat assistant"
          className="rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}

