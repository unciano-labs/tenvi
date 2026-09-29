'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Mail,
  Sparkles,
  RotateCcw,
  Check,
  Smartphone,
  Info,
  Save,
  Loader2,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  LOAN_TEMPLATE_VARIABLES,
  CARD_TEMPLATE_VARIABLES,
  DEFAULT_LOAN_SMS_TEMPLATE,
  DEFAULT_LOAN_EMAIL_SUBJECT,
  DEFAULT_LOAN_EMAIL_BODY,
  DEFAULT_CARD_SMS_TEMPLATE,
  DEFAULT_CARD_EMAIL_SUBJECT,
  DEFAULT_CARD_EMAIL_BODY,
  interpolateTemplate,
  getSampleLoanVariables,
  getSampleCardVariables,
} from '@/lib/notifications/templates';
import {
  saveNotificationSettingsAction,
  resetNotificationTemplatesAction,
} from '@/app/actions/notifications';
import { NotificationSettings } from '@/types';
import { confirmModal } from '@/components/UI/GlobalDialog';

interface NotificationTemplatesEditorProps {
  initialSettings: NotificationSettings;
  onSaved?: (updated: Partial<NotificationSettings>) => void;
}

export function NotificationTemplatesEditor({
  initialSettings,
  onSaved,
}: NotificationTemplatesEditorProps) {
  const [activeCategory, setActiveCategory] = useState<'loans' | 'cards'>('loans');
  const [activeChannel, setActiveChannel] = useState<'sms' | 'email'>('sms');

  // Loan Templates State
  const [loanSms, setLoanSms] = useState(
    initialSettings.loan_sms_template || DEFAULT_LOAN_SMS_TEMPLATE
  );
  const [loanEmailSubject, setLoanEmailSubject] = useState(
    initialSettings.loan_email_subject || DEFAULT_LOAN_EMAIL_SUBJECT
  );
  const [loanEmailBody, setLoanEmailBody] = useState(
    initialSettings.loan_email_body || DEFAULT_LOAN_EMAIL_BODY
  );

  // Card Templates State
  const [cardSms, setCardSms] = useState(
    initialSettings.card_sms_template || DEFAULT_CARD_SMS_TEMPLATE
  );
  const [cardEmailSubject, setCardEmailSubject] = useState(
    initialSettings.card_email_subject || DEFAULT_CARD_EMAIL_SUBJECT
  );
  const [cardEmailBody, setCardEmailBody] = useState(
    initialSettings.card_email_body || DEFAULT_CARD_EMAIL_BODY
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Active target field for chip variable insertion
  const [focusedField, setFocusedField] = useState<
    'loan_sms' | 'loan_email_sub' | 'loan_email_body' | 'card_sms' | 'card_email_sub' | 'card_email_body'
  >('loan_sms');

  const currentVariables =
    activeCategory === 'loans' ? LOAN_TEMPLATE_VARIABLES : CARD_TEMPLATE_VARIABLES;
  const sampleValues =
    activeCategory === 'loans' ? getSampleLoanVariables() : getSampleCardVariables();

  // Insert variable into active input
  const handleInsertVariable = (variableKey: string) => {
    const token = `{{${variableKey}}}`;

    if (activeCategory === 'loans') {
      if (activeChannel === 'sms') {
        setLoanSms((prev) => `${prev} ${token}`);
      } else {
        if (focusedField === 'loan_email_sub') {
          setLoanEmailSubject((prev) => `${prev} ${token}`);
        } else {
          setLoanEmailBody((prev) => `${prev} ${token}`);
        }
      }
    } else {
      if (activeChannel === 'sms') {
        setCardSms((prev) => `${prev} ${token}`);
      } else {
        if (focusedField === 'card_email_sub') {
          setCardEmailSubject((prev) => `${prev} ${token}`);
        } else {
          setCardEmailBody((prev) => `${prev} ${token}`);
        }
      }
    }

    toast.success(`Inserted ${token}`);
  };

  const handleSaveTemplates = async () => {
    setIsSaving(true);
    const res = await saveNotificationSettingsAction({
      notifyEmail: initialSettings.notify_email,
      emailAddress: initialSettings.email_address,
      notifySms: initialSettings.notify_sms,
      phoneNumber: initialSettings.phone_number,
      daysBefore: initialSettings.days_before,
      loanSmsTemplate: loanSms.trim(),
      loanEmailSubject: loanEmailSubject.trim(),
      loanEmailBody: loanEmailBody.trim(),
      cardSmsTemplate: cardSms.trim(),
      cardEmailSubject: cardEmailSubject.trim(),
      cardEmailBody: cardEmailBody.trim(),
    });
    setIsSaving(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Notification templates saved successfully!');
      if (onSaved) {
        onSaved({
          loan_sms_template: loanSms.trim(),
          loan_email_subject: loanEmailSubject.trim(),
          loan_email_body: loanEmailBody.trim(),
          card_sms_template: cardSms.trim(),
          card_email_subject: cardEmailSubject.trim(),
          card_email_body: cardEmailBody.trim(),
        });
      }
    }
  };

  const handleResetDefaults = async () => {
    const confirmed = await confirmModal({
      title: 'Reset Alert Templates?',
      description: 'Are you sure you want to reset all notification templates back to the default text? Any custom changes will be overwritten.',
      confirmText: 'Reset to Defaults',
      variant: 'warning',
    });
    if (!confirmed) return;

    setIsResetting(true);
    const res = await resetNotificationTemplatesAction();
    setIsResetting(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      setLoanSms(DEFAULT_LOAN_SMS_TEMPLATE);
      setLoanEmailSubject(DEFAULT_LOAN_EMAIL_SUBJECT);
      setLoanEmailBody(DEFAULT_LOAN_EMAIL_BODY);
      setCardSms(DEFAULT_CARD_SMS_TEMPLATE);
      setCardEmailSubject(DEFAULT_CARD_EMAIL_SUBJECT);
      setCardEmailBody(DEFAULT_CARD_EMAIL_BODY);
      toast.success('Templates restored to standard defaults!');
    }
  };

  // Compute live rendered previews
  const previewSms = interpolateTemplate(
    activeCategory === 'loans' ? loanSms : cardSms,
    sampleValues
  );

  const previewEmailSubject = interpolateTemplate(
    activeCategory === 'loans' ? loanEmailSubject : cardEmailSubject,
    sampleValues
  );

  const previewEmailBody = interpolateTemplate(
    activeCategory === 'loans' ? loanEmailBody : cardEmailBody,
    sampleValues
  );

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900">
                Notification Message Templates
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                Customizable
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize the automated SMS and Email messages sent to borrowers and for your credit cards.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            disabled={isResetting || isSaving}
            onClick={handleResetDefaults}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            title="Reset templates to default"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            Reset Defaults
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveTemplates}
            className="bili-btn-primary py-2 px-4 text-xs font-semibold shadow-sm flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Templates
              </>
            )}
          </button>
        </div>
      </div>

      {/* Category Tabs: Loans vs Cards */}
      <div className="flex items-center gap-2 p-1.5 bg-[#F6F7F9] rounded-2xl">
        <button
          type="button"
          onClick={() => {
            setActiveCategory('loans');
            setFocusedField('loan_sms');
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeCategory === 'loans'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          🤝 Borrower Loan Reminders
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveCategory('cards');
            setFocusedField('card_sms');
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeCategory === 'cards'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          💳 Credit Card Bill Reminders
        </button>
      </div>

      {/* Channel Subtabs: SMS vs Email */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setActiveChannel('sms');
            setFocusedField(activeCategory === 'loans' ? 'loan_sms' : 'card_sms');
          }}
          className={`text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
            activeChannel === 'sms'
              ? 'bg-blue-50 text-blue-700 shadow-sm'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          SMS Text Template
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveChannel('email');
            setFocusedField(activeCategory === 'loans' ? 'loan_email_body' : 'card_email_body');
          }}
          className={`text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
            activeChannel === 'email'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Email Template
        </button>
      </div>

      {/* Dynamic Variables Toolbelt */}
      <div className="p-4 rounded-2xl bg-[#F6F7F9] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Click to Insert Dynamic Variables
          </span>
          <span className="text-[11px] text-slate-500">
            Replaced automatically on send
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {currentVariables.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => handleInsertVariable(v.key)}
              className="group bg-white hover:bg-blue-50 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 hover:text-blue-700 shadow-sm transition-all flex items-center gap-1.5"
              title={`${v.description} (e.g. ${v.sample})`}
            >
              <code className="text-blue-600 font-bold font-mono text-[11px]">
                &#123;&#123;{v.key}&#125;&#125;
              </code>
              <span className="text-slate-400 group-hover:text-blue-600 text-[11px]">
                {v.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Template Form (Left) vs Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Editor Form */}
        <div className="space-y-4">
          {activeChannel === 'sms' ? (
            /* SMS Textarea */
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  SMS Message Body
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  {(activeCategory === 'loans' ? loanSms : cardSms).length} characters
                </span>
              </div>
              <textarea
                rows={5}
                value={activeCategory === 'loans' ? loanSms : cardSms}
                onFocus={() =>
                  setFocusedField(activeCategory === 'loans' ? 'loan_sms' : 'card_sms')
                }
                onChange={(e) => {
                  if (activeCategory === 'loans') {
                    setLoanSms(e.target.value);
                  } else {
                    setCardSms(e.target.value);
                  }
                }}
                placeholder="Enter SMS template..."
                className="bili-input w-full text-sm font-sans resize-y leading-relaxed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Keep SMS under 160 characters when possible for standard single-segment delivery.
              </p>
            </div>
          ) : (
            /* Email Form */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={activeCategory === 'loans' ? loanEmailSubject : cardEmailSubject}
                  onFocus={() =>
                    setFocusedField(
                      activeCategory === 'loans' ? 'loan_email_sub' : 'card_email_sub'
                    )
                  }
                  onChange={(e) => {
                    if (activeCategory === 'loans') {
                      setLoanEmailSubject(e.target.value);
                    } else {
                      setCardEmailSubject(e.target.value);
                    }
                  }}
                  className="bili-input w-full text-sm font-semibold"
                  placeholder="Email subject..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Content Body
                </label>
                <textarea
                  rows={8}
                  value={activeCategory === 'loans' ? loanEmailBody : cardEmailBody}
                  onFocus={() =>
                    setFocusedField(
                      activeCategory === 'loans' ? 'loan_email_body' : 'card_email_body'
                    )
                  }
                  onChange={(e) => {
                    if (activeCategory === 'loans') {
                      setLoanEmailBody(e.target.value);
                    } else {
                      setCardEmailBody(e.target.value);
                    }
                  }}
                  className="bili-input w-full text-sm font-sans resize-y leading-relaxed"
                  placeholder="Enter email content..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Live Preview Column */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Live Output Preview (Recipient View)
            </span>
            <span className="text-[11px] text-slate-400">
              Sample test data rendered
            </span>
          </div>

          {activeChannel === 'sms' ? (
            /* SMS Bubble Preview */
            <div className="p-5 rounded-2xl bg-[#F6F7F9] space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1">
                <span className="font-semibold text-slate-600">📱 Text Message</span>
                <span>Today • Just now</span>
              </div>
              <div className="p-4 rounded-2xl bg-white text-slate-900 text-sm leading-relaxed shadow-sm whitespace-pre-wrap font-sans">
                {previewSms}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Delivered via httpSMS Gateway</span>
                <span>{previewSms.length} chars</span>
              </div>
            </div>
          ) : (
            /* Email Card Preview */
            <div className="p-5 rounded-2xl bg-[#F6F7F9] space-y-3">
              <div className="p-4 rounded-2xl bg-white shadow-sm space-y-3">
                <div className="space-y-1 pb-2">
                  <span className="text-[11px] text-slate-400 block">Subject:</span>
                  <div className="text-sm font-bold text-slate-900">
                    {previewEmailSubject}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    From: <span className="font-semibold text-slate-700">Tenvi &lt;alerts@tenvi.app&gt;</span>
                  </div>
                </div>

                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap pt-2">
                  {previewEmailBody}
                </div>
              </div>
              <div className="text-[11px] text-slate-400 text-center">
                Rendered with simulated data for {activeCategory === 'loans' ? 'Vevien Unciano' : 'upcoming cards'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
