'use client';

import { Suspense, useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { registerAction } from '@/app/actions/auth';
import { TenviIcon } from '@/components/ui/TenviIcon';
import { GoogleAuthButton } from '@/components/Auth/GoogleAuthButton';
import { TurnstileWidget } from '@/components/Auth/TurnstileWidget';
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
    <div className="bg-card rounded-3xl p-5 sm:p-8 shadow-card">
      {/* Dynamic Alert Messages */}
      {state?.error && (
        <div role="alert" className="mb-6 p-4 rounded-2xl bg-danger-soft text-danger-soft-foreground text-sm font-medium flex items-start gap-2">
          <AlertCircle className="mt-0.5 w-4 h-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {isAlreadyRegistered && !state?.error && (
        <div role="status" className="mb-6 p-4 rounded-2xl bg-lightprimary text-sm">
          <div className="font-semibold flex items-center gap-1.5 mb-1 text-foreground">
            <Info className="w-4 h-4 text-primary shrink-0" />
            Account already enrolled
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            You already have an active Tenvi account with this email address. Please log in
            to access your dashboard.
          </p>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-semibold text-primary underline underline-offset-4 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Go to sign in →
          </Link>
        </div>
      )}

      {isExistingAccount && !isAlreadyRegistered && !state?.error && (
        <div role="status" className="mb-6 p-4 rounded-2xl bg-lightprimary text-sm">
          <div className="font-semibold flex items-center gap-1.5 mb-1 text-foreground">
            <ShieldAlert className="w-4 h-4 text-primary shrink-0" />
            Connected account detected
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
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
      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1 data-horizontal:w-auto data-horizontal:h-0.5" />
        <span className="shrink-0 text-label text-muted-foreground">
          {isEnrolling ? 'Or confirm with password' : 'Or register with email'}
        </span>
        <Separator className="flex-1 data-horizontal:w-auto data-horizontal:h-0.5" />
      </div>

      <form action={formAction} className="flex flex-col gap-5">
        {/* Full Name (Populated & Editable) */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-foreground"
            >
              Your full name
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
            <p className="text-xs leading-snug text-muted-foreground mt-1.5">
              Pre-filled from your profile. You can edit this name for Tenvi.
            </p>
          )}
        </div>

        {/* Email Address (Pre-populated & Read-only if from matched credentials) */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground"
            >
              Email address
            </label>
            {isEnrolling && (
              <Badge variant="neutral" className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Linked account
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
            <p className="text-xs leading-snug text-muted-foreground mt-1.5">
              Connected to your verified account email.
            </p>
          )}
        </div>

        {/* Password (Always empty, must match existing account if enrolling) */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-foreground mb-2"
          >
            {isEnrolling ? 'Confirm account password' : 'Password'}
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
            <p className="text-xs leading-snug text-muted-foreground mt-1.5">
              Required: Enter your account password to confirm identity and activate Tenvi.
            </p>
          )}
        </div>

        {/* Cloudflare Turnstile Bot Protection */}
        <TurnstileWidget />

        <Button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="w-full mt-1"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isEnrolling ? 'Verifying and activating…' : 'Creating account…'}
            </>
          ) : isEnrolling ? (
            <>
              <ShieldCheck className="w-4 h-4" />
              Confirm &amp; activate Tenvi
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Create free account
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          className="rounded-md font-semibold text-foreground hover:text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <main className="min-h-dvh bg-background flex flex-col justify-center gap-8 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <Link
          href="/"
          className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-(--motion-fast) ease-(--ease-in-out) outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="mt-6 flex flex-col items-start gap-4">
          <TenviIcon className="size-11 rounded-2xl shrink-0 shadow-card" />
          <h1 className="text-display text-foreground">
            Create your Tenvi account
          </h1>
        </div>
        <p className="mt-2 max-w-prose text-base text-muted-foreground">
          Your simple, secure, and private personal money ledger.
        </p>
      </div>

      <div className="mx-auto w-full max-w-md">
        <Suspense
          fallback={
            <div className="bg-card rounded-3xl p-8 shadow-card min-h-[32rem]" aria-busy="true" />
          }
        >
          <RegisterForm />
        </Suspense>
      </div>
    </main>
  );
}
