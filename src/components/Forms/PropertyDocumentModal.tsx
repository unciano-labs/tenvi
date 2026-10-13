'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  UploadCloud,
  FileText,
  FileCheck,
  Bell,
  Loader2,
} from 'lucide-react';
import { Property, PropertyDocument, PropertyDocumentType } from '@/types';
import { DOCUMENT_TYPE_PRESETS } from '@/lib/constants';
import {
  uploadPropertyDocumentAction,
  updatePropertyDocumentAction,
} from '@/app/actions/propertyDocuments';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
} from '@/components/ui/responsive-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

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
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent className="max-w-xl">
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <ResponsiveDialogTitle>
                {isEditing ? 'Edit Asset Document' : 'Upload Asset Document'}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Linking to <span className="font-bold text-foreground">{property.name}</span>
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Document Type Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground block uppercase tracking-wider">Document Category</label>
              <select
                value={documentType}
                onChange={(e) => handleDocumentTypeChange(e.target.value as PropertyDocumentType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/60 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
              >
                {DOCUMENT_TYPE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {DOCUMENT_TYPE_PRESETS.find((p) => p.value === documentType)?.description}
              </p>
            </div>

            {/* Title & Document Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground block uppercase tracking-wider">
                  Document Title <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Toyota Vios 2024 LTO OR/CR"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground block uppercase tracking-wider">
                  Reference / Plate / Policy #
                </label>
                <Input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="e.g. NBC 1234, POL-99201"
                />
              </div>
            </div>

            {/* Dates Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground block uppercase tracking-wider">Issue / Effective Date</label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground block flex items-center justify-between uppercase tracking-wider">
                  <span>Expiration / Renewal Date</span>
                  <span className="text-xs text-muted-foreground font-normal lowercase">leave blank if permanent</span>
                </label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>

            {/* Automated Expiration Alerts Card */}
            {expiryDate && (
              <div className="p-4 rounded-2xl bg-amber-50/70 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Bell className="w-4 h-4 text-amber-600" />
                  Automated Renewal & Expiry Alerts
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Tenvi will automatically monitor this document and send alerts when it is approaching expiration.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-bold text-amber-900 uppercase block mb-1">
                      Notice Lead Time
                    </label>
                    <select
                      value={notifyBeforeDays}
                      onChange={(e) => setNotifyBeforeDays(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-card text-xs font-bold text-amber-950 focus:outline-none shadow-xs cursor-pointer"
                    >
                      <option value={60}>60 Days Before</option>
                      <option value={45}>45 Days Before</option>
                      <option value={30}>30 Days Before (Standard)</option>
                      <option value={15}>15 Days Before</option>
                      <option value={7}>7 Days Before</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <Checkbox
                      id="notifyEmail"
                      checked={notifyEmail}
                      onCheckedChange={(checked) => setNotifyEmail(!!checked)}
                    />
                    <label htmlFor="notifyEmail" className="text-xs font-bold text-amber-950 cursor-pointer">
                      Email Alerts
                    </label>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <Checkbox
                      id="notifySms"
                      checked={notifySms}
                      onCheckedChange={(checked) => setNotifySms(!!checked)}
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
              <label className="text-xs font-bold text-muted-foreground block flex items-center justify-between uppercase tracking-wider">
                <span>Digital File (PDF, Image)</span>
                <span className="text-xs text-muted-foreground font-normal lowercase">optional (max 15MB)</span>
              </label>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-2xl p-5 text-center transition-all cursor-pointer ${
                  isDragOver
                    ? 'bg-primary/10 ring-2 ring-primary'
                    : selectedFile
                    ? 'bg-emerald-50/50 ring-2 ring-emerald-400/40'
                    : 'bg-muted/60 hover:bg-muted/80'
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
                      <p className="text-xs font-bold text-foreground truncate max-w-xs">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
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
                      <p className="text-xs font-bold text-foreground truncate max-w-xs">
                        {documentToEdit.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">File on record • Click to replace with new file</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <UploadCloud className="w-6 h-6 text-muted-foreground mx-auto" />
                    <p className="text-xs font-semibold text-foreground">
                      Click to browse or drop document scan here
                    </p>
                    <p className="text-xs text-muted-foreground">PDF, PNG, JPG, or WEBP up to 15MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground block uppercase tracking-wider">Notes & Renewal Instructions</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Emission testing center at LTO Diliman, contact agent Maria 0917-xxx-xxxx"
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/60 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground resize-none"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
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
              </Button>
            </div>
          </form>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
