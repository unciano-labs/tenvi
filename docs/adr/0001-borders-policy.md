# ADR 0001: Borders and Gradients Policy

- **Status**: Accepted
- **Date**: 2026-10-09
- **Deciders**: Tenvi Architecture & Design Team
- **Related Issues**: TNV-003, TNV-004

---

## Context and Problem Statement

Modern finance interfaces often suffer from visual clutter caused by decorative borders, harsh dividing lines (`border-slate-200`, `divide-y`), and gradient cards (`bg-gradient-to-r`). For users managing complex personal wealth, debt amortization, and shared loans, visual fatigue and low cognitive clarity represent significant product risks.

Default shadcn/ui components ship with decorative borders on `Card`, `Input`, `Select`, `Dialog`, `Popover`, `Table`, and outline buttons. Tenvi enforces a strict **anti-AI, organic, human-friendly design system** where separation and elevation must be achieved through subtle tonal contrast and soft shadows rather than hard decorative strokes or artificial gradients.

---

## Decision Drivers

1. **Cognitive Calm**: Clean surfaces that prioritize financial numbers and actionable insights over visual noise.
2. **Accessibility & WCAG 2.1 / 2.2**:
   - Contrast must not depend on thin, low-contrast 1px border lines.
   - Text and interactive controls must meet WCAG AA (4.5:1 for normal text, 3:1 for graphical objects and user interface components per WCAG 1.4.11).
3. **Consistency**: A single rule enforced across all modules (Cards, Loans, Receivables, Transactions, Splits, Settings).
4. **Automated Enforcement**: Design rules must be verified via CI script (`scripts/check-design-rules.mjs`) to eliminate human regression.

---

## Considered Options

1. **Option A: Keep shadcn default borders** (Rejected — violates core Tenvi design tenets).
2. **Option B: Use border classes everywhere with light gray colors** (Rejected — creates boxed-in, dated aesthetic and visual friction).
3. **Option C: Total ban on decorative borders and gradients with documented accessibility exceptions** (Selected).

---

## Decision Outcome: The Tenvi Borders & Gradients Policy

### 1. General Rules

| Element Category | Tenvi Rule | Implementation Detail |
|---|---|---|
| **Cards, Panels, Lists, Popovers, Dialogs** | **No decorative borders.** | Use pure solid background (`bg-card`, `bg-surface`) with elevation shadows (`shadow-card`, `shadow-lift`). |
| **Dividers & Separators** | **No `Separator` lines or `divide-*`.** | Use organic spacing (`gap-*`, `space-y-*`) or subtle tonal bands (`bg-muted/60 h-1 rounded-full`). |
| **Inputs, Textareas, Select Triggers** | **No borders.** | Use soft tonal well background (`bg-muted`), 16px minimum font size on mobile to prevent iOS zoom, and a distinct 2px `:focus-visible` ring (`ring-2 ring-ring`). |
| **Gradients** | **Strictly banned everywhere.** | No `bg-gradient-*`, no gradient text, no gradient borders. Solid curated hex tokens only. |

### 2. Documented Accessibility Exceptions (WCAG 1.4.11)

Per **WCAG 2.1 Criterion 1.4.11 Non-text Contrast**, visual boundaries of user interface components (such as unchecked checkboxes, radio buttons, and switch thumbs) must maintain at least a **3:1 contrast ratio** against adjacent surfaces:

- **Checkbox**: Minimal 1px neutral boundary (`border-muted-foreground/30` or `ring-1 ring-muted-foreground/30`) in unchecked state; solid fill with checkmark when checked.
- **Switch**: Subtle perimeter outline on the track when inactive to guarantee perception across varying display brightness levels.
- **Focus Rings**: `outline` or `ring` on `:focus-visible` is **allowed and required** across all interactive elements (`outline-2 outline-ring outline-offset-2`).

### 3. Sizing Standards
- Default buttons and inputs: **Minimum height of 48px** (`min-h-12` or `h-12`) to ensure comfortable touch target compliance (WCAG 2.5.5 / 2.5.8).
- Compact/small variants: **Minimum height of 40px** (`min-h-10` or `h-10`).

---

## Consequences

### Positive
- Unified, premium aesthetic across all Tenvi views.
- High visual legibility for senior and non-technical users.
- Automated CI gating prevents pull requests from introducing accidental borders or gradients.

### Negative / Trade-offs
- shadcn/ui components copied into `src/components/ui/` must have their default border classes stripped or converted to borderless tonal variants.
- Developers must rely on spacing and tonal contrast rather than dividing lines.
