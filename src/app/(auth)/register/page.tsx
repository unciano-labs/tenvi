'use client';

import { Suspense, useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { registerAction } from '@/app/actions/auth';
import {
  ArrowLeft,
  Lock,
  Mail,
  User,
  Loader2,
  Sparkles,
  Info,
  ShieldAlert,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, null);
  const searchParams = useSearchParams();

  const urlEmail = searchParams.get('email')?.trim() || '';
  const urlName = searchParams.get('name')?.trim() || '';
  const isEnrolling =
    searchParams.get('enrolling') === 'true' || Boolean(urlEmail);

  const isAlreadyRegistered = state?.code === 'ALREADY_REGISTERED';
  const isExistingAccount =
    state?.code === 'EXISTING_ACCOUNT_PASSWORD_REQUIRED' || isEnrolling;

  return (
    <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm">
      {/* Dynamic Alert Messages */}
      {state?.error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 text-rose-700 text-sm font-medium flex items-center gap-2 border border-rose-200/60">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{state.error}</span>
        </div>
      )}

      {isAlreadyRegistered && !state?.error && (
        <div className="mb-6 p-4 rounded-2xl bg-indigo-50 text-indigo-900 border border-indigo-200/70 text-sm">
          <div className="font-semibold flex items-center gap-1.5 mb-1 text-indigo-950">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            Account Already Enrolled
          </div>
          <p className="text-xs text-indigo-800 leading-relaxed mb-3">
            You already have an active Tenvi account with this email address. Please log in
            to access your dashboard.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-950 underline hover:text-indigo-800"
          >
            Go to Log In →
          </Link>
        </div>
      )}

      {isExistingAccount && !isAlreadyRegistered && !state?.error && (
        <div className="mb-6 p-4 rounded-2xl bg-blue-50 text-blue-900 border border-blue-200/70 text-sm">
          <div className="font-semibold flex items-center gap-1.5 mb-1 text-blue-950">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
            Connected Account Detected
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">
            Your credentials belong to an account on our platform. Please confirm your account
            password below to link and activate your Tenvi access.
          </p>
        </div>
      )}

      <form action={formAction} className="space-y-5">
        {/* Full Name (Populated & Editable) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="fullName"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
            >
              Your Full Name
            </label>
            {isEnrolling && (
              <span className="text-[11px] font-medium text-slate-400">
                Editable
              </span>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              defaultValue={urlName}
              placeholder="e.g. Freddie Unciano"
              className="bili-input w-full pl-11"
            />
          </div>
          {isEnrolling && (
            <p className="text-[11px] text-slate-400 mt-1">
              Pre-filled from your profile. You can edit this name for Tenvi.
            </p>
          )}
        </div>

        {/* Email Address (Pre-populated & Read-only if from matched credentials) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
            >
              Email Address
            </label>
            {isEnrolling && (
              <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Linked Account (Read-Only)
              </span>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              readOnly={isEnrolling}
              defaultValue={urlEmail}
              placeholder="yourname@gmail.com"
              className={`bili-input w-full pl-11 ${
                isEnrolling
                  ? 'bg-slate-100 text-slate-600 font-medium cursor-not-allowed select-none'
                  : ''
              }`}
            />
          </div>
          {isEnrolling && (
            <p className="text-[11px] text-slate-400 mt-1">
              Locked to your verified platform account email.
            </p>
          )}
        </div>

        {/* Password (Always empty, must match existing account if enrolling) */}
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
          >
            {isEnrolling ? 'Confirm Account Password' : 'Password'}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isEnrolling ? 'current-password' : 'new-password'}
              required
              placeholder={
                isEnrolling
                  ? 'Enter your existing account password'
                  : 'At least 6 characters'
              }
              className="bili-input w-full pl-11"
            />
          </div>
          {isEnrolling && (
            <p className="text-[11px] text-slate-400 mt-1">
              Required: Enter your account password to confirm identity and activate Tenvi.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="bili-btn-primary w-full py-3.5 text-base mt-4 shadow-sm"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isEnrolling ? 'Verifying & Activating...' : 'Creating account...'}
            </>
          ) : isEnrolling ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Confirm &amp; Activate Tenvi
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Get Started Free
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold text-slate-900 hover:underline"
        >
          Log in instead
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[#F6F7F9] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            T
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create your Tenvi account
          </h1>
        </div>
        <p className="text-sm text-slate-500 mb-8">
          Your all-in-one personal wealth infrastructure ledger.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-6">
        <Suspense
          fallback={
            <div className="bg-white rounded-3xl p-8 shadow-sm h-80 animate-pulse" />
          }
        >
          <RegisterForm />
        </Suspense>
      </div>
    </main>
  );
}
