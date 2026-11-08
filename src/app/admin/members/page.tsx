'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  ShieldAlert,
  ShieldCheck,
  Ban,
  CheckCircle2,
  Mail,
  KeyRound,
  Eye,
  Loader2,
  UserX,
  CreditCard,
  Building2,
  Wallet,
  Clock,
  RotateCcw,
  Megaphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getAdminMembersAction,
  suspendMemberAction,
  unsuspendMemberAction,
  triggerMemberPasswordResetAction,
  deleteMemberAccountAction,
  AdminMemberRecord,
} from '@/app/actions/admin/members';
import { MemberActivityDrawer } from '@/components/Admin/MemberActivityDrawer';
import { formatDate } from '@/lib/finance/calculations';
import { toast } from 'sonner';

export default function AdminMembersPage() {
  const [members, setMembers] = useState<AdminMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [isPending, startTransition] = useTransition();

  // Drawer & Modal states
  const [selectedMember, setSelectedMember] = useState<AdminMemberRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendDurationHours, setSuspendDurationHours] = useState(720); // 30 days
  const [suspendReason, setSuspendReason] = useState('');

  // Load members
  const fetchMembers = (query = search, status = statusFilter) => {
    setLoading(true);
    getAdminMembersAction({ search: query, status })
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
        } else {
          setMembers(res.members || []);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMembers();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMembers(search, statusFilter);
  };

  const handleSuspend = () => {
    if (!selectedMember) return;
    startTransition(async () => {
      const res = await suspendMemberAction(
        selectedMember.user_id,
        suspendDurationHours,
        suspendReason || 'Administrative suspension'
      );
      if (res.success) {
        toast.success(`Account ${selectedMember.email} suspended`);
        setSuspendModalOpen(false);
        fetchMembers();
      } else {
        toast.error(res.error || 'Failed to suspend account');
      }
    });
  };

  const handleUnsuspend = (member: AdminMemberRecord) => {
    startTransition(async () => {
      const res = await unsuspendMemberAction(member.user_id);
      if (res.success) {
        toast.success(`Account ${member.email} restored`);
        fetchMembers();
      } else {
        toast.error(res.error || 'Failed to unsuspend account');
      }
    });
  };

  const handleResetPassword = (email: string) => {
    startTransition(async () => {
      const res = await triggerMemberPasswordResetAction(email);
      if (res.success) {
        toast.success(`Password reset email sent to ${email}`);
      } else {
        toast.error(res.error || 'Failed to send password reset');
      }
    });
  };

  const handleDeleteMember = (member: AdminMemberRecord) => {
    if (!confirm(`Are you sure you want to remove ${member.email} from Tenvi? This will revoke their website role.`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteMemberAccountAction(member.user_id, member.email);
      if (res.success) {
        toast.success(`Member ${member.email} removed from Tenvi`);
        fetchMembers();
      } else {
        toast.error(res.error || 'Failed to remove member');
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-display text-foreground">Members directory</h1>
            <span className="num rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {members.length} loaded
            </span>
          </div>
          <p className="mt-1 max-w-prose text-sm sm:text-base text-muted-foreground">
            Operational visibility and account access controls without exposing private ledger numbers.
          </p>
        </div>

        <div className="page-header-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMembers()}
            disabled={loading}
            aria-busy={loading}
            className="gap-1.5"
          >
            <RotateCcw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button render={<Link href="/admin/broadcast" />} size="sm" className="gap-1.5">
            <Megaphone className="size-4" />
            Email blast to all
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative min-w-[min(100%,16rem)] max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name..."
            aria-label="Search members"
            className="h-12 sm:h-10 pl-10 bg-card shadow-card"
          />
        </form>

        <div className="flex items-center gap-2">
          <div role="group" aria-label="Filter by status" className="p-1 rounded-xl bg-muted flex items-center gap-1 text-sm font-medium">
            {(['all', 'active', 'suspended'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                aria-pressed={statusFilter === status}
                className={`no-spring h-10 sm:h-8 px-3.5 rounded-lg capitalize cursor-pointer outline-none transition-colors duration-(--motion-fast) ease-(--ease-in-out) focus-visible:ring-2 focus-visible:ring-ring ${
                  statusFilter === status
                    ? 'bg-card text-foreground font-semibold shadow-card'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        <div className="relative overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="bg-muted/50 text-label text-muted-foreground select-none">
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-muted py-3 px-3 font-medium">Member</th>
                <th scope="col" className="py-3 px-3 font-medium">Status</th>
                <th scope="col" className="py-3 px-3 font-medium whitespace-nowrap">Joined</th>
                <th scope="col" className="py-3 px-3 font-medium whitespace-nowrap">Operational volume</th>
                <th scope="col" className="py-3 px-3 font-medium whitespace-nowrap">Last active</th>
                <th scope="col" className="py-3 px-3 text-right font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto text-primary mb-2" />
                    <span>Loading registered members...</span>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Users className="size-8 opacity-40 mx-auto mb-2" />
                    <p className="font-semibold text-sm">No members found</p>
                    <p className="text-xs text-muted-foreground/80">
                      Try adjusting your search query or filter.
                    </p>
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const initial = (m.full_name || m.email || 'M').charAt(0).toUpperCase();

                  return (
                    <tr
                      key={m.user_id}
                      tabIndex={0}
                      className="group cursor-pointer outline-none transition-colors duration-(--motion-fast) ease-(--ease-in-out) even:bg-muted/25 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      onClick={() => {
                        setSelectedMember(m);
                        setDrawerOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target === e.currentTarget) {
                          setSelectedMember(m);
                          setDrawerOpen(true);
                        }
                      }}
                    >
                      {/* Identity */}
                      <td className="sticky left-0 z-10 bg-card group-even:bg-[color-mix(in_oklab,var(--card),var(--muted)_25%)] group-hover:bg-[color-mix(in_oklab,var(--card),var(--muted)_50%)] py-3 px-3 transition-colors duration-(--motion-fast) ease-(--ease-in-out)">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-lightprimary text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate max-w-[12rem]" title={m.full_name || 'Member'}>
                              {m.full_name || 'Member'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[12rem]" title={m.email}>
                              {m.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {m.is_banned ? (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-danger-soft-foreground">
                            <Ban className="size-3" />
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-soft text-success-soft-foreground">
                            <CheckCircle2 className="size-3" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Joined */}
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(m.created_at)}
                      </td>

                      {/* Operational Volume (No Financial Balances!) */}
                      <td className="py-3 px-3">
                        <div className="num flex items-center gap-1.5 text-xs font-semibold">
                          <span
                            title="Logged Transactions"
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            <Wallet className="size-3 text-blue-500" />
                            {m.transactions_count}
                          </span>
                          <span
                            title="Credit Cards"
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            <CreditCard className="size-3 text-purple-500" />
                            {m.credit_cards_count}
                          </span>
                          <span
                            title="Properties"
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            <Building2 className="size-3 text-emerald-500" />
                            {m.properties_count}
                          </span>
                        </div>
                      </td>

                      {/* Last Active */}
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                        {m.last_activity_at ? (
                          <span className="flex items-center gap-1 text-xs">
                            <Clock className="size-3" />
                            {formatDate(m.last_activity_at)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No activity yet</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-10 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                aria-label={`Options for ${m.full_name || m.email}`}
                              />
                            }
                          >
                            <MoreVertical className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs p-1.5">
                            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                              Member actions
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                setSelectedMember(m);
                                setDrawerOpen(true);
                              }}
                            >
                              <Eye className="size-3.5 mr-2" />
                              View audit trail
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleResetPassword(m.email)}
                            >
                              <KeyRound className="size-3.5 mr-2" />
                              Send password reset
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {m.is_banned ? (
                              <DropdownMenuItem
                                className="cursor-pointer text-emerald-700 dark:text-emerald-400 font-semibold"
                                onClick={() => handleUnsuspend(m)}
                              >
                                <ShieldCheck className="size-3.5 mr-2" />
                                Unsuspend account
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive font-semibold"
                                onClick={() => {
                                  setSelectedMember(m);
                                  setSuspendModalOpen(true);
                                }}
                              >
                                <Ban className="size-3.5 mr-2" />
                                Suspend account
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              className="cursor-pointer text-destructive"
                              onClick={() => handleDeleteMember(m)}
                            >
                              <UserX className="size-3.5 mr-2" />
                              Revoke Tenvi access
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Audit Drawer */}
      <MemberActivityDrawer
        member={selectedMember}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      {/* Suspend Account Dialog */}
      <Dialog open={suspendModalOpen} onOpenChange={setSuspendModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5 shrink-0" />
              <DialogTitle className="text-title">Suspend member access</DialogTitle>
            </div>
            <DialogDescription className="text-sm break-words">
              Temporarily or indefinitely block <strong>{selectedMember?.email}</strong> from logging into Tenvi.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="suspend-duration" className="text-label text-foreground">Duration</label>
              <select
                id="suspend-duration"
                value={suspendDurationHours}
                onChange={(e) => setSuspendDurationHours(Number(e.target.value))}
                className="h-12 w-full rounded-xl bg-muted px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value={24}>24 Hours (1 Day)</option>
                <option value={168}>7 Days (1 Week)</option>
                <option value={720}>30 Days (1 Month)</option>
                <option value={0}>Indefinite (Permanent)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="suspend-reason" className="text-label text-foreground">Reason (recorded in audit logs)</label>
              <Input
                id="suspend-reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Abusive automated scraping, spam"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSuspendModalOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleSuspend}
              disabled={isPending}
              aria-busy={isPending}
              className="gap-1.5"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirm suspension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
