'use client';

import React, { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Activity,
  PlusCircle,
  Edit2,
  Trash2,
  Shield,
  Loader2,
  Clock,
  Laptop,
} from 'lucide-react';
import { getMemberAuditLogsAction, AdminMemberRecord, AdminAuditLogEntry } from '@/app/actions/admin/members';
import { formatDate } from '@/lib/finance/calculations';

interface MemberActivityDrawerProps {
  member: AdminMemberRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberActivityDrawer({ member, open, onOpenChange }: MemberActivityDrawerProps) {
  const [logs, setLogs] = useState<AdminAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !member) return;

    let mounted = true;
    setLoading(true);

    getMemberAuditLogsAction(member.user_id).then((res) => {
      if (mounted) {
        setLogs(res.logs || []);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [open, member]);

  function getActionIcon(action: string) {
    if (action.includes('INSERT') || action.includes('CREATE')) {
      return <PlusCircle className="size-4 text-emerald-500" />;
    }
    if (action.includes('UPDATE')) {
      return <Edit2 className="size-4 text-amber-500" />;
    }
    if (action.includes('DELETE')) {
      return <Trash2 className="size-4 text-destructive" />;
    }
    return <Activity className="size-4 text-primary" />;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col justify-between">
        <div className="p-6 border-b border-border/50">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-3xs font-extrabold uppercase bg-primary/10 text-primary rounded">
                Audit Trail
              </span>
              {member?.is_banned && (
                <span className="px-2 py-0.5 text-3xs font-extrabold uppercase bg-destructive/15 text-destructive rounded">
                  Suspended
                </span>
              )}
            </div>
            <SheetTitle className="text-base font-bold text-foreground truncate">
              {member?.full_name || member?.email}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground truncate">
              {member?.email} • ID: <code className="text-3xs font-mono">{member?.user_id?.slice(0, 8)}...</code>
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Audit Timeline */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between text-2xs font-semibold text-muted-foreground pb-2 border-b border-border/40">
            <span>Operational Activity (Zero-Leak)</span>
            <span>{logs.length} events logged</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs">Loading activity logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center space-y-2">
              <Shield className="size-8 opacity-40" />
              <p className="text-xs font-semibold">No recent activity events</p>
              <p className="text-3xs text-muted-foreground/80 max-w-xs">
                This member has not triggered any logged database mutations yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-border/60">
              {logs.map((log) => (
                <div key={log.id} className="relative flex items-start gap-3 pl-1">
                  <div className="size-7 rounded-full bg-card border border-border/60 flex items-center justify-center shrink-0 z-10 shadow-2xs">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-card border border-border/50 text-xs shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground font-mono text-2xs uppercase">
                        {log.action}
                      </span>
                      <span className="text-3xs text-muted-foreground flex items-center gap-1">
                        <Clock className="size-2.5" />
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                      <span className="capitalize font-semibold text-foreground/80">
                        {log.entity_type}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-3xs text-muted-foreground truncate">
                        ID: {log.entity_id?.slice(0, 8)}...
                      </span>
                    </div>
                    {log.ip_address && (
                      <div className="pt-1 text-3xs text-muted-foreground/70 flex items-center gap-1 font-mono">
                        <Laptop className="size-2.5" />
                        Client IP: {log.ip_address}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-border/50 bg-muted/20 text-3xs text-muted-foreground text-center">
          Privacy guarantee: Financial transaction amounts and balances are strictly redacted.
        </div>
      </SheetContent>
    </Sheet>
  );
}
