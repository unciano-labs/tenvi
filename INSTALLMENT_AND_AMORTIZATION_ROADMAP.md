# Tenvi Installment & Amortization Architecture Roadmap

> **Document Type**: Technical Architecture Roadmap & Modularization Plan  
> **Target System**: Credit Card Installments, Mortgages, Asset Financing, P2P Loans & Debts  
> **Status**: Living Blueprint & Implementation Ledger  
> **Target Framework**: Next.js 16 App Router (`src/`), React 19, TypeScript, Vitest, Supabase SSR & PostgreSQL  
> **Author**: Antigravity Core Architecture Team  

---

## 1. Executive Summary & Architectural Alignment

Tenvi tracks multi-asset wealth, personal debt, P2P lending, and revolving credit card accounts. As the platform expanded, installment and amortization calculations were initially incorporated into [`src/lib/finance/calculations.ts`](file:///Users/jeunciano/Workstation/Bili/src/lib/finance/calculations.ts) and orchestrated across individual server actions.

While core capabilities (such as reducing-balance schedules, add-on rate formulas, database array tracking, auto-marking past dues, and credit card limit sync) are fully functional in production, scaling Tenvi to support advanced Buy Now Pay Later (BNPL), automated savings deductions, and unified cross-module schedules requires **modular separation of concerns**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION & FORM LAYER                            │
│   src/hooks/useInstallmentForm.ts       src/components/Forms/*              │
│   - Form State Machine                  - CardInstallmentModal.tsx          │
│   - Rate Type Toggle                    - LiabilityModal.tsx                │
│   - Live Schedule Preview               - AmortizationScheduleModal.tsx     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┴──────────────────────────────────────┐
│                        BUSINESS LOGIC & ENGINE LAYER                        │
│                                                                             │
│  src/lib/finance/amortizationEngine.ts  src/lib/finance/dateResolver.ts     │
│  - calculateMonthlyAmortization()       - clampMonthEndDay()                │
│  - generateInstallmentSchedule()        - resolveFirstInstallmentDueDate()  │
│  - calculateInstallmentSummary()        - resolveInstallmentItemStatus()    │
│  - Past-due auto-marking                - Statement cutoff & billing cycles │
│                                                                             │
│  src/lib/finance/accountSync.ts                                             │
│  - calculateCardLimitImpact() (Regular Spends + Unpaid Installments)        │
│  - calculateSavingsImpact() (Auto-deduction & transaction recording)        │
│  - toggleInstallmentStatus() (Atomic schedule, balance & ledger sync)       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┴──────────────────────────────────────┐
│                        DATA PERSISTENCE & SSR LAYER                         │
│  - bili_liabilities (paid_installment_numbers integer[], current_balance)   │
│  - bili_loans & bili_loan_installments (is_paid boolean, due_date, amount) │
│  - bili_credit_cards (credit_limit, due_day, statement_day)                 │
│  - bili_savings_accounts (current_balance)                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Architectural Guarantees & Safeguards
1. **Zero-Regression Guarantee**: All existing imports from [`src/lib/finance/calculations.ts`](file:///Users/jeunciano/Workstation/Bili/src/lib/finance/calculations.ts) must remain functional via barrel re-exports. All 135+ existing unit tests must pass continuously without breaking signatures.
2. **Single Source of Truth**: Amortization schedules, monthly payment derivations, and payment statuses are calculated identically on both client (live form preview) and server (database insertion and mutations).
3. **Atomic Account Ledger Balance**: Marking an installment Paid or Unpaid immediately updates the liability principal, recalculates the credit card available credit limit, and records or reverts the corresponding payment ledger entries.

---

## 2. Current Implementation Status vs. Roadmap Matrix

The table below outlines what is already implemented in production versus what is planned for modular refactoring:

| Capability / Component | Current Production Status | Target Modular Location | Roadmap Phase |
| :--- | :--- | :--- | :--- |
| **Add-On & Annual Rate PMT Math** | Completed & Verified | `src/lib/finance/amortizationEngine.ts` | Phase 1 |
| **Reducing-Balance Schedule Generator** | Completed & Verified | `src/lib/finance/amortizationEngine.ts` | Phase 1 |
| **Auto-Mark Past Due as Paid (`dueDate < today`)** | Completed & Verified | `src/lib/finance/amortizationEngine.ts` | Phase 1 |
| **Paid/Unpaid Granular Tracking** | Completed & Verified | `src/lib/finance/amortizationEngine.ts` | Phase 1 |
| **Credit Card Due Day Inheritance** | Completed & Verified | `src/lib/finance/dateResolver.ts` | Phase 2 |
| **Month-End Clamping (Feb 28/29, Day 31)** | Completed & Verified | `src/lib/finance/dateResolver.ts` | Phase 2 |
| **Start Payment Month / BNPL Offset** | Completed & Verified | `src/lib/finance/dateResolver.ts` | Phase 2 |
| **Relative Status Resolution (`paid`, `unpaid`, `upcoming`)** | Completed & Verified | `src/lib/finance/dateResolver.ts` | Phase 2 |
| **Card Limit & Utilization Deduction** | Completed & Verified | `src/lib/finance/accountSync.ts` | Phase 3 |
| **Atomic Payment Status Toggle Action** | Completed & Verified | `src/lib/finance/accountSync.ts` | Phase 3 |
| **Savings Balance Deduction on Installment** | Completed & Verified | `src/lib/finance/accountSync.ts` | Phase 3 |
| **Shared Form Hook for Rate & Due Date Locking** | Completed & Verified | `src/hooks/useInstallmentForm.ts` | Phase 4 |
| **Interactive Schedule Modals with Paid Toggles** | Completed & Verified | UI Integration | Phase 4 & 5 |
| **Module-by-Module Refactoring & Cleanup** | Completed & Verified | Cross-Module | Phase 5 |

---

## Phase 1: The Core Computation Engine

### Objective
Isolate financial amortization mathematics, schedule generation, and status summarization into a pure, standalone engine with zero framework dependencies.

### Technical Tasks
- [x] **Task 1.1**: Create [`src/lib/finance/amortizationEngine.ts`](file:///Users/jeunciano/Workstation/Bili/src/lib/finance/amortizationEngine.ts).
  - Extract and standardize `calculateMonthlyAmortizationPayment()` (PMT formula: $P \times \frac{r(1+r)^n}{(1+r)^n - 1}$).
  - Implement `calculateMonthlyAmortization()` supporting:
    - `'monthly_addon'`: $\frac{P}{n} + (P \times r_{\text{month}})$
    - `'annual'`: Reducing-balance PMT
    - Manual override pass-through (`isAmortizationOverridden: true`).
- [x] **Task 1.2**: Implement `generateInstallmentSchedule()` in `amortizationEngine.ts`.
  - Accept principal, terms, rate type, interest rate, start date, first payment date, and due day.
  - Enforce zero penny drift on the final installment period ($P_{\text{final}} = \text{remainingPrincipal}$).
  - Compare every generated row's `dueDate` against `asOfDate` (defaulting to current date) to default past dates to `isPaid = true`.
  - Honor `paidInstallmentNumbers` overrides to allow past rows to remain unpaid or future rows to be paid in advance.
- [x] **Task 1.3**: Implement `calculateInstallmentSummary()`.
  - Calculate:
    - `totalPrincipal`, `totalInterest`, `totalRepayment`
    - `paidCount`, `unpaidCount`
    - `paidPrincipal`, `unpaidPrincipal` (`remainingUnpaidBalance`)
    - `creditLimitImpact`: strictly equal to `unpaidPrincipal`
- [x] **Task 1.4**: Establish zero-regression re-exports in [`src/lib/finance/calculations.ts`](file:///Users/jeunciano/Workstation/Bili/src/lib/finance/calculations.ts).
  - Export all types and functions from `amortizationEngine.ts` to preserve backwards compatibility for existing consumers.
- [x] **Task 1.5**: Create dedicated test suite [`src/lib/finance/amortizationEngine.test.ts`](file:///Users/jeunciano/Workstation/Bili/src/lib/finance/amortizationEngine.test.ts).
  - Port existing amortization tests and add edge cases (zero principal, 1 month term, 0% promo add-on, leap years).

### Deliverables
- `src/lib/finance/amortizationEngine.ts`
- `src/lib/finance/amortizationEngine.test.ts`
- Re-export bridges in `src/lib/finance/calculations.ts`

### Acceptance Criteria & Definition of Done
1. `calculateMonthlyAmortization()` returns exact monthly amortization for both annual reducing-balance and monthly add-on rates.
2. `generateInstallmentSchedule()` terminates with an exact `0.00` remaining balance without fractional penny discrepancy.
3. Schedule generation automatically flags items with `dueDate < today` as `isPaid: true` unless overridden by explicit array entries.
4. `vitest run src/lib/finance/amortizationEngine.test.ts` passes with 100% coverage on core amortization paths.

---

## Phase 2: Date Resolver & Centralized Utilities

### Objective
Consolidate calendar arithmetic, statement cycle calculations, leap year / February clamping, and schedule status resolution to eliminate inline date manipulation and date-drift bugs.

### Technical Tasks
- [x] **Task 2.1**: Create [`src/lib/finance/dateResolver.ts`](file:///Users/jeunciano/Workstation/Bili/src/lib/finance/dateResolver.ts).
  - Implement `clampMonthEndDay(year: number, month: number, targetDay: number): number`:
    - Handles days 28, 29, 30, and 31 dynamically based on `new Date(year, month + 1, 0).getDate()`.
  - Implement `formatISODate(date: Date): string` (`YYYY-MM-DD`).
- [x] **Task 2.2**: Implement `resolveFirstInstallmentDueDate()`.
  - Inputs: `transactionDate: string`, `dueDay: number`, `statementDay?: number | null`, `startMonthOffset?: number | null` (BNPL), `explicitFirstPaymentDate?: string | null`.
  - Rules:
    - If `explicitFirstPaymentDate` is provided, clamp its day to `dueDay`.
    - If `statementDay` is provided (Credit Card):
      - If transaction day > `statementDay`, billing statement starts next month.
      - Installment due date resolves to target due day after statement cutoff.
    - If standard loan: if transaction day > `dueDay`, first installment falls on next month's `dueDay`; otherwise, falls on current month's `dueDay`.
- [x] **Task 2.3**: Implement `resolveInstallmentItemStatus()`.
  - Categorize an installment row into:
    - `'paid'`: marked paid in `paid_installment_numbers` or `is_paid === true`.
    - `'overdue'`: not paid AND `dueDate < today`.
    - `'upcoming'`: not paid AND `dueDate >= today`.
- [x] **Task 2.4**: Create test suite [`src/lib/finance/dateResolver.test.ts`](file:///Users/jeunciano/Workstation/Bili/src/lib/finance/dateResolver.test.ts).
  - Verify leap year behavior (February 29, 2028 vs. February 28, 2026/2027).
  - Verify day 31 clamping across April, June, September, November.
  - Verify BNPL first payment date generation.

### Deliverables
- `src/lib/finance/dateResolver.ts`
- `src/lib/finance/dateResolver.test.ts`

### Acceptance Criteria & Definition of Done
1. No direct un-clamped string date increments remain in installment generation routines.
2. Clamping correctly handles card due dates set on days 28 through 31 without jumping into the subsequent month prematurely.
3. First due dates accurately reflect statement cutoff cycles and optional BNPL delay periods.

---

## Phase 3: Account Balance & Limit Ledger

### Objective
Centralize the financial state machine governing how installment schedules, payments, and status toggles impact linked Credit Cards, Savings Accounts, and general cashflow ledgers.

### Technical Tasks
- [x] **Task 3.1**: Create [`src/lib/finance/accountSync.ts`](file:///Users/jeunciano/Workstation/Bili/src/lib/finance/accountSync.ts).
  - Implement `calculateCardLimitImpact(card: CreditCard, transactions: Transaction[], liabilities: Liability[], loans: Loan[])`:
    - Credit Limit Utilization = Direct Card Transactions + Sum of all Unpaid Principal Balances from linked card liabilities/loans.
    - Available Credit Limit = $\max(0, \text{creditLimit} - \text{Total Utilized})$.
- [x] **Task 3.2**: Implement `calculateSavingsImpact()` for auto-linked loan amortizations.
  - Determine required cash outflow for upcoming installments in the current statement window.
  - Formulate payment deduction records for savings accounts when an installment is marked paid.
- [x] **Task 3.3**: Centralize server action toggle logic in `accountSync.ts` / server actions.
  - Refactor `toggleLiabilityInstallmentPaidAction` and `toggleLoanInstallmentPaidAction` to utilize shared synchronization logic:
    1. Update array `paid_installment_numbers` or child row `bili_loan_installments.is_paid`.
    2. Recalculate remaining unpaid principal balance.
    3. Update liability/loan status (`'paid_off'` / `'paid'` if all terms paid; otherwise `'active'` / `'partial'`).
    4. Automatically record or remove payment audit entry and transaction cashflow item.
    5. Invalidate Next.js cache paths (`/dashboard`, `/dashboard/cards`, `/dashboard/cards/[id]`, `/dashboard/properties`, `/dashboard/loans`).

### Deliverables
- `src/lib/finance/accountSync.ts`
- Integration with [`src/app/actions/liabilities.ts`](file:///Users/jeunciano/Workstation/Bili/src/app/actions/liabilities.ts) and [`src/app/actions/loans.ts`](file:///Users/jeunciano/Workstation/Bili/src/app/actions/loans.ts)
- `src/lib/finance/accountSync.test.ts`

### Acceptance Criteria & Definition of Done
1. Toggling an installment between Paid and Unpaid immediately updates the remaining principal balance on the liability.
2. Marking an installment as Paid releases that installment's principal portion back to the linked credit card's available credit limit in the same transaction.
3. Re-toggling a paid installment back to Unpaid re-locks that credit limit amount and removes the temporary payment cashflow log without data corruption.

---

## Phase 4: Shared Form Hook & UI Integration

### Objective
Unify the form state, validation, real-time schedule preview, and rate calculation across all installment creation and editing dialogs.

### Technical Tasks
- [x] **Task 4.1**: Create [`src/hooks/useInstallmentForm.ts`](file:///Users/jeunciano/Workstation/Bili/src/hooks/useInstallmentForm.ts).
  - Manage state for:
    - `principal` (total purchase or loan amount)
    - `termMonths` (1 to 360)
    - `interestRateType` (`'monthly_addon'` vs. `'annual'`)
    - `interestRate` (% value)
    - `monthlyAmortization` (auto-computed with manual override tracking)
    - `isAmortizationOverridden` (boolean)
    - `linkedAccountType` & `linkedAccountId` (Credit Card or Savings)
    - `transactionDate` & `firstPaymentDate`
    - `manualPaidNumbers` (temporary array of toggled terms during creation preview)
- [x] **Task 4.2**: Wire Credit Card Due Date Inheritance into `useInstallmentForm`.
  - When a user selects a credit card in the form:
    - Automatically lock the effective due day to `card.due_day`.
    - Auto-compute the next statement billing date and upcoming due date.
- [x] **Task 4.3**: Integrate live schedule preview into `useInstallmentForm`.
  - Compute schedule live as inputs change using `generateInstallmentSchedule()`.
  - Provide helper `togglePreviewTermPaid(termNumber: number)` so users can click rows in the modal preview to toggle initial paid state before submission.
- [x] **Task 4.4**: Update [`CardInstallmentModal.tsx`](file:///Users/jeunciano/Workstation/Bili/src/components/Forms/CardInstallmentModal.tsx) to consume `useInstallmentForm`.
- [x] **Task 4.5**: Update [`LiabilityModal.tsx`](file:///Users/jeunciano/Workstation/Bili/src/components/Forms/LiabilityModal.tsx) to consume `useInstallmentForm`.

### Deliverables
- `src/hooks/useInstallmentForm.ts`
- Refactored `src/components/Forms/CardInstallmentModal.tsx`
- Refactored `src/components/Forms/LiabilityModal.tsx`

### Acceptance Criteria & Definition of Done
1. Changing Principal, Term, or Rate automatically updates the Monthly Amortization input without page lag or flickering.
2. Typing a custom Monthly Amortization sets `isAmortizationOverridden: true` and preserves the custom amount across re-renders.
3. Selecting a credit card locks the payment due day to the card's due day automatically.
4. The live schedule preview shows past terms marked as Paid by default, and allows toggling before form submission.

---

## Phase 5: Module-by-Module Refactoring & Cleanup

### Objective
Audit and refactor every page and table displaying installment schedules across Tenvi to ensure 100% visual and behavioral consistency.

### Technical Tasks
- [x] **Task 5.1**: **Credit Cards Module (`/dashboard/cards/[id]`)**:
  - Audit Section 3 ("Active Installments & Financing Plans") in [`CardDetailsClient.tsx`](file:///Users/jeunciano/Workstation/Bili/src/app/dashboard/cards/%5Bid%5D/CardDetailsClient.tsx).
  - Verify term progress badge format (e.g., `4 OF 12 PAID`).
  - Verify that opening [`AmortizationScheduleModal.tsx`](file:///Users/jeunciano/Workstation/Bili/src/components/Forms/AmortizationScheduleModal.tsx) allows instant status toggling and immediately updates the card's available limit upon modal close.
- [x] **Task 5.2**: **Properties & Mortgages Module (`/dashboard/properties/[id]`, `/dashboard/properties`)**:
  - Automatically compute property Monthly Loan Amortization from active linked loan records (`bili_liabilities` & asset payables) in `calculatePropertyFinancials`.
  - Support multi-loan aggregation (properties with multiple mortgages/auto financing) and exclude paid-off loans.
  - Automatically synchronize computed amortization and primary due day into `bili_properties` via `syncPropertyLoanAmortization`.
  - Display auto-computed loan badge (`Auto ({N} loans)`) and individual loan breakdowns on property details card and portfolio view.
  - Provide auto-computed indicator and fallback sync in [`PropertyModal.tsx`](file:///Users/jeunciano/Workstation/Bili/src/components/Forms/PropertyModal.tsx).
  - Ensure terms progress displays accurately (`X of Y terms paid`).
  - Confirm `AmortizationScheduleModal` operates seamlessly with live server revalidation.
- [x] **Task 5.3**: **Loans & Receivables Module (`/dashboard/loans/[id]`, `/dashboard/receivables`)**:
  - Audit [`LoanDetailsClient.tsx`](file:///Users/jeunciano/Workstation/Bili/src/app/dashboard/loans/%5Bid%5D/LoanDetailsClient.tsx) and [`ReceivablesClient.tsx`](file:///Users/jeunciano/Workstation/Bili/src/app/dashboard/receivables/ReceivablesClient.tsx).
  - Verify `toggleLoanInstallmentPaidAction` correctly updates loan `balance_remaining` and updates any linked credit card limit.
- [x] **Task 5.4**: **Dashboard Summary Aggregation (`/dashboard`)**:
  - Verify that total liabilities and net worth reflect only the active remaining unpaid balances across all cards, properties, and loans.
- [x] **Task 5.5**: **Codebase Hygiene & Test Verification**:
  - Run `npm test` across all 21 test files to ensure all 172+ tests pass.
  - Run `npx tsc --noEmit` to guarantee 0 type errors.
  - Run `npm run build` to verify production Next.js build compilation.

### Deliverables
- Fully audited and aligned client views across Cards, Properties, Loans, and Receivables.
- Clean Next.js production build artifacts.

### Acceptance Criteria & Definition of Done
1. All modules that display or generate installment schedules utilize the unified status resolver and calculation engine.
2. No remaining hardcoded `is_paid: false` assignments in loan or liability generation paths.
3. Full test suite passes without skipped tests or regressions.
4. Production build (`npm run build`) completes with zero errors.

---

## 3. Project File Structure Reference

```
src/
├── app/
│   ├── actions/
│   │   ├── cards.ts             # createCardInstallmentAction, restore, delete
│   │   ├── liabilities.ts       # createLiabilityAction, toggleLiabilityInstallmentPaidAction
│   │   └── loans.ts             # createLoanAction, toggleLoanInstallmentPaidAction
│   └── dashboard/
│       ├── cards/[id]/CardDetailsClient.tsx
│       ├── properties/[id]/PropertyDetailsClient.tsx
│       ├── loans/[id]/LoanDetailsClient.tsx
│       └── receivables/ReceivablesClient.tsx
├── components/
│   └── Forms/
│       ├── AmortizationScheduleModal.tsx  # Shared interactive schedule viewer & toggle
│       ├── CardInstallmentModal.tsx       # Direct card installment purchase modal
│       └── LiabilityModal.tsx             # Mortgages and debt liability modal
├── hooks/
│   └── useInstallmentForm.ts             # [Phase 4] Unified form hook
├── lib/
│   └── finance/
│       ├── accountSync.ts                # [Phase 3] Balance, credit limit, savings ledger
│       ├── amortizationEngine.ts         # [Phase 1] Core financial PMT & schedule math
│       ├── calculations.ts               # Core finance calculations & backward-compat re-exports
│       ├── calculations.test.ts          # Comprehensive Vitest test suite
│       └── dateResolver.ts               # [Phase 2] Month-end clamping & cycle resolver
└── types/
    └── index.ts                          # Liability, Loan, AmortizationScheduleRow interfaces
```

---

## 4. Execution Guidance for Future Engineering Cycles

When picking up work on any phase in this roadmap:
1. **Never break existing function exports in `src/lib/finance/calculations.ts`**: Always re-export from new sub-modules (`amortizationEngine.ts`, `dateResolver.ts`, `accountSync.ts`).
2. **Execute tests before and after edits**: Proactively run `npm test` and `npx tsc --noEmit` to verify type safety and prevent regressions.
3. **Database consistency**: Any new tracking columns must be mirrored in `src/types/index.ts` and validated via Zod in `src/lib/validations/schemas.ts`.
