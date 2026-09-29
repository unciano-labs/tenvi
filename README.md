# Tenvi

Tenvi is a modern financial management and property tracking platform built with Next.js, Supabase, and TailwindCSS.

## Features

- **Dashboard**: Real-time financial overview, money in/out metrics, and customizable widgets.
- **Transactions & Statements**: Bank statement upload (PDF parsing & OCR via Tesseract), automated transaction categorisation, and split transactions.
- **Credit Cards & Loans**: Payment schedule tracking, loan amortization, statement cycles, and debt monitoring.
- **Receivables & Debt Tracking**: Track money owed to you and record repayments.
- **Savings & Goals**: Savings accounts and goal progression.
- **Real Estate & Property Portfolio**: Asset valuation, rental income, and linked mortgages.
- **AI Financial Assistant**: Integrated chat assistant powered by Google Gemini with safe tool calling and financial advisory guardrails.
- **Automated Notifications**: Cron-triggered notification checks and transactional email alerts.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack) & React 19
- **Backend / Database**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Styling**: TailwindCSS 4
- **AI**: Google Gen AI SDK (`@google/genai`)
- **Document Processing**: `pdf-parse`, `tesseract.js`
- **Validation**: Zod & React Hook Form

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env.local` and fill in your Supabase, Gemini, and PayMongo credentials:
   ```bash
   cp .env.example .env.local
   ```

3. **Run local dev server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```
