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

export default function DevUiDemoPage() {
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [switchActive, setSwitchActive] = useState<boolean>(false);
  const [checkboxChecked, setCheckboxChecked] = useState<boolean>(false);

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
    </div>
  );
}
