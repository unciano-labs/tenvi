'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  X,
  UploadCloud,
  FileText,
  FileCheck,
  Calendar,
  Bell,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  Trash2,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import { Property, PropertyDocument, PropertyDocumentType } from '@/types';
import { DOCUMENT_TYPE_PRESETS } from '@/lib/constants';
import {
  uploadPropertyDocumentAction,
  updatePropertyDocumentAction,
} from '@/app/actions/propertyDocuments';


interface PropertyDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  documentToEdit?: PropertyDocument | null;
  onSuccess?: () => void;
}

export function PropertyDocumentModal({
  isOpen,
  onClose,
  property,
  documentToEdit,
  onSuccess,
}: PropertyDocumentModalProps) {
  const isEditing = !!documentToEdit;

  const [documentType, setDocumentType] = useState<PropertyDocumentType>('or_cr');
  const [title, setTitle] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notifyBeforeDays, setNotifyBeforeDays] = useState(30);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [notes, setNotes] = useState('');

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (documentToEdit) {
      setDocumentType(documentToEdit.document_type || 'other');
      setTitle(documentToEdit.title || '');
      setDocumentNumber(documentToEdit.document_number || '');
      setIssueDate(documentToEdit.issue_date || '');
      setExpiryDate(documentToEdit.expiry_date || '');
      setNotifyBeforeDays(documentToEdit.notify_before_days || 30);
      setNotifyEmail(documentToEdit.notify_email ?? true);
      setNotifySms(documentToEdit.notify_sms ?? false);
      setNotes(documentToEdit.notes || '');
      setSelectedFile(null);
    } else {
      // Default to appropriate preset based on property type
      const defaultType: PropertyDocumentType =
        property.property_type === 'vehicle'
          ? 'or_cr'
          : property.property_type === 'real_estate' || property.property_type === 'land'
          ? 'tax_declaration'
          : 'insurance_policy';

      setDocumentType(defaultType);
      const preset = DOCUMENT_TYPE_PRESETS.find((p) => p.value === defaultType);
      setTitle(preset ? `${property.name} ${preset.label.split('(')[0].trim()}` : `${property.name} Document`);
      setDocumentNumber(property.identifier || '');
      setIssueDate('');
      setExpiryDate('');
      setNotifyBeforeDays(30);
      setNotifyEmail(true);
      setNotifySms(false);
      setNotes('');
      setSelectedFile(null);
    }
  }, [documentToEdit, property, isOpen]);

  if (!isOpen) return null;

  const handleDocumentTypeChange = (newType: PropertyDocumentType) => {
    setDocumentType(newType);
    if (!isEditing) {
      const preset = DOCUMENT_TYPE_PRESETS.find((p) => p.value === newType);
      if (preset) {
        setTitle(`${property.name} ${preset.label.split('(')[0].trim()}`);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        toast.error('File size cannot exceed 15MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 15 * 1024 * 1024) {
        toast.error('File size cannot exceed 15MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a document title');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('property_id', property.id);
      formData.append('title', title.trim());
      formData.append('document_type', documentType);
      if (documentNumber.trim()) formData.append('document_number', documentNumber.trim());
      if (issueDate) formData.append('issue_date', issueDate);
      if (expiryDate) formData.append('expiry_date', expiryDate);
      formData.append('notify_before_days', String(notifyBeforeDays));
      formData.append('notify_email', String(notifyEmail));
      formData.append('notify_sms', String(notifySms));
      if (notes.trim()) formData.append('notes', notes.trim());

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      if (isEditing && documentToEdit) {
        const res = await updatePropertyDocumentAction(documentToEdit.id, formData);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success('Document updated successfully');
          onSuccess?.();
          onClose();
        }
      } else {
        const res = await uploadPropertyDocumentAction(formData);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success('Document linked to asset successfully');
          onSuccess?.();
          onClose();
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while saving the document');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {isEditing ? 'Edit Asset Document' : 'Upload Asset Document'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Linking to <span className="font-bold text-slate-700">{property.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Document Type Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Document Category</label>
            <select
              value={documentType}
              onChange={(e) => handleDocumentTypeChange(e.target.value as PropertyDocumentType)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              {DOCUMENT_TYPE_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              {DOCUMENT_TYPE_PRESETS.find((p) => p.value === documentType)?.description}
            </p>
          </div>

          {/* Title & Document Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Document Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Toyota Vios 2024 LTO OR/CR"
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Reference / Plate / Policy #
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="e.g. NBC 1234, POL-99201"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Dates Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Issue / Effective Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                <span>Expiration / Renewal Date</span>
                <span className="text-[10px] text-slate-400 font-normal">Leave blank if permanent</span>
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Automated Expiration Alerts Card */}
          {expiryDate && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Bell className="w-4 h-4 text-amber-600" />
                Automated Renewal & Expiry Alerts
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Tenvi will automatically monitor this document and send alerts when it is approaching expiration.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-amber-900 uppercase block mb-1">
                    Notice Lead Time
                  </label>
                  <select
                    value={notifyBeforeDays}
                    onChange={(e) => setNotifyBeforeDays(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-xs font-bold text-amber-950 focus:outline-none cursor-pointer"
                  >
                    <option value={60}>60 Days Before</option>
                    <option value={45}>45 Days Before</option>
                    <option value={30}>30 Days Before (Standard)</option>
                    <option value={15}>15 Days Before</option>
                    <option value={7}>7 Days Before</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="notifyEmail"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-amber-300 cursor-pointer"
                  />
                  <label htmlFor="notifyEmail" className="text-xs font-bold text-amber-950 cursor-pointer">
                    Email Alerts
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="notifySms"
                    checked={notifySms}
                    onChange={(e) => setNotifySms(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-amber-300 cursor-pointer"
                  />
                  <label htmlFor="notifySms" className="text-xs font-bold text-amber-950 cursor-pointer">
                    SMS Alerts
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* File Upload Drop Zone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
              <span>Digital File (PDF, Image)</span>
              <span className="text-[10px] text-slate-400 font-normal">Optional (Max 15MB)</span>
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : selectedFile
                  ? 'border-emerald-300 bg-emerald-50/30'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/40 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800 truncate max-w-xs">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Click to replace
                    </p>
                  </div>
                </div>
              ) : isEditing && documentToEdit?.file_url && documentToEdit.file_url !== '#no-file' ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800 truncate max-w-xs">
                      {documentToEdit.file_name}
                    </p>
                    <p className="text-[10px] text-slate-500">File on record • Click to replace with new file</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <UploadCloud className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">
                    Click to browse or drop document scan here
                  </p>
                  <p className="text-[10px] text-slate-400">PDF, PNG, JPG, or WEBP up to 15MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Notes & Renewal Instructions</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Emission testing center at LTO Diliman, contact agent Maria 0917-xxx-xxxx"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  {isEditing ? 'Save Changes' : 'Attach Document'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
