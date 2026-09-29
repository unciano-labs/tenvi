'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, User, Bell, Settings } from 'lucide-react';

interface MobileHeaderProps {
  userName: string;
  userEmail: string;
}

export function MobileHeader({ userName, userEmail }: MobileHeaderProps) {
  const initial = (userName || userEmail || 'U').charAt(0).toUpperCase();

  return (
    <header className="md:hidden sticky top-0 z-30 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/70 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between transition-all">
      {/* Brand logo & platform identity */}
      <Link href="/dashboard" className="flex items-center gap-2.5 active:scale-95 transition-transform">
        <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-xs">
          T
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-extrabold tracking-tight text-slate-900 leading-none">Tenvi</span>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded leading-none">
              OS
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium leading-none block mt-0.5">
            Personal Wealth Hub
          </span>
        </div>
      </Link>

      {/* Quick shortcuts: Alerts & Profile */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/settings"
          className="w-8 h-8 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 flex items-center justify-center text-slate-600 transition-colors"
          title="Alerts & Notification Settings"
          aria-label="Settings"
        >
          <Bell className="w-4 h-4" />
        </Link>

        <Link
          href="/dashboard/settings"
          className="flex items-center gap-1.5 p-1 pl-1.5 pr-2 sm:pr-2.5 rounded-full bg-slate-100/90 hover:bg-slate-200 transition-colors active:scale-95 shrink-0"
          title={`Signed in as ${userEmail}`}
        >
          <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
            {initial}
          </div>
          <span className="text-xs font-semibold text-slate-700 max-w-[70px] sm:max-w-[90px] truncate">
            {userName.split(' ')[0]}
          </span>
        </Link>
      </div>
    </header>
  );
}
