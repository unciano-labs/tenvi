'use client';

import { Suspense, useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { loginAction } from '@/app/actions/auth';
import { ArrowLeft, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { TenviIcon } from '@/components/UI/TenviIcon';

function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');

  const isNotEnrolled =
    (state as any)?.code === 'NOT_ENROLLED_FOR_WEBSITE' || urlError === 'not_enrolled';
  const urlEmail = searchParams.get('email');
  const registerHref = urlEmail
    ? `/register?email=${encodeURIComponent(urlEmail)}&enrolling=true`
    : '/register';

  return (
    <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm">
      {isNotEnrolled ? (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200/70 text-sm">
          <div className="font-semibold flex items-center gap-1.5 mb-1 text-amber-950">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            No Tenvi Account Found
          </div>
          <p className="text-xs text-amber-800 leading-relaxed mb-3">
            Your credentials belong to an account on our platform, but it has not been
            registered for Tenvi yet. Please register to activate your Tenvi access.
          </p>
          <Link
            href={registerHref}
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-950 underline hover:text-amber-800"
          >
            Register for Tenvi now →
          </Link>
        </div>
      ) : state?.error ? (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 text-rose-700 text-sm font-medium">
          {state.error}
        </div>
      ) : null}

      <form action={formAction} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-slate-700 mb-1.5"
          >
            Email address
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
            className="block text-sm font-semibold text-slate-700 mb-1.5"
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
              autoComplete="current-password"
              required
              placeholder="••••••••"
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
              Signing in...
            </>
          ) : (
            'Sign In to Your Account'
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-slate-500">
        Don&apos;t have an account yet?{' '}
        <Link
          href="/register"
          className="font-semibold text-slate-800 hover:text-slate-950 underline underline-offset-4"
        >
          Sign up for free
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <TenviIcon className="w-10 h-10 rounded-2xl shrink-0 shadow-sm" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Welcome back to Tenvi
          </h1>
        </div>
        <p className="text-sm text-slate-600 mb-8">
          Sign in to view your daily spending, bills, and savings.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-6">
        <Suspense fallback={<div className="bg-white rounded-3xl p-8 shadow-sm h-64 animate-pulse" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
