'use client';

import { Suspense, useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { loginAction } from '@/app/actions/auth';
import { ArrowLeft, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { TenviIcon } from '@/components/ui/TenviIcon';
import { GoogleAuthButton } from '@/components/Auth/GoogleAuthButton';
import { TurnstileWidget } from '@/components/Auth/TurnstileWidget';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

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
    <div className="bg-card rounded-3xl p-5 sm:p-8 shadow-card">
      {isNotEnrolled ? (
        <div role="alert" className="mb-6 p-4 rounded-2xl bg-warning-soft text-sm">
          <div className="font-semibold flex items-center gap-1.5 mb-1 text-foreground">
            <AlertCircle className="w-4 h-4 text-warning-soft-foreground shrink-0" />
            No Tenvi account found
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Your credentials belong to an account on our platform, but it has not been
            registered for Tenvi yet. Please register to activate your Tenvi access.
          </p>
          <Link
            href={registerHref}
            className="inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-semibold text-warning-soft-foreground underline underline-offset-4 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Register for Tenvi now →
          </Link>
        </div>
      ) : (state?.error || urlError) ? (
        <div role="alert" className="mb-6 flex items-start gap-2 p-4 rounded-2xl bg-danger-soft text-danger-soft-foreground text-sm font-medium">
          <AlertCircle className="mt-0.5 w-4 h-4 shrink-0" />
          {state?.error || urlError}
        </div>
      ) : null}

      {/* 1-Click Google Sign In */}
      <div className="mb-6">
        <GoogleAuthButton mode="signin" />
      </div>

      {/* Clean Divider */}
      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1 data-horizontal:w-auto data-horizontal:h-0.5" />
        <span className="shrink-0 text-label text-muted-foreground">
          Or continue with email
        </span>
        <Separator className="flex-1 data-horizontal:w-auto data-horizontal:h-0.5" />
      </div>

      <form action={formAction} className="flex flex-col gap-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Email address
          </label>
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
              placeholder="yourname@gmail.com"
              className="pl-11"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground z-10">
              <Lock className="w-4 h-4" />
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="pl-11"
            />
          </div>
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
              Signing in…
            </>
          ) : (
            'Sign in to your account'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account yet?{' '}
        <Link
          href="/register"
          className="rounded-md font-semibold text-foreground hover:text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sign up for free
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
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
            Welcome back to Tenvi
          </h1>
        </div>
        <p className="mt-2 max-w-prose text-base text-muted-foreground">
          Sign in to view your daily spending, bills, and savings.
        </p>
      </div>

      <div className="mx-auto w-full max-w-md">
        <Suspense fallback={<div className="bg-card rounded-3xl p-8 shadow-card min-h-96" aria-busy="true" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
