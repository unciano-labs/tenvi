'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Mail,
  Sparkles,
  RotateCcw,
  Smartphone,
  Save,
  Loader2,
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

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
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

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
  };

  const handleSave = async () => {
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
      toast.success('Alert message templates saved successfully!');
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

  const handleConfirmReset = async () => {
    setIsResetConfirmOpen(false);
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
    <Card className="shadow-card space-y-6 p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
            <MessageSquare className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-foreground">
                Notification Message Templates
              </h2>
              <Badge variant="secondary">
                Customizable
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customize the automated SMS and Email messages sent to borrowers and for your credit cards.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isResetting || isSaving}
            onClick={() => setIsResetConfirmOpen(true)}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <RotateCcw className="mr-1.5 size-3.5 text-muted-foreground" />
            Reset Defaults
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isSaving}
            onClick={handleSave}
            className="text-xs font-semibold cursor-pointer shadow-none min-h-10 px-4"
          >
            {isSaving ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-3.5" />
            )}
            {isSaving ? 'Saving...' : 'Save Templates'}
          </Button>
        </div>
      </div>

      {/* Category Pills (Loans vs Cards) */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/60 w-fit">
        <Button
          type="button"
          variant={activeCategory === 'loans' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => {
            setActiveCategory('loans');
            setFocusedField('loan_sms');
          }}
          className="rounded-xl text-xs font-semibold min-h-9 px-4"
        >
          Borrower Payment Reminders
        </Button>
        <Button
          type="button"
          variant={activeCategory === 'cards' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => {
            setActiveCategory('cards');
            setFocusedField('card_sms');
          }}
          className="rounded-xl text-xs font-semibold min-h-9 px-4"
        >
          Credit Card Due Reminders
        </Button>
      </div>

      {/* Channel Pills (SMS vs Email) */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={activeChannel === 'sms' ? 'soft' : 'ghost'}
          size="sm"
          onClick={() => setActiveChannel('sms')}
          className="rounded-xl text-xs font-semibold px-4 min-h-9"
        >
          <Smartphone className="mr-1.5 size-3.5" />
          SMS Template
        </Button>

        <Button
          type="button"
          variant={activeChannel === 'email' ? 'soft' : 'ghost'}
          size="sm"
          onClick={() => {
            setActiveChannel('email');
            setFocusedField(activeCategory === 'loans' ? 'loan_email_sub' : 'card_email_sub');
          }}
          className="rounded-xl text-xs font-semibold px-4 min-h-9"
        >
          <Mail className="mr-1.5 size-3.5" />
          Email Template
        </Button>
      </div>

      {/* Dynamic Variables Toolbelt with Button chips (TNV-041) */}
      <div className="p-4 rounded-2xl bg-muted/60 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            Click to Insert Dynamic Variables
          </span>
          <span className="text-xs text-muted-foreground">
            Replaced automatically on send
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {currentVariables.map((v) => (
            <Button
              key={v.key}
              type="button"
              variant="soft"
              size="sm"
              onClick={() => handleInsertVariable(v.key)}
              className="h-8 px-2.5 text-xs font-mono font-medium cursor-pointer"
              title={`${v.description} (e.g. ${v.sample})`}
            >
              <span className="text-primary font-bold">&#123;&#123;{v.key}&#125;&#125;</span>
              <span className="text-muted-foreground font-sans ml-1 text-2xs">({v.label})</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Main Grid: Template Form (Left) vs Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Editor Form */}
        <div className="space-y-4">
          {activeChannel === 'sms' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground">
                  SMS Message Body
                </label>
                <span className="text-xs font-mono text-muted-foreground">
                  {(activeCategory === 'loans' ? loanSms : cardSms).length} characters
                </span>
              </div>
              <Textarea
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
                className="text-sm resize-y leading-relaxed"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Keep SMS under 160 characters when possible for standard single-segment delivery.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Email Subject Line
                </label>
                <Input
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
                  className="text-sm font-semibold"
                  placeholder="Email subject..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Email Content Body
                </label>
                <Textarea
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
                  className="text-sm resize-y leading-relaxed"
                  placeholder="Enter email content..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Live Preview Column */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              Live Output Preview (Recipient View)
            </span>
            <span className="text-xs text-muted-foreground">
              Sample test data rendered
            </span>
          </div>

          {activeChannel === 'sms' ? (
            <div className="p-5 rounded-2xl bg-muted/60 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                <span className="font-semibold text-foreground">📱 Text Message</span>
                <span>Today • Just now</span>
              </div>
              <div className="p-4 rounded-2xl bg-card text-foreground text-sm leading-relaxed shadow-card whitespace-pre-wrap font-sans">
                {previewSms}
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>Delivered via httpSMS Gateway</span>
                <span>{previewSms.length} chars</span>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-muted/60 space-y-3">
              <div className="p-4 rounded-2xl bg-card shadow-card space-y-3">
                <div className="space-y-1 pb-2">
                  <span className="text-xs text-muted-foreground block">Subject:</span>
                  <div className="text-sm font-bold text-foreground">
                    {previewEmailSubject}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    From: <span className="font-semibold text-foreground">Tenvi &lt;alerts@tenvi.app&gt;</span>
                  </div>
                </div>

                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pt-2">
                  {previewEmailBody}
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                Rendered with simulated data for {activeCategory === 'loans' ? 'sample loan' : 'upcoming cards'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Reset Defaults */}
      <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Alert Templates?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset all notification templates back to the default text? Any custom changes will be overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              className="bg-primary text-primary-foreground"
            >
              Reset to Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
