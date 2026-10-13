# Tenvi: Cards Page Redesign and shadcn/ui Adoption

Each issue below can be pasted into GitHub as is. Section 1 covers the shadcn/ui decisions, section 2 the epics, section 3 the issues with acceptance criteria, and section 4 the working conventions.

**Legend.** Priority: **P0** do first, **P1** next, **P2** polish. Effort: **S** under half a day, **M** 1-2 days, **L** 3+ days.

---

## 1. shadcn/ui Decisions

### 1.1 Why shadcn/ui
- Components are copied into `src/components/ui/`, so Tenvi owns the code and can enforce the no-border, no-gradient rules at the source.
- It is built on accessible primitives (focus management, keyboard support, ARIA), which covers most of the accessibility work.
- It fits the existing stack: Tailwind v4, React 19, `react-hook-form` + Zod, `sonner`, `lucide-react`.
- One consistent component set replaces the many hand-rolled modals, badges and cards.

> Verify install commands and component names against https://ui.shadcn.com/docs at implementation time. The CLI and the component list change between releases.

### 1.2 Borders policy (decision required, see TNV-003)
shadcn defaults ship with borders on Card, Input, Select, Dialog, Popover, Table and the outline Button. Tenvi bans decorative borders. Proposed policy:

| Element | Rule |
|---|---|
| Cards, panels, tables, lists, dialogs, popovers | No borders. Use tonal fill and shadow. |
| Dividers | No `Separator` lines or `divide-*`. Use spacing and tonal bands. |
| Inputs, selects, textareas | No border. Use a tonal fill (`bg-muted`) plus a 2px focus ring. The fill must be visibly distinct from the surface behind it. |
| Checkbox, radio, switch | Documented exception: keep a minimal outline in the unchecked state. WCAG 1.4.11 requires a 3:1 boundary for controls. |
| Focus | `outline`/`ring` on `:focus-visible` is allowed and required. |
| Gradients | Banned everywhere. |

### 1.3 Token mapping (`globals.css`)

| shadcn token | Tenvi value (light) | Purpose |
|---|---|---|
| `--background` | `#F6F7F9` | Page canvas |
| `--card` | `#FFFFFF` | Cards, dialogs |
| `--muted` / `--secondary` | `#F1F4F8` | Insets, inputs, chips |
| `--muted-foreground` | `#566074` | Secondary text (4.5:1 or better) |
| `--foreground` | `#0F172A` | Main text |
| `--primary` / `--primary-foreground` | `#0F172A` / `#FFFFFF` | Main buttons |
| `--destructive` | `#B42318` | Remove actions |
| `--ring` | `#2563EB` | Focus ring |
| `--border`, `--input` | Set to `transparent` | Prevents accidental borders |
| `--success` / `--warning` / `--danger` (+ `-foreground`, `-soft`) | New custom tokens | Status chips: money in, due soon, overdue |
| `--shadow-card`, `--shadow-lift` | Existing Tenvi shadows | Elevation |

Add dark-mode values for every token.

### 1.4 Component mapping

| Current (custom) | shadcn component |
|---|---|
| Modals (`TransactionModal`, `CreditCardModal`, `LoanModal`, `EditLoanModal`, `PropertyModal`, `SavingsModal`, `BillSplitModal`, `LoanPaymentModal`, `StatementUploadModal`) | `Dialog` on desktop, `Drawer` on mobile, wrapped in one `ResponsiveDialog` |
| Delete confirmations | `AlertDialog` |
| Kebab and row menus | `DropdownMenu` |
| `StatCard` | `Card` + small composition |
| `StatusBadge` | `Badge` with cva variants (`success`, `warning`, `danger`, `neutral`) |
| Progress bars | `Progress` (with color variants) |
| Toasts | `Sonner` wrapper (`sonner` is already installed) |
| Forms | `Form` or `Field` + `react-hook-form` + Zod |
| Selects, bank pickers | `Select`, `Command` + `Popover` (searchable bank list) |
| Date inputs | `Calendar` + `Popover` |
| Notification toggles | `Switch` |
| Settings tabs, timeframe filters, sort chips | `Tabs`, `ToggleGroup` |
| Statement cycle groups | `Collapsible` or `Accordion` |
| Loading | `Skeleton` |
| Tables (loan schedule, logs, staging) | `Table` (borderless variant) |
| Sidebar and mobile nav | `Sidebar` (plus `Sheet` for mobile) |
| AI chat and prompt library | `Sheet`, `ScrollArea`, `Textarea` |
| Overview charts | `Chart` (recharts wrapper) |
| Empty states | `Empty` (or a small custom composition) |
| Tooltips | `Tooltip` |
| Pagination | `Pagination` |

### 1.5 Install baseline (reference)
```bash
npx shadcn@latest init
npx shadcn@latest add button card badge input textarea label select checkbox switch \
  tabs toggle-group dialog alert-dialog drawer sheet dropdown-menu popover command \
  calendar table progress skeleton tooltip scroll-area collapsible accordion \
  form sonner sidebar chart breadcrumb pagination alert avatar
```

---

## 2. Epics and Milestones

| Epic | Scope | Milestone |
|---|---|---|
| E0 | shadcn foundation and guardrails | Sprint 1 |
| E1 | Quick fixes | Sprint 1 |
| E2 | Data and logic for cards | Sprint 1 |
| E3 | Cards page redesign | Sprint 1-2 |
| E4 | Add/Edit card form | Sprint 2 |
| E5 | Mobile and accessibility | Sprint 2-3 |
| E6 | Performance | Sprint 2 |
| E7 | Reminders and copy | Sprint 3 |
| E8 | Project-wide shadcn migration | Sprint 3-5 |
| E9 | QA and rollout | Continuous, final in Sprint 5 |

---

## 3. Issues

### E0. shadcn Foundation

#### TNV-001 Initialize shadcn/ui
`P0` `M` `epic:foundation` `area:ui`
**Description.** Set up shadcn/ui in the Tailwind v4 + Next.js App Router project.
**Tasks**
- [ ] Run `shadcn init` and commit `components.json`.
- [ ] Confirm the `cn()` helper at `src/lib/utils.ts` and path aliases (`@/components/ui`).
- [ ] Install the baseline components from section 1.5.
- [ ] Confirm `lucide-react` is the icon library in `components.json`.

**Acceptance criteria**
- [ ] `npm run build` and typecheck pass with `strict: true`.
- [ ] A demo route renders a Button, Card, Dialog and Select with no console errors.
- [ ] No existing page changes visually.

#### TNV-002 Map Tenvi design tokens to shadcn tokens
`P0` `M` `epic:foundation` `depends:TNV-001`
**Tasks**
- [ ] Define all tokens from section 1.3 in `globals.css` for light and dark.
- [ ] Add success, warning and danger tokens (`bg`, `fg`, `soft`).
- [ ] Keep the `.tenvi-*` and `.bili-*` classes working until TNV-044.

**Acceptance criteria**
- [ ] Muted text meets 4.5:1 against its background in light and dark (checked with a contrast tool).
- [ ] Status tokens meet 4.5:1 for text on their soft backgrounds.
- [ ] Dark mode follows `prefers-color-scheme` and renders correctly.

#### TNV-003 ADR: Borders policy and borderless restyle of shadcn primitives
`P0` `L` `epic:foundation` `depends:TNV-002`
**Description.** Record the borders policy from section 1.2 as an architecture decision, then remove default borders from every installed primitive.
**Tasks**
- [ ] Write `docs/adr/0001-borders-policy.md` and get product sign-off on the checkbox/radio/switch exception.
- [ ] Restyle each primitive: Card, Input, Textarea, Select trigger and content, Dialog, AlertDialog, Drawer, Sheet, Popover, DropdownMenu, Command, Table, Tabs, Button outline variant, Badge.
- [ ] Replace `Separator` usage with spacing, or style it as a tonal band.
- [ ] Add button variants: `primary`, `soft` (tonal), `ghost`, `destructive-soft`.
- [ ] Add Badge variants: `success`, `warning`, `danger`, `neutral`, each with an optional icon slot.
- [ ] Add Progress variants: `success`, `warning`, `danger`.
- [ ] Set a minimum height of 48px for default buttons and inputs, 40px for small.

**Acceptance criteria**
- [ ] A grep for `border`, `divide-` and `gradient` in `src/components/ui` returns only the documented exceptions.
- [ ] Every input is visually distinct from its surface and shows a 2px visible focus ring.
- [ ] A Storybook page or `/dev/ui` route shows every primitive in light and dark.

#### TNV-004 CI guard against borders and gradients
`P0` `S` `epic:foundation` `depends:TNV-003`
**Tasks**
- [ ] Add `scripts/check-design-rules.mjs` that scans `src/**/*.{ts,tsx,css}` for banned patterns: `\bborder(-[a-z0-9\[\]/#-]+)?\b` (except `border-0`, `border-transparent` and files on an allowlist), `divide-`, `gradient`.
- [ ] Add it to `package.json` scripts and the GitHub Actions workflow.
- [ ] Add an allowlist file with a justification per entry.

**Acceptance criteria**
- [ ] CI fails when a PR adds `border border-slate-200`.
- [ ] CI passes on `main` once the migration is finished (see TNV-044).

#### TNV-005 Replace toaster with shadcn Sonner wrapper
`P0` `S` `epic:foundation` `depends:TNV-003`
**Acceptance criteria**
- [ ] `ToasterProvider` uses the shadcn Sonner wrapper with Tenvi tokens.
- [ ] Success, error and "Undo" action toasts render without borders.
- [ ] Toasts are announced by screen readers.

#### TNV-006 Standard form pattern (react-hook-form + Zod + shadcn Form)
`P0` `M` `epic:foundation` `depends:TNV-003`
**Tasks**
- [ ] Create a reference form following the 5-step server action guard.
- [ ] Standardize plain-language error messages from Zod.
- [ ] Add a `MoneyInput` (peso prefix, grouping, numeric keyboard on mobile).
- [ ] Add a `DayOfMonthSelect` (1st to 31st).

**Acceptance criteria**
- [ ] One example form validates on blur and on submit with messages under each field.
- [ ] Submit buttons show a loading state and are disabled while pending.
- [ ] Documented in `docs/ui/forms.md`.

#### TNV-007 ResponsiveDialog wrapper
`P0` `M` `epic:foundation` `depends:TNV-003`
**Description.** One wrapper that renders a `Dialog` on desktop and a bottom `Drawer` on mobile, used by every modal in the app.
**Acceptance criteria**
- [ ] Switches at the `md` breakpoint without remounting form state.
- [ ] Focus is trapped, Esc closes, focus returns to the trigger.
- [ ] Content scrolls inside the dialog on short screens, with the action bar pinned.

---

### E1. Quick Fixes

#### TNV-008 Fix duplicated "Alerts & Settings" in the sidebar
`P0` `S` `epic:quick-fixes`
**Tasks**
- [ ] Find the cause in `Sidebar.tsx` (duplicated array items or a loop rendering extra entries).
- [ ] Remove the duplicates and add a unit test or story that checks each nav item appears once.

**Acceptance criteria**
- [ ] Sidebar shows each of the 9 items exactly once.
- [ ] Mobile nav matches.

#### TNV-009 Rename "Cards & Due Dates" to "Credit Cards"
`P0` `S` `epic:quick-fixes`
**Acceptance criteria**
- [ ] The label is updated in the sidebar, mobile nav, page title and metadata.

#### TNV-010 Remove "Load More Cards"
`P0` `S` `epic:quick-fixes`
**Acceptance criteria**
- [ ] All cards (up to 24) render at once. Beyond 24, shadcn `Pagination` appears.

---

### E2. Data and Logic

#### TNV-011 Statement balance data model
`P0` `M` `epic:data`
**Description.** Urgency should depend on what is owed, not on the due date alone.
**Tasks**
- [ ] Migration for `bili_card_statements` (`id`, `website_id`, `user_id`, `credit_card_id`, `cycle_end`, `due_date`, `billed_amount numeric(12,2)`, `minimum_due numeric(12,2)`, `paid_amount`, `paid_on`, `status`) with RLS, indexes, and a composite FK so a user cannot reference another user's card.
- [ ] Populate from `groupTransactionsByStatementDate` and from statement uploads.
- [ ] Update `types/index.ts` and Zod schemas.

**Acceptance criteria**
- [ ] A cross-user insert or read is rejected (RLS test).
- [ ] A card with a billed statement exposes `billed_amount` and `due_date` to the page.
- [ ] Migration runs cleanly on a fresh database.

#### TNV-012 "Mark as paid" server action
`P0` `M` `epic:data` `depends:TNV-011`
**Tasks**
- [ ] Add `markStatementPaidAction` using the 5-step guard.
- [ ] Support full and partial payment, with an optional paid date.
- [ ] Perform the update inside one transaction or RPC.
- [ ] Revalidate `/dashboard/cards` and `/dashboard/cards/[id]`.

**Acceptance criteria**
- [ ] Double-clicking does not create duplicate payments (idempotent).
- [ ] The tile and the "Pay these soon" panel update without a full reload.

#### TNV-013 `getCardUrgency()` helper and tests
`P0` `S` `epic:data` `depends:TNV-011`
**Description.** Add to `calculations.ts` and return `none | ok | soon | urgent | overdue`.
**Acceptance criteria**
- [ ] A card owing nothing returns `none`.
- [ ] 3 days or fewer returns `urgent`, 7 days or fewer returns `soon`, a past due date with an unpaid balance returns `overdue`.
- [ ] Vitest cases cover month-end clamping (day 29 to 31), due day earlier than statement day, and cutoff falling on today.

#### TNV-014 Usage level helper
`P0` `S` `epic:data`
**Acceptance criteria**
- [ ] `getUsageLevel(pct)` returns `healthy` (under 50), `high` (50-79) or `maxed` (80 and above) with a plain-language label, shared by the bar color and the text.
- [ ] Unit tests at the boundaries 49, 50, 79 and 80.

#### TNV-015 Single "today" helper in Asia/Manila
`P0` `S` `epic:data`
**Acceptance criteria**
- [ ] `getTodayManila()` is the only way date logic gets "today".
- [ ] Tests run with a mocked clock around midnight Manila time.
- [ ] No page uses a bare `new Date()` for countdowns.

#### TNV-016 SQL view or RPC for per-card used totals
`P1` `M` `epic:performance`
**Acceptance criteria**
- [ ] One query returns used amount, bought-for-others amount and last swipe date per card.
- [ ] The cards page no longer fetches all transactions.
- [ ] Totals match the existing client calculation for the 9 test cards.

---

### E3. Cards Page Redesign

#### TNV-017 Restructure the page layout
`P0` `M` `epic:cards-page` `depends:TNV-003`
**Tasks**
- [ ] Order: header, summary row, "Pay these soon", "Best card today", toolbar, card grid.
- [ ] Container `max-w-6xl`. Grid of 1 column on mobile, 2 on `md`, 3 on `xl`.
- [ ] Server Component computes data and passes plain props to `CardsClient`.

**Acceptance criteria**
- [ ] Matches the approved prototype at 360, 768 and 1280px.
- [ ] No horizontal scroll at 360px or at 200% zoom.

#### TNV-018 Page header
`P0` `S` `epic:cards-page`
**Acceptance criteria**
- [ ] Title "My Credit Cards", subtitle in plain language, "Reminders" (soft button) and "Add a card" (primary).
- [ ] Buttons are at least 48px tall and wrap below the title on mobile.

#### TNV-019 Summary row (3 `Card` tiles)
`P0` `M` `epic:cards-page` `depends:TNV-013`
**Tasks**
- [ ] "You can still spend" with a `Progress` bar and total limit.
- [ ] "Used so far" with the "bought for others" sub-line.
- [ ] "Next payment": the nearest due card that has a balance, with date and countdown.

**Acceptance criteria**
- [ ] Totals equal the sum of the card tiles.
- [ ] When nothing is owed, the third tile reads "Nothing to pay".

#### TNV-020 "Pay these soon" panel
`P0` `M` `epic:cards-page` `depends:TNV-013`
**Acceptance criteria**
- [ ] Lists cards with a balance due within 7 days, soonest first, each with date, countdown and amount.
- [ ] Includes a "Mark as paid" action (TNV-012).
- [ ] When the list is empty, a green "You're all caught up" message appears.
- [ ] The panel is announced politely to screen readers when it changes.

#### TNV-021 Card tile component
`P0` `L` `epic:cards-page` `depends:TNV-003, TNV-013, TNV-014`
**Tasks**
- [ ] Build `CreditCardTile` using `Card`, `Badge`, `Progress` and `Button`.
- [ ] Order: chip, bank, name, menu, status badge, money block, dates box, action.
- [ ] Status badge always shows icon plus text. Grey state: "Nothing to pay right now".
- [ ] Headline "₱X left to spend", usage bar, "Used ₱X of ₱Y", percent and word label.
- [ ] Show "Includes ₱X you bought for others" only when above zero, linking to the loans view.
- [ ] Dates box: "Bill is made: 15th of each month", "Pay by: 1st of each month".
- [ ] Whole pesos on the tile, exact centavos on detail pages.
- [ ] Whole tile is a single link target (stretched link) with no nested interactive elements, except the menu.

**Acceptance criteria**
- [ ] Renders correctly for 0%, 33%, 55% and 85% usage, long bank names, and zero credit limit.
- [ ] Status is understandable in grayscale.
- [ ] Keyboard: Tab reaches the tile link and the menu button separately.

#### TNV-022 Tile menu, remove with confirmation and undo
`P0` `M` `epic:cards-page` `depends:TNV-021`
**Tasks**
- [ ] `DropdownMenu` with "Edit card" and "Remove card".
- [ ] `AlertDialog`: "Remove this card? Your purchases stay saved."
- [ ] Soft delete (`deleted_at`), with a Sonner toast offering "Undo" for 8 seconds.

**Acceptance criteria**
- [ ] Menu opens with Enter or Space, closes with Esc, and focus returns to the trigger.
- [ ] Undo restores the card and its links to transactions and loans.
- [ ] Removed cards no longer count toward totals.

#### TNV-023 "Best card to use today" panel
`P1` `M` `epic:cards-page`
**Acceptance criteria**
- [ ] Shows the card, last 4, a plain sentence ("Anything you buy today goes on your Nov 6 bill, which you pay by Nov 30"), and a large "days to pay" number.
- [ ] "Add a purchase" opens `TransactionModal` with the card preselected.
- [ ] A "Tip" line names cards that close their bill within 2 days.
- [ ] "See all cards ranked" is a `Collapsible` list with days to pay.
- [ ] Cards without available credit are excluded.

#### TNV-024 Toolbar: search, bank filter, sort
`P1` `M` `epic:cards-page`
**Tasks**
- [ ] Search input (bank, name, last 4), debounced about 200ms.
- [ ] `Select` for bank.
- [ ] `ToggleGroup` for sort: "Pay date" (default), "Most used", "Most left".
- [ ] Result count and a clear-filters action.

**Acceptance criteria**
- [ ] Result count changes are announced via `aria-live="polite"`.
- [ ] Empty results show "No cards match" with a clear-filters button.

#### TNV-025 URL state for search, filter and sort
`P1` `S` `epic:cards-page` `depends:TNV-024`
**Acceptance criteria**
- [ ] `?q=`, `?bank=` and `?sort=` restore the same view after refresh and when shared.
- [ ] Invalid values fall back to defaults without errors.

#### TNV-026 Empty, loading and error states
`P1` `S` `epic:cards-page`
**Acceptance criteria**
- [ ] First-run state: short explanation and a large "Add your first card" button.
- [ ] `loading.tsx` shows `Skeleton` versions of the summary and tiles with no layout shift.
- [ ] `error.tsx` offers a friendly message and a "Try again" button.

---

### E4. Add / Edit Card Form

#### TNV-027 Rebuild `CreditCardModal` with shadcn
`P1` `M` `epic:card-form` `depends:TNV-006, TNV-007`
**Tasks**
- [ ] Use `ResponsiveDialog`, `Form`, `Command` bank picker, `DayOfMonthSelect` and `MoneyInput`.
- [ ] Fields: bank, nickname, last 4, limit, "Bill is made on", "Pay by".
- [ ] Helper text "Find these on your monthly statement" with a "Where do I find this?" popover.
- [ ] Live preview of the card chip and tile.
- [ ] Color picker behind a "Customize color" `Collapsible`, with 8 presets visible.

**Acceptance criteria**
- [ ] Inline plain-language errors ("Pay-by day should come after the bill day").
- [ ] Last 4 accepts exactly 4 digits and never stores a full card number.
- [ ] Add and edit both work, with a success toast and the grid updating without a manual refresh.

---

### E5. Mobile and Accessibility

#### TNV-028 Mobile layout and nav collisions
`P1` `M` `epic:mobile`
**Acceptance criteria**
- [ ] One-column layout with 16px side padding.
- [ ] The last tile is never hidden behind the bottom nav or the Tenvi Assistant pill (bottom padding and safe-area insets).
- [ ] The assistant trigger sits above the bottom nav.
- [ ] Toolbar stacks, and sort chips scroll horizontally if needed.
- [ ] Touch targets are at least 44px, and no action is hover-only.

#### TNV-029 Accessibility pass for the cards page
`P1` `M` `epic:a11y`
**Acceptance criteria**
- [ ] axe and Lighthouse report zero critical or serious issues.
- [ ] All icon-only buttons have an `aria-label`.
- [ ] Progress bars expose value and label.
- [ ] Complete keyboard path: add card, search, sort, open menu, remove, undo.
- [ ] `prefers-reduced-motion` disables transitions.
- [ ] Works at 200% zoom and with a screen reader (VoiceOver or NVDA spot check).

---

### E6. Performance

#### TNV-030 Compute on the server, memoize on the client
`P1` `S` `epic:performance` `depends:TNV-016`
**Acceptance criteria**
- [ ] Urgency, ranking and totals are computed in the Server Component.
- [ ] Filtering and sorting only run on already-loaded tile props.
- [ ] `CreditCardModal` is lazy-loaded.
- [ ] Largest Contentful Paint is under 2.5s on a mid-range phone profile.

---

### E7. Reminders and Copy

#### TNV-031 Reminders integration
`P2` `M` `epic:reminders`
**Acceptance criteria**
- [ ] "Reminders" opens settings with the cards tab preselected.
- [ ] Per-card reminder toggle (`Switch`) in the tile menu, stored per card.
- [ ] The tile shows "Reminder on" or "Reminder off".

#### TNV-032 Plain-language copy sweep
`P2` `S` `epic:copy`
**Tasks**
- [ ] Apply this dictionary and update section 5.3 of the project plan.

| Current | Replace with |
|---|---|
| Statement Cutoff | Bill is made |
| Payment Due Day | Pay by |
| Float / Runway | Days to pay |
| Spending Power | Left to spend |
| Swiped for Others | Bought for others |
| Zero active card balance | Nothing to pay right now |

**Acceptance criteria**
- [ ] No old terms remain in cards, tooltips, toasts, AI assistant replies or email templates.

---

### E8. Project-wide shadcn Migration

Rule for every migration issue: replace hand-rolled UI with shadcn components, keep behavior identical, and remove banned borders and gradients. Each issue ends with a visual check against a before screenshot.

#### TNV-033 Navigation: shadcn `Sidebar`
`P1` `L` `epic:migration` `depends:TNV-003, TNV-008`
**Tasks**
- [ ] Replace `Sidebar.tsx` and `MobileNav.tsx` with the shadcn `Sidebar` (collapsible on desktop, `Sheet` on mobile).
- [ ] Preserve the pinned sidebar and the independently scrolling main area (8.29).
- [ ] Keep the user card and Log Out at the bottom.

**Acceptance criteria**
- [ ] Active item is clear via fill and `aria-current`.
- [ ] Sidebar state persists across navigation.
- [ ] Mobile bottom navigation still has the 5 most-used destinations.

#### TNV-034 Overview dashboard
`P1` `L` `epic:migration` `depends:TNV-003`
**Tasks**
- [ ] `Card` for all metric tiles, `ToggleGroup` for the timeframe selector, `Badge` for statuses.
- [ ] Replace the bespoke SVG chart with shadcn `Chart` (recharts), including accessible tooltips and a text summary.
- [ ] Reuse the new "Best card" and "Pay these soon" components.

**Acceptance criteria**
- [ ] Numbers identical to before for the same timeframe.
- [ ] Charts have an accessible text alternative and readable colors in dark mode.

#### TNV-035 Transactions module
`P1` `L` `epic:migration` `depends:TNV-007`
**Tasks**
- [ ] `TransactionModal` to `ResponsiveDialog` + `Form`, with `ToggleGroup` for Money In and Money Out, `Select` or `Command` for category, and `Calendar` + `Popover` for the date.
- [ ] `TransactionsClient` list with `Badge` links for loan, card and savings.
- [ ] Filter pills to `ToggleGroup`.

**Acceptance criteria**
- [ ] Future-dated rows still excluded and newest first (8.32).
- [ ] The Money Out and Money In toggle has 48px targets and a clear selected state.

#### TNV-036 Loans and installments
`P1` `L` `epic:migration`
**Tasks**
- [ ] `LoanModal`, `EditLoanModal`, `LoanPaymentModal` to `ResponsiveDialog` + `Form`.
- [ ] Installment schedule to borderless `Table` with `Badge` statuses and a "Mark as paid" button.
- [ ] Reconfigure drawer to `Sheet`.

**Acceptance criteria**
- [ ] A 24-month schedule shows all 24 rows, with the table scrolling inside its own container on mobile.
- [ ] Optimistic mark-as-paid and undo still work.

#### TNV-037 Bill splits
`P2` `M` `epic:migration`
**Acceptance criteria**
- [ ] `BillSplitModal` uses `Form`, a `Command` multi-select for friends and `Switch` or `Checkbox` for paid state.
- [ ] Shares always sum to the total (existing tests still pass).

#### TNV-038 Savings and cash
`P2` `M` `epic:migration`
**Acceptance criteria**
- [ ] `SavingsModal` and the quick deposit/withdraw/adjust modal use `ResponsiveDialog` + `Form`.
- [ ] The connected transactions ledger uses `Collapsible` and `Table`.

#### TNV-039 Properties and assets
`P2` `M` `epic:migration`
**Acceptance criteria**
- [ ] `PropertyModal` and `PropertyTransactionModal` migrated.
- [ ] Asset cards use `Card` and `Badge`, and obligation alerts use `Alert`.

#### TNV-040 Receivables hub
`P2` `M` `epic:migration`
**Acceptance criteria**
- [ ] `Tabs` for By Person and Timeline.
- [ ] Reminder dialog migrated to `ResponsiveDialog`.
- [ ] The aging bar uses tonal segments with a text legend.

#### TNV-041 Settings and notifications
`P1` `L` `epic:migration`
**Tasks**
- [ ] Settings tabs to `Tabs` (Settings, Templates, Logs, AI).
- [ ] Toggles to `Switch`, templates editor to `Textarea` and `Input` with variable chips as `Button` (soft), logs to `Table` with search and "Load more".
- [ ] Remove any exposed secrets from the UI (see the security notes in the gap analysis).

**Acceptance criteria**
- [ ] Search is debounced at 280ms and the log pagination behavior is unchanged.
- [ ] Every control is labelled and keyboard operable.

#### TNV-042 Statement upload modal
`P1` `L` `epic:migration`
**Tasks**
- [ ] `ResponsiveDialog` with a two-step flow, `Tabs` for upload and paste, `Checkbox` rows in a `Table`, `Badge` for duplicate flags.
- [ ] Progress and status via `Progress` and `Alert`.

**Acceptance criteria**
- [ ] Duplicate rows remain unselected by default, with their explanation visible.
- [ ] Select all and Deselect all work with the keyboard.

#### TNV-043 AI assistant chat
`P1` `L` `epic:migration`
**Tasks**
- [ ] Chat window to `Sheet` (side on desktop, full height on mobile) with `ScrollArea` and `Textarea`.
- [ ] Prompt library to a nested `Sheet` or `Dialog`, with `ToggleGroup` category pills.
- [ ] Restyle `MarkdownMessage` so tables, blockquotes and code blocks follow the no-border rule (the current spec uses borders).

**Acceptance criteria**
- [ ] No borders in rendered markdown.
- [ ] Focus moves into the chat on open and returns to the trigger on close.
- [ ] Quick-reply chips are reachable by keyboard.

#### TNV-044 Auth pages and landing page
`P2` `M` `epic:migration`
**Acceptance criteria**
- [ ] Login and register use `Card` + `Form` with inline errors.
- [ ] The landing page uses shadcn `Button`, `Card` and `Badge`, with no gradients.

#### TNV-045 Remove legacy styles and enable the strict guard
`P1` `M` `epic:migration` `depends:TNV-033 to TNV-044`
**Tasks**
- [ ] Delete `.bili-*` and `.tenvi-*` utility classes and the custom `StatCard`, `StatusBadge` and `EmptyState` if fully replaced.
- [ ] Empty the design-rules allowlist except documented exceptions.

**Acceptance criteria**
- [ ] `npm run check:design` passes with no allowlisted borders outside checkbox, radio and switch.
- [ ] Bundle size is no larger than before the migration.

---

### E9. QA and Rollout

#### TNV-046 Unit tests for card logic
`P0` `M` `epic:qa`
**Acceptance criteria**
- [ ] Vitest covers urgency, float, usage level, month-end clamping, sorting and the Manila date helper.
- [ ] Includes property-based tests that shares and schedules always sum to the total.

#### TNV-047 Playwright end-to-end tests
`P1` `M` `epic:qa`
**Acceptance criteria**
- [ ] Flows covered: add card, search, sort, filter by bank, remove with undo, mark as paid, and "Add a purchase" from the best-card panel.
- [ ] Runs in GitHub Actions on every PR.

#### TNV-048 Visual regression and responsive checks
`P1` `S` `epic:qa`
**Acceptance criteria**
- [ ] Playwright screenshots at 360, 768 and 1280px in light and dark for the cards page and each migrated module.
- [ ] A diff over the agreed threshold blocks the PR.

#### TNV-049 Usability test with non-technical users
`P1` `M` `epic:qa`
**Description.** Test with 5 target users on a phone.
**Tasks**
- [ ] Tasks: find the next bill to pay, find the best card to use today, add a card, remove a card and undo.
- [ ] Record completion, time and confusion points.

**Acceptance criteria**
- [ ] At least 4 of 5 users complete each task unaided.
- [ ] Findings are filed as follow-up issues.

#### TNV-050 Feature flag, analytics and rollout
`P1` `S` `epic:qa`
**Acceptance criteria**
- [ ] New cards page behind a flag, enabled for staff first and then for everyone.
- [ ] Events tracked: `cards_view`, `best_card_add_purchase`, `card_view_bills`, `card_remove_undo`, `card_mark_paid`.
- [ ] A rollback plan is documented.

---

## 4. Conventions

**Labels.** `epic:*`, `area:ui|data|a11y|perf|qa`, `P0|P1|P2`, `size:S|M|L`.

**Definition of done (all issues)**
- [ ] Typecheck, lint, unit tests and `check:design` pass.
- [ ] Verified at 360, 768 and 1280px in light and dark.
- [ ] Keyboard path verified, with no new axe violations.
- [ ] Money uses `numeric(12,2)` and the facade helpers. No floats.
- [ ] Server actions follow the 5-step guard.
- [ ] Copy follows the plain-language dictionary.
- [ ] Screenshots attached to the PR.

**Suggested sprints**
1. **Sprint 1:** E0, E1, E2 (TNV-001 to TNV-015) and the start of E3.
2. **Sprint 2:** the rest of E3 (TNV-017 to TNV-026), E4, E6.
3. **Sprint 3:** E5, E7, and the migration of navigation, Overview and Settings (TNV-033, 034, 041).
4. **Sprint 4:** Transactions, Loans, Statement upload, AI chat (TNV-035, 036, 042, 043).
5. **Sprint 5:** the remaining migrations, TNV-045 cleanup, usability test, rollout (TNV-037 to 040, 044, 045, 049, 050).
