'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  FileText,
  FileCheck,
  Plus,
  Calendar,
  AlertCircle,
  Clock,
  ExternalLink,
  Edit2,
  Trash2,
  ShieldCheck,
  Award,
  Car,
  Building,
  Bell,
  Send,
  Loader2,
  Download,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Property, PropertyDocument, PropertyDocumentType } from '@/types';
import {
  calculateDocumentExpiryStatus,
  formatDate,
} from '@/lib/finance/calculations';
import {
  deletePropertyDocumentAction,
  sendDocumentExpiryAlertAction,
} from '@/app/actions/propertyDocuments';
import { DOCUMENT_TYPE_PRESETS } from '@/lib/constants';
import { confirmModal } from '@/components/UI/GlobalDialog';

import { PropertyDocumentModal } from '@/components/Forms/PropertyDocumentModal';

interface PropertyDocumentsSectionProps {
  property: Property;
  documents: PropertyDocument[];
}

export function PropertyDocumentsSection({
  property,
  documents,
}: PropertyDocumentsSectionProps) {
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<PropertyDocument | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isSendingAlertId, setIsSendingAlertId] = useState<string | null>(null);

  // Stats calculation
  const stats = React.useMemo(() => {
    let expired = 0;
    let expiringSoon = 0;
    let valid = 0;

    for (const doc of documents) {
      if (!doc.expiry_date) {
        valid++;
        continue;
      }
      const st = calculateDocumentExpiryStatus(doc.expiry_date, doc.notify_before_days);
      if (st.isExpired) {
        expired++;
      } else if (st.isExpiringSoon) {
        expiringSoon++;
      } else {
        valid++;
      }
    }

    return {
      total: documents.length,
      expired,
      expiringSoon,
      valid,
    };
  }, [documents]);

  const handleOpenAdd = () => {
    setEditingDoc(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc: PropertyDocument) => {
    setEditingDoc(doc);
    setIsModalOpen(true);
  };

  const handleDelete = async (doc: PropertyDocument) => {
    const confirmed = await confirmModal({
      title: 'Delete Document?',
      description: `Are you sure you want to remove "${doc.title}"? Any attached digital file and renewal alerts for this document will be deleted.`,
      confirmText: 'Delete Document',
      variant: 'danger',
    });

    if (!confirmed) return;

    setIsDeletingId(doc.id);
    const res = await deletePropertyDocumentAction(doc.id);
    setIsDeletingId(null);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Document removed successfully');
      router.refresh();
    }
  };

  const handleSendTestAlert = async (doc: PropertyDocument) => {
    if (!doc.expiry_date) {
      toast.info('This document does not have an expiration date configured.');
      return;
    }

    setIsSendingAlertId(doc.id);
    const res = await sendDocumentExpiryAlertAction(doc.id);
    setIsSendingAlertId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(res.message || 'Notification dispatched!');
      router.refresh();
    }
  };

  const getDocTypeIcon = (type: PropertyDocumentType) => {
    switch (type) {
      case 'or_cr':
        return Car;
      case 'insurance_policy':
        return ShieldCheck;
      case 'ltfrb_franchise':
        return Award;
      case 'tax_declaration':
        return Building;
      default:
        return FileText;
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">Documents & Compliance Vault</h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {documents.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Store proof of ownership, LTO OR/CR, LTFRB franchise, and policies with automated renewal alerts.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Document
        </button>
      </div>

      {/* Summary Pills */}
      {documents.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-slate-400 block tracking-wider">
                Total Files
              </span>
              <span className="text-xl font-extrabold text-slate-900">{stats.total}</span>
            </div>
            <FileText className="w-5 h-5 text-slate-400" />
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-emerald-800 block tracking-wider">
                Valid & Compliant
              </span>
              <span className="text-xl font-extrabold text-emerald-950">{stats.valid}</span>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-amber-800 block tracking-wider">
                Expiring Soon
              </span>
              <span className="text-xl font-extrabold text-amber-950">{stats.expiringSoon}</span>
            </div>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-rose-800 block tracking-wider">
                Overdue / Expired
              </span>
              <span className="text-xl font-extrabold text-rose-950">{stats.expired}</span>
            </div>
            <AlertCircle className="w-5 h-5 text-rose-600" />
          </div>
        </div>
      )}

      {/* Documents Grid / List */}
      {documents.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-4 bg-slate-50/40">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <FileCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="text-sm font-bold text-slate-800">No Documents Attached Yet</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Attach {property.name}&apos;s OR/CR, Insurance Policy, or Franchise to keep records centralized and receive SMS & Email reminders before expiration.
            </p>
          </div>
          <div className="pt-1">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Upload First Document
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => {
            const expiryStatus = calculateDocumentExpiryStatus(
              doc.expiry_date,
              doc.notify_before_days
            );
            const preset = DOCUMENT_TYPE_PRESETS.find((p) => p.value === doc.document_type);
            const TypeIcon = getDocTypeIcon(doc.document_type);
            const hasFile = doc.file_url && doc.file_url !== '#no-file';

            return (
              <div
                key={doc.id}
                className="p-5 rounded-2xl border border-slate-100 bg-[#FAFBFD] hover:bg-white hover:shadow-md transition-all space-y-4 group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar: Icon + Category + Expiry Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
                        <TypeIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                          {preset?.label.split('(')[0].trim() || doc.document_type}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                          {doc.title}
                        </h4>
                      </div>
                    </div>

                    {/* Expiry Pill */}
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl border shrink-0 ${expiryStatus.badgeClass}`}
                    >
                      {expiryStatus.label}
                    </span>
                  </div>

                  {/* Document Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    {doc.document_number && (
                      <div className="space-y-0.5">
                        <span className="text-xs font-medium text-slate-400 block uppercase">
                          Ref / Policy #
                        </span>
                        <span className="font-semibold text-slate-800 font-mono text-xs">
                          {doc.document_number}
                        </span>
                      </div>
                    )}

                    <div className="space-y-0.5">
                      <span className="text-xs font-medium text-slate-400 block uppercase">
                        Expiry Date
                      </span>
                      <span className="font-semibold text-slate-800">
                        {doc.expiry_date ? formatDate(doc.expiry_date) : 'Permanent'}
                      </span>
                    </div>

                    {doc.issue_date && (
                      <div className="space-y-0.5">
                        <span className="text-xs font-medium text-slate-400 block uppercase">
                          Issued On
                        </span>
                        <span className="font-medium text-slate-600">
                          {formatDate(doc.issue_date)}
                        </span>
                      </div>
                    )}

                    <div className="space-y-0.5">
                      <span className="text-xs font-medium text-slate-400 block uppercase">
                        Alert Channels
                      </span>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        {doc.notify_email && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                            Email
                          </span>
                        )}
                        {doc.notify_sms && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                            SMS
                          </span>
                        )}
                        {!doc.notify_email && !doc.notify_sms && (
                          <span className="text-xs text-slate-400">Off</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes / Instructions */}
                  {doc.notes && (
                    <div className="p-2.5 rounded-xl bg-slate-100/70 text-xs text-slate-600 leading-relaxed">
                      {doc.notes}
                    </div>
                  )}
                </div>

                {/* Bottom Actions Bar */}
                <div className="pt-3 border-t border-slate-100/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {hasFile ? (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer"
                        title="Open digital document copy"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View File
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No file scan attached</span>
                    )}

                    {doc.expiry_date && (
                      <button
                        onClick={() => handleSendTestAlert(doc)}
                        disabled={isSendingAlertId === doc.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                        title="Send immediate test alert via Email / SMS"
                      >
                        {isSendingAlertId === doc.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Bell className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        Test Alert
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(doc)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Edit Document Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={isDeletingId === doc.id}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                      title="Delete Document"
                    >
                      {isDeletingId === doc.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload / Edit Modal */}
      <PropertyDocumentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDoc(null);
        }}
        property={property}
        documentToEdit={editingDoc}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
