import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  Wallet,
  CreditCard,
  HandCoins,
  Receipt,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Layers,
  PiggyBank,
} from 'lucide-react';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen bg-[#F6F7F9] text-slate-900">
      {/* Top Navbar */}
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            T
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Tenvi</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
              Wealth Infrastructure
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 text-sm font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-sm flex items-center gap-1.5"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-900 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          Unified Digital Ledger & Personal Wealth Infrastructure
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15] mb-6">
          Bridge the gap between{' '}
          <span className="text-blue-600">liquid cash</span> &amp; long-term wealth.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
          Tenvi is a next-generation, all-in-one personal wealth infrastructure platform designed to
          bridge the gap between liquid cash and illiquid assets. Unlike traditional budgeting apps that
          only sync bank accounts, our unified digital ledger tracks daily cash flow, automated savings
          targets, loan/debt amortization, and asset equity under a single dashboard.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-md flex items-center justify-center gap-2"
          >
            Open Your Free Ledger
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 text-base font-medium bg-white text-slate-700 rounded-2xl hover:bg-slate-100 transition-all shadow-sm"
          >
            Sign In to Dashboard
          </Link>
        </div>
      </section>

      {/* 4 Core Pillars of Tenvi Wealth Infrastructure */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Eliminate Financial Fragmentation
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Bring your entire net worth, daily transactions, credit obligations, and savings targets into one unified ledger.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Daily Cash Flow */}
          <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-6">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Daily Cash Flow Tracking</h3>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
              Effortlessly track every peso coming in and going out across cash, e-wallets, bank accounts, and credit cards with instant 1-tap categorizations.
            </p>
            <div className="mt-6 p-4 rounded-2xl bg-[#F6F7F9] flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Real-time ledger</span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                Liquid Cash Flow
              </span>
            </div>
          </div>

          {/* 2. Credit Card & Debt Amortization */}
          <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-6">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Credit &amp; Debt Amortization</h3>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
              Monitor total spending power across cards, statement cutoff cycles, and payment countdowns. Receive automated daily alerts via Gmail SMTP &amp; SMS before due dates.
            </p>
            <div className="mt-6 p-4 rounded-2xl bg-[#F6F7F9] flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Debt payoff acceleration</span>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
                Zero Late Fees
              </span>
            </div>
          </div>

          {/* 3. Loans & Receivables */}
          <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-6">
              <HandCoins className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Friendly Loans &amp; Receivables</h3>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
              Manage money lent to friends, relatives, or partners. Full installment schedules (3 to 60 months), partial repayments, downpayments, and borrower notification alerts.
            </p>
            <div className="mt-6 p-4 rounded-2xl bg-[#F6F7F9] flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Complete payment schedules</span>
              <span className="text-xs font-semibold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full">
                Traceable Loans
              </span>
            </div>
          </div>

          {/* 4. Automated Savings & Equity Targets */}
          <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mb-6">
              <PiggyBank className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Automated Savings &amp; Asset Equity</h3>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
              Set dedicated vaults for emergency funds, investments, and long-term asset accumulation with automated deposit schedules and net worth progress.
            </p>
            <div className="mt-6 p-4 rounded-2xl bg-[#F6F7F9] flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Long-term equity growth</span>
              <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full">
                Asset Building
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-10 text-center text-xs text-slate-400">
        <p className="flex items-center justify-center gap-1.5 mb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Encrypted &amp; Isolated. Built on enterprise cloud infrastructure.
        </p>
        <p>© {new Date().getFullYear()} Tenvi. All-in-One Personal Wealth Infrastructure Platform.</p>
      </footer>
    </main>
  );
}
