'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerAction } from '@/app/actions/auth';
import { ArrowLeft, Lock, Mail, User, Loader2, Sparkles, Info, ShieldAlert } from 'lucide-react';

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, null);

  const isAlreadyRegistered = state?.code === 'ALREADY_REGISTERED';
  const isExistingAccount = state?.code === 'EXISTING_ACCOUNT_PASSWORD_REQUIRED';

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
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm">
          {isAlreadyRegistered ? (
            <div className="mb-6 p-4 rounded-2xl bg-indigo-50 text-indigo-900 border border-indigo-200/70 text-sm">
              <div className="font-semibold flex items-center gap-1.5 mb-1 text-indigo-950">
                <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                Account Already Enrolled
              </div>
              <p className="text-xs text-indigo-800 leading-relaxed mb-3">
                You already have an active Bili account with this email address. Please log in
                to access your dashboard.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-950 underline hover:text-indigo-800"
              >
                Go to Log In →
              </Link>
            </div>
          ) : isExistingAccount ? (
            <div className="mb-6 p-4 rounded-2xl bg-blue-50 text-blue-900 border border-blue-200/70 text-sm">
              <div className="font-semibold flex items-center gap-1.5 mb-1 text-blue-950">
                <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
                Connected Account Detected
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">
                An account with this email exists across our platform. Please enter your existing
                account password below to link and activate your Bili account.
              </p>
            </div>
          ) : state?.error ? (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 text-rose-700 text-sm font-medium">
              {state.error}
            </div>
          ) : null}

          <form action={formAction} className="space-y-5">
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                Your Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  placeholder="e.g. Freddie Unciano"
                  className="bili-input w-full pl-11"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                Email Address
              </label>
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
                  placeholder="yourname@gmail.com"
                  className="bili-input w-full pl-11"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="At least 6 characters"
                  className="bili-input w-full pl-11"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="bili-btn-primary w-full py-3.5 text-base mt-4 shadow-sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
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
      </div>
    </main>
  );
}
