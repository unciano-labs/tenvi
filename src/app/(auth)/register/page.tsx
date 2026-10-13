'use client';

import { Suspense, useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { registerAction } from '@/app/actions/auth';
import { TenviIcon } from '@/components/ui/TenviIcon';
import { GoogleAuthButton } from '@/components/Auth/GoogleAuthButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
    <div className="bg-card rounded-3xl p-8 sm:p-10 shadow-card">
      {/* Dynamic Alert Messages */}
      {state?.error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 text-rose-500 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{state.error}</span>
        </div>
      )}

      {isAlreadyRegistered && !state?.error && (
        <div className="mb-6 p-4 rounded-2xl bg-indigo-500/10 text-indigo-500 text-sm">
          <div className="font-semibold flex items-center gap-1.5 mb-1 text-foreground">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            Account Already Enrolled
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            You already have an active Tenvi account with this email address. Please log in
            to access your dashboard.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-500 underline hover:text-indigo-400"
          >
            Go to Log In →
          </Link>
        </div>
      )}

      {isExistingAccount && !isAlreadyRegistered && !state?.error && (
        <div className="mb-6 p-4 rounded-2xl bg-blue-500/10 text-blue-500 text-sm">
          <div className="font-semibold flex items-center gap-1.5 mb-1 text-foreground">
            <ShieldAlert className="w-4 h-4 text-blue-500 shrink-0" />
            Connected Account Detected
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your credentials belong to an account on our platform. Please confirm your account
            password below to link and activate your Tenvi access.
          </p>
        </div>
      )}

      {/* 1-Click Google Sign Up */}
      <div className="mb-6">
        <GoogleAuthButton mode={isEnrolling ? 'continue' : 'signup'} />
      </div>

      {/* Clean Divider */}
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <span className="relative bg-card px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {isEnrolling ? 'Or confirm with password' : 'Or register with email'}
        </span>
      </div>

      <form action={formAction} className="space-y-5">
        {/* Full Name (Populated & Editable) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="fullName"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Your Full Name
            </label>
            {isEnrolling && (
              <Badge variant="neutral">
                Editable
              </Badge>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground z-10">
              <User className="w-4 h-4" />
            </div>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              required
              defaultValue={urlName}
              placeholder="e.g. Freddie Unciano"
              className="pl-11"
            />
          </div>
          {isEnrolling && (
            <p className="text-xs text-muted-foreground mt-1">
              Pre-filled from your profile. You can edit this name for Tenvi.
            </p>
          )}
        </div>

        {/* Email Address (Pre-populated & Read-only if from matched credentials) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-foreground"
            >
              Email address
            </label>
            {isEnrolling && (
              <Badge variant="neutral" className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Linked Account
              </Badge>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground z-10">
              <Mail className="w-4 h-4" />
            </div>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              readOnly={isEnrolling}
              defaultValue={urlEmail}
              placeholder="yourname@gmail.com"
              className={`pl-11 ${
                isEnrolling
                  ? 'bg-muted text-muted-foreground font-medium cursor-not-allowed select-none'
                  : ''
              }`}
            />
          </div>
          {isEnrolling && (
            <p className="text-xs text-muted-foreground mt-1">
              Connected to your verified account email.
            </p>
          )}
        </div>

        {/* Password (Always empty, must match existing account if enrolling) */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-foreground mb-1.5"
          >
            {isEnrolling ? 'Confirm Account Password' : 'Password'}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground z-10">
              <Lock className="w-4 h-4" />
            </div>
            <Input
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
              className="pl-11"
            />
          </div>
          {isEnrolling && (
            <p className="text-xs text-muted-foreground mt-1">
              Required: Enter your account password to confirm identity and activate Tenvi.
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isPending}
          size="lg"
          className="w-full h-12 rounded-2xl text-base mt-4 shadow-card hover:shadow-lift"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isEnrolling ? 'Verifying & Activating...' : 'Creating account...'}
            </>
          ) : isEnrolling ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              Confirm &amp; Activate Tenvi
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Create Free Account
            </>
          )}
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold text-foreground hover:text-primary underline underline-offset-4"
        >
          Sign in here
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <TenviIcon className="w-10 h-10 rounded-2xl shrink-0 shadow-xs" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Create your Tenvi account
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          Your simple, secure, and private personal money ledger.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-6">
        <Suspense
          fallback={
            <div className="bg-card rounded-3xl p-8 shadow-card h-80 animate-pulse" />
          }
        >
          <RegisterForm />
        </Suspense>
      </div>
    </main>
  );
}
