---
name: ui-ux-tester
description: >-
  Specialized UI/UX testing, visual overlap detection, and responsive design audit agent.
  Use this skill to audit mobile (375px), tablet (768px), and desktop (1024px+) layouts,
  detect overlapping elements, z-index conflicts, horizontal scroll bugs (overflow-x),
  unconstrained flex/grid containers, and verify mobile navigation and touch targets.
---

# UI/UX Testing & Responsiveness Agent

This agent skill provides an automated and methodical framework for auditing, detecting, and fixing UI/UX issues, visual overlaps, and responsiveness defects in the application.

## Core Responsibilities

1. **Visual Overlap Detection**: Catch collisions between fixed floating elements (e.g. mobile bottom nav, floating AI chat, floating action buttons) and modal backdrops, dialogs, or page content.
2. **Viewport Responsiveness**: Ensure pages adapt seamlessly across standard mobile (375px, 390px), tablet (768px, 820px), and desktop (1024px, 1440px) viewports.
3. **Z-Index Layering Integrity**: Enforce a strict z-index hierarchy across sticky headers, navigation bars, chat panels, modals, and global dialogs.
4. **Horizontal Overflow Prevention**: Eliminate `scrollWidth > clientWidth` defects that cause unwanted horizontal page wobbling on mobile browsers.
5. **Touch Target & Header Clearance**: Verify minimum 44×44px touch targets on mobile and ensure modal headers have clearance (`pr-10 sm:pr-12`) so text never runs under close buttons.

---

## Standard Z-Index Hierarchy

| Layer Name | Z-Index Class | Used By |
| :--- | :--- | :--- |
| **Base Content** | `z-0` to `z-10` | Cards, tables, charts, relative containers |
| **Sticky In-Page Bars** | `z-20` | Sticky filter rails, sub-headers |
| **Sidebar & Desktop Nav** | `z-30` | Left sidebar navigation |
| **Mobile Bottom Nav** | `z-40` | `MobileNav` fixed bottom bar |
| **Floating Triggers** | `z-40` | `TenviAIChat` floating pill (offset `bottom-20` on mobile) |
| **Floating Windows** | `z-50` | Open `TenviAIChat` dialog |
| **Modals & Drawers** | `z-[60]` / `z-[70]` | `LoanModal`, `TransactionModal`, `CreditCardModal`, etc. |
| **Global Dialogs & Toasts** | `z-[9999]` | `GlobalDialog` (confirms), `Sonner` toasts |

---

## Viewport Audit Matrix

When auditing or testing a page, verify against these viewport tiers:

- **Mobile Small (360px - 375px)**: iPhone SE, Android Compact. Check:
  - No horizontal scrolling on the root viewport (`overflow-x-hidden`).
  - Multi-column grids must fall back to `grid-cols-1` or `grid-cols-2`.
  - Floating triggers must use `bottom-20` to clear `MobileNav` (height ~64px).
  - Modal headers must have `pr-10` to avoid colliding with `absolute top-6 right-6` close buttons.
- **Mobile Standard (390px - 414px)**: iPhone 14/15/16 Pro, Samsung Galaxy S. Check:
  - Stat cards and balance values fit without splitting currency symbols (`₱`) across lines.
  - Filter bars with multiple chips use `overflow-x-auto no-scrollbar` or clean flex-wrap.
- **Tablet (768px - 820px)**: iPad Mini / Air. Check:
  - Transition from `MobileNav` to desktop `Sidebar` (breakpoint `md:`).
  - Two-column card grids display without awkward gaps or squished buttons.
- **Desktop (1024px+)**: Standard Laptop / Monitor. Check:
  - Full sidebar visible, main scroll container takes remaining viewport height.
  - Floating AI trigger moves to `bottom-6 right-6`.

---

## Automated Audit Command

Run the automated UI/UX scanner anytime using:

```bash
npm run test:ui
```

Or execute directly via Node:

```bash
node scripts/audit_ui.mjs
```

The script inspects all React components (`src/`) for:
- Fixed elements colliding with mobile bottom navigation.
- Modals missing header right padding for absolute close buttons.
- Z-index collisions between navigation, chat, and dialogs.
- Hardcoded multi-column grids missing mobile breakpoints (`grid-cols-3` or `4` without `sm:`).
- Fixed pixel widths breaking mobile viewports.

---

## Manual Verification Checklist

When building or modifying components:

1. [ ] **Mobile Clearance**: Does any fixed button sit at `bottom-6` without `sm:bottom-6`? (It will collide with `MobileNav`).
2. [ ] **Modal Close Button**: Does the modal header have `pr-10 sm:pr-12`? (Without it, titles collide with `X`).
3. [ ] **Safe Area Insets**: Does the mobile bottom navigation include `pb-[max(0.5rem,env(safe-area-inset-bottom))]`?
4. [ ] **Flex Truncation**: Does any flex child with `truncate` have `min-w-0` on its parent?
5. [ ] **Scrollbars**: Do inner scrollable containers have `.bili-scrollbar` and `overscroll-contain`?
6. [ ] **Table Responsiveness**: Are complex table columns wrapped in `overflow-x-auto` or adapted into cards on mobile?
