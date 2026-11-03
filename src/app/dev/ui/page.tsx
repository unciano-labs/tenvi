"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
} from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReferenceCardForm } from "@/components/Forms/ReferenceCardForm";
import {
  ThemeToggle,
  ThemeQuickToggle,
  ThemeSegmentedToggle,
} from "@/components/ui/theme-toggle";
import { CardDetailsClient } from "@/app/dashboard/cards/[id]/CardDetailsClient";
import { TransactionModal, ParsedCardItem } from "@/components/Forms/TransactionModal";
import { CreditCard, Transaction, Category, Liability } from "@/types";

const mockCard: CreditCard = {
  id: "test-card-1",
  website_id: "65d4f86e-1829-417a-981f-bc7aad7bc953",
  user_id: "user-1",
  name: "Visa Platinum",
  bank_name: "BDO",
  last_4: "8812",
  credit_limit: 150000,
  statement_day: 15,
  due_day: 5,
  color_theme: "navy",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};

const mockCategories: Category[] = [
  { id: "cat-1", name: "Groceries", kind: "expense", icon: "shopping-cart", color: "#10b981", is_default: true, user_id: "user-1", website_id: "65d4f86e-1829-417a-981f-bc7aad7bc953", created_at: "2026-01-01" },
  { id: "cat-2", name: "Dining", kind: "expense", icon: "coffee", color: "#f59e0b", is_default: true, user_id: "user-1", website_id: "65d4f86e-1829-417a-981f-bc7aad7bc953", created_at: "2026-01-01" },
  { id: "cat-3", name: "Shopping", kind: "expense", icon: "shopping-bag", color: "#3b82f6", is_default: true, user_id: "user-1", website_id: "65d4f86e-1829-417a-981f-bc7aad7bc953", created_at: "2026-01-01" },
  { id: "cat-4", name: "Transportation", kind: "expense", icon: "car", color: "#8b5cf6", is_default: true, user_id: "user-1", website_id: "65d4f86e-1829-417a-981f-bc7aad7bc953", created_at: "2026-01-01" },
];

const mockTransactions: Transaction[] = [
  {
    id: "tx-nov-1",
    website_id: "65d4f86e-1829-417a-981f-bc7aad7bc953",
    user_id: "user-1",
    credit_card_id: "test-card-1",
    payment_method: "credit_card",
    amount: 4500,
    kind: "expense",
    note: "Rustan's Supermarket Groceries",
    occurred_on: "2026-11-02",
    created_at: "2026-11-02T10:00:00Z",
    category: mockCategories[0],
  },
  {
    id: "tx-nov-2",
    website_id: "65d4f86e-1829-417a-981f-bc7aad7bc953",
    user_id: "user-1",
    credit_card_id: "test-card-1",
    payment_method: "credit_card",
    amount: 1250,
    kind: "expense",
    note: "Starbucks Reserve Podium",
    occurred_on: "2026-10-25",
    created_at: "2026-10-25T14:30:00Z",
    category: mockCategories[1],
  },
  {
    id: "tx-oct-1",
    website_id: "65d4f86e-1829-417a-981f-bc7aad7bc953",
    user_id: "user-1",
    credit_card_id: "test-card-1",
    payment_method: "credit_card",
    amount: 18500,
    kind: "expense",
    note: "Power Mac Center AirPods Pro",
    occurred_on: "2026-10-10",
    created_at: "2026-10-10T16:00:00Z",
    category: mockCategories[2],
  },
  {
    id: "tx-oct-duplicate-loan",
    website_id: "65d4f86e-1829-417a-981f-bc7aad7bc953",
    user_id: "user-1",
    credit_card_id: "test-card-1",
    payment_method: "credit_card",
    amount: 6500,
    kind: "expense",
    note: "Iphone 17 Pro - (01/12) Duplicate Swipe",
    occurred_on: "2026-10-10",
    created_at: "2026-10-10T15:00:00Z",
    loan_id: "lib-iphone-17",
    category: mockCategories[2],
  },
  {
    id: "tx-sep-1",
    website_id: "65d4f86e-1829-417a-981f-bc7aad7bc953",
    user_id: "user-1",
    credit_card_id: "test-card-1",
    payment_method: "credit_card",
    amount: 6200,
    kind: "expense",
    note: "Shell Gas Station Full Tank",
    occurred_on: "2026-09-08",
    created_at: "2026-09-08T09:15:00Z",
    category: mockCategories[3],
  },
];

const mockLinkedLiabilities: Liability[] = [
  {
    id: "lib-iphone-17",
    website_id: "65d4f86e-1829-417a-981f-bc7aad7bc953",
    user_id: "user-1",
    credit_card_id: "test-card-1",
    name: "Iphone 17 Pro (Mine)",
    liability_type: "credit_card_installment",
    lender_name: "Power Mac Center 0% Installment",
    original_principal: 78000,
    current_principal_balance: 65000,
    monthly_payment: 6500,
    interest_rate: 0,
    annual_interest_rate: 0,
    term_months: 12,
    first_payment_date: "2026-11-01",
    due_day: 1,
    status: "active",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  },
];

const sampleMultiParsedItems: ParsedCardItem[] = [
  {
    id: "tx-demo-1",
    merchant: "Jollibee Galleria",
    amount: "450.50",
    date: "2026-11-04",
    categoryId: "cat-1",
    paymentMethod: "credit_card",
    creditCardId: "test-card-1",
    savingsId: "",
    propertyId: "",
    itemsSummary: "2pc Chickenjoy, Peach Mango Pie",
    status: "idle",
  },
  {
    id: "tx-demo-2",
    merchant: "Grab Transport",
    amount: "", // intentionally missing amount to test user input
    date: "2026-11-04",
    categoryId: "cat-2",
    paymentMethod: "credit_card",
    creditCardId: "test-card-1",
    savingsId: "",
    propertyId: "",
    itemsSummary: "Ride to BGC",
    status: "idle",
  },
  {
    id: "tx-demo-3",
    merchant: "Caltex Fuel Station",
    amount: "1500.00",
    date: "2026-11-03",
    categoryId: "cat-4",
    paymentMethod: "credit_card",
    creditCardId: "test-card-1",
    savingsId: "",
    propertyId: "",
    itemsSummary: "Techron Unleaded Full Tank",
    status: "idle",
  },
];

export default function DevUiDemoPage() {
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [switchActive, setSwitchActive] = useState<boolean>(false);
  const [checkboxChecked, setCheckboxChecked] = useState<boolean>(false);
  const [isMultiTxModalOpen, setIsMultiTxModalOpen] = useState<boolean>(false);
  const [multiTxModalItems, setMultiTxModalItems] = useState<ParsedCardItem[] | undefined>(undefined);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 sm:p-10 max-w-5xl mx-auto space-y-10">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="px-3 py-1">TNV-001 & TNV-002 Verified</Badge>
            <span className="text-sm text-muted-foreground">Design Token & Primitive Demo</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Tenvi UI Component Showcase</h1>
          <p className="text-muted-foreground text-base">
            Validating shadcn/ui primitives under Tenvi&apos;s borderless, soft-tonal design system.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-card p-1.5 rounded-2xl shadow-xs">
          <ThemeToggle />
          <ThemeQuickToggle />
        </div>
      </header>

      {/* Theme Controls Section */}
      <section className="space-y-4 p-5 rounded-3xl bg-card shadow-card">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Theme & Appearance Controls</h2>
          <p className="text-sm text-muted-foreground">
            Borderless, solid tonal light and dark theme switching with system detection.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center pt-2">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Segmented Control</span>
            <ThemeSegmentedToggle />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Dropdown Menu</span>
            <div>
              <ThemeToggle />
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">1-Click Quick Toggle</span>
            <div>
              <ThemeQuickToggle />
            </div>
          </div>
        </div>
      </section>

      {/* Buttons & Actions */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="default">Primary Action</Button>
          <Button variant="secondary">Secondary Action</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="outline">Outline</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* Badges & Status Chips */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Badges & Statuses</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-soft text-success-soft-foreground">
            Money In (Success)
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-soft text-warning-soft-foreground">
            Due Soon (Warning)
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-soft text-danger-soft-foreground">
            Overdue (Danger)
          </span>
        </div>
      </section>

      {/* Cards & Dialogs */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Credit Card Summary</CardTitle>
            <CardDescription>BPI Visa Signature ending in 8842</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Left to spend</span>
              <span className="text-2xl font-bold">₱185,000</span>
            </div>
            <Progress value={42} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Used ₱135,000 of ₱320,000</span>
              <span>42% used</span>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Bill is made on 15th</span>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                Manage Card
              </DialogTrigger>
              <DialogContent className="sm:max-w-md shadow-lift">
                <DialogHeader>
                  <DialogTitle>Card Details</DialogTitle>
                  <DialogDescription>
                    Configure alerts, payment dates, or statement cycles for this card.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nickname</label>
                    <Input defaultValue="Primary Travel Card" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bank Provider</label>
                    <Select value={selectedBank} onValueChange={(val) => setSelectedBank(val ?? "")}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a bank" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bpi">BPI (Bank of the Philippine Islands)</SelectItem>
                        <SelectItem value="bdo">BDO Unibank</SelectItem>
                        <SelectItem value="metrobank">Metrobank</SelectItem>
                        <SelectItem value="unionbank">UnionBank of the Philippines</SelectItem>
                        <SelectItem value="rcbc">RCBC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="flex gap-2">
                  <DialogClose render={<Button variant="ghost" />}>
                    Cancel
                  </DialogClose>
                  <Button onClick={() => setDialogOpen(false)}>Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <ResponsiveDialog>
              <ResponsiveDialogTrigger render={<Button variant="soft" />}>
                Open Responsive Dialog (TNV-007)
              </ResponsiveDialogTrigger>
              <ResponsiveDialogContent>
                <ResponsiveDialogHeader>
                  <ResponsiveDialogTitle>Card Statements & History</ResponsiveDialogTitle>
                  <ResponsiveDialogDescription>
                    Adapts dynamically: bottom sheet drawer on mobile, centered modal on desktop without remounting.
                  </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <ResponsiveDialogBody className="space-y-4">
                  <p className="text-sm text-foreground">
                    Content scrolls smoothly inside this body area while the action buttons remain pinned at the bottom.
                  </p>
                  <div className="rounded-xl bg-muted p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statement Details</p>
                    <p className="text-sm">BDO Platinum Visa • Ending in 4242</p>
                    <p className="text-sm text-muted-foreground">Due Date: October 25, 2026 (₱18,450.00)</p>
                  </div>
                </ResponsiveDialogBody>
                <ResponsiveDialogFooter>
                  <ResponsiveDialogClose render={<Button variant="ghost" />}>
                    Cancel
                  </ResponsiveDialogClose>
                  <Button variant="primary">Confirm Payment</Button>
                </ResponsiveDialogFooter>
              </ResponsiveDialogContent>
            </ResponsiveDialog>
          </CardFooter>
        </Card>

        {/* Form Controls & Toggles */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Controls & Inputs</CardTitle>
            <CardDescription>Accessible inputs with 2px focus rings and tonal fills</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Transactions</label>
              <Input placeholder="Search groceries, flights, dining..." />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
              <div>
                <p className="text-sm font-medium">Payment Due Alerts</p>
                <p className="text-xs text-muted-foreground">Receive push notification 3 days before cutoff</p>
              </div>
              <Switch checked={switchActive} onCheckedChange={setSwitchActive} />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="terms" checked={checkboxChecked} onCheckedChange={(v) => setCheckboxChecked(Boolean(v))} />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Mark as paid for this statement cycle
              </label>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Bank selected: {selectedBank || "None"} | Switch: {switchActive ? "On" : "Off"}
            </p>
          </CardFooter>
        </Card>
      </section>

      {/* Tabs */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Tabs Navigation</h2>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-muted p-1 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg">All Cards (6)</TabsTrigger>
            <TabsTrigger value="due" className="rounded-lg">Due Soon (2)</TabsTrigger>
            <TabsTrigger value="paid" className="rounded-lg">Caught Up (4)</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="p-4 bg-card rounded-2xl shadow-card mt-3">
            <p className="text-sm text-muted-foreground">Showing all 6 active cards configured on your profile.</p>
          </TabsContent>
          <TabsContent value="due" className="p-4 bg-card rounded-2xl shadow-card mt-3">
            <p className="text-sm text-warning-soft-foreground">2 cards have balances due within 7 days.</p>
          </TabsContent>
          <TabsContent value="paid" className="p-4 bg-card rounded-2xl shadow-card mt-3">
            <p className="text-sm text-success-soft-foreground">4 cards have zero balance or are fully paid.</p>
          </TabsContent>
        </Tabs>
      </section>

      {/* Reference Card Form (TNV-006) */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Standard Form Pattern (TNV-006)</h2>
        <Card>
          <CardHeader>
            <CardTitle>Add Credit Card (Reference Form)</CardTitle>
            <CardDescription>
              Validates on blur and submit with Zod, MoneyInput (₱), DayOfMonthSelect, and zero decorative borders.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-w-xl">
            <ReferenceCardForm />
          </CardContent>
        </Card>
      </section>

      {/* Card Details with Statement Month Dropdown Demo */}
      <section className="space-y-4 pt-6" id="card-details-demo">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Card Details Statement Month Dropdown Demo</h2>
          <p className="text-sm text-muted-foreground">
            Validating the statement month dropdown selector, defaulting to current month&apos;s statement with interactive month switching.
          </p>
        </div>
        <div className="p-4 sm:p-6 rounded-3xl bg-muted/30">
          <CardDetailsClient
            card={mockCard}
            transactions={mockTransactions}
            linkedLiabilities={mockLinkedLiabilities}
            categories={mockCategories}
            allCards={[mockCard]}
          />
        </div>
      </section>

      {/* Multi-Transaction Image Parsing & Review Modal Demo */}
      <section className="space-y-4 pt-6" id="multi-transaction-modal-demo">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Multi-Transaction Receipt Parsing & Review Demo</h2>
          <p className="text-sm text-muted-foreground">
            Demonstrates uploading receipt/statement images with multiple transactions, card review layout, missing field inputs, and approval.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-muted/30 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              id="btn-open-multi-tx-modal"
              onClick={() => {
                setMultiTxModalItems(sampleMultiParsedItems);
                setIsMultiTxModalOpen(true);
              }}
              className="h-11 px-5 rounded-2xl shadow-xs font-bold cursor-pointer"
            >
              Open Multi-Transaction Cards Modal (3 Parsed Items)
            </Button>

            <Button
              id="btn-open-blank-modal"
              variant="outline"
              onClick={() => {
                setMultiTxModalItems(undefined);
                setIsMultiTxModalOpen(true);
              }}
              className="h-11 px-5 rounded-2xl bg-card hover:bg-muted/80 shadow-xs font-bold cursor-pointer"
            >
              Open Blank Modal (Camera / Upload Mode)
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Item 1 has complete details (₱450.50 Jollibee). Item 2 has missing amount (Grab Transport) requiring user input before approval. Item 3 has complete details (₱1,500.00 Caltex).
          </p>
        </div>

        {isMultiTxModalOpen && (
          <TransactionModal
            isOpen={isMultiTxModalOpen}
            onClose={() => setIsMultiTxModalOpen(false)}
            categories={mockCategories}
            creditCards={[mockCard]}
            defaultCreditCardId={mockCard.id}
            defaultPaymentMethod="credit_card"
            initialParsedItems={multiTxModalItems}
          />
        )}
      </section>
    </div>
  );
}
