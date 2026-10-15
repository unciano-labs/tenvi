'use client';

import React, { useState, useEffect, useTransition } from 'react';
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
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Members Directory
            </h1>
            <span className="px-2 py-0.5 text-2xs font-bold bg-primary/10 text-primary rounded-md">
              {members.length} Loaded
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational visibility and account access controls without exposing private ledger numbers.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchMembers()}
          disabled={loading}
          className="gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative max-w-md">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name..."
            className="pl-9 text-xs h-9 bg-card"
          />
        </form>

        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-muted flex items-center gap-1 text-2xs font-semibold">
            {(['all', 'active', 'suspended'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-md capitalize transition-colors cursor-pointer ${
                  statusFilter === status
                    ? 'bg-card text-foreground font-bold shadow-2xs'
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
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/50 select-none">
              <tr>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4">Operational Volume</th>
                <th className="py-3 px-4">Last Active</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
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
                    <p className="text-3xs text-muted-foreground/80">
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
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => {
                        setSelectedMember(m);
                        setDrawerOpen(true);
                      }}
                    >
                      {/* Identity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-lightprimary text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate max-w-[200px]">
                              {m.full_name || 'Member'}
                            </p>
                            <p className="text-3xs text-muted-foreground truncate max-w-[200px]">
                              {m.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {m.is_banned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-destructive/15 text-destructive">
                            <Ban className="size-2.5" />
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-2.5" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Joined */}
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {formatDate(m.created_at)}
                      </td>

                      {/* Operational Volume (No Financial Balances!) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-3xs font-semibold">
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
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {m.last_activity_at ? (
                          <span className="flex items-center gap-1 text-2xs">
                            <Clock className="size-3" />
                            {formatDate(m.last_activity_at)}
                          </span>
                        ) : (
                          <span className="text-3xs text-muted-foreground/60">No activity yet</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                aria-label="Member options"
                              />
                            }
                          >
                            <MoreVertical className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs p-1.5">
                            <DropdownMenuLabel className="text-3xs font-bold text-muted-foreground uppercase">
                              Member Actions
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                setSelectedMember(m);
                                setDrawerOpen(true);
                              }}
                            >
                              <Eye className="size-3.5 mr-2" />
                              View Audit Trail
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleResetPassword(m.email)}
                            >
                              <KeyRound className="size-3.5 mr-2" />
                              Send Password Reset
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {m.is_banned ? (
                              <DropdownMenuItem
                                className="cursor-pointer text-emerald-600 dark:text-emerald-400 font-semibold"
                                onClick={() => handleUnsuspend(m)}
                              >
                                <ShieldCheck className="size-3.5 mr-2" />
                                Unsuspend Account
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
                                Suspend Account
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              className="cursor-pointer text-destructive text-3xs"
                              onClick={() => handleDeleteMember(m)}
                            >
                              <UserX className="size-3.5 mr-2" />
                              Revoke Tenvi Access
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
              <ShieldAlert className="size-5" />
              <DialogTitle className="text-base font-bold">Suspend Member Access</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Temporarily or indefinitely block <strong>{selectedMember?.email}</strong> from logging into Tenvi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Duration</label>
              <select
                value={suspendDurationHours}
                onChange={(e) => setSuspendDurationHours(Number(e.target.value))}
                className="w-full text-xs p-2 rounded-lg bg-muted border border-border/60 outline-none"
              >
                <option value={24}>24 Hours (1 Day)</option>
                <option value={168}>7 Days (1 Week)</option>
                <option value={720}>30 Days (1 Month)</option>
                <option value={0}>Indefinite (Permanent)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Reason (Recorded in Audit Logs)</label>
              <Input
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Abusive automated scraping, spam"
                className="text-xs"
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
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              Confirm Suspension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
