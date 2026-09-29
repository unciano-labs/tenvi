import { formatMoney, formatDate } from '@/lib/finance/calculations';

export interface TemplateVariable {
  key: string;
  label: string;
  sample: string;
  description: string;
}

export const LOAN_TEMPLATE_VARIABLES: TemplateVariable[] = [
  {
    key: 'borrower_name',
    label: 'Borrower Name',
    sample: 'Vevien Unciano',
    description: 'Name of the person who borrowed the money',
  },
  {
    key: 'amount_due',
    label: 'Amount Due',
    sample: '₱1,418.92',
    description: 'Upcoming installment or payment amount due',
  },
  {
    key: 'due_date',
    label: 'Due Date',
    sample: 'Oct 20, 2026',
    description: 'Scheduled due date of the upcoming payment',
  },
  {
    key: 'days_remaining',
    label: 'Due Countdown',
    sample: 'Due in 3 days',
    description: 'Human-friendly countdown (e.g. Due in 3 days, Due today)',
  },
  {
    key: 'loan_title',
    label: 'Loan Reason / Item',
    sample: 'Apple iPad 11th Gen',
    description: 'Reason or item recorded for this loan',
  },
  {
    key: 'installment_info',
    label: 'Installment Term',
    sample: 'Month #1 of 24',
    description: 'Current installment number and total duration',
  },
  {
    key: 'balance_remaining',
    label: 'Remaining Balance',
    sample: '₱34,054.00',
    description: 'Total balance left on the entire loan',
  },
  {
    key: 'lender_name',
    label: 'Lender / App Name',
    sample: 'Tenvi',
    description: 'Name of the lender or tracker app',
  },
];

export const CARD_TEMPLATE_VARIABLES: TemplateVariable[] = [
  {
    key: 'card_count',
    label: 'Card Count',
    sample: '2',
    description: 'Number of credit cards due in the window',
  },
  {
    key: 'card_list',
    label: 'Cards Summary List',
    sample:
      '1) BDO Visa (•••• 4321): Due in 3 days (Oct 20, 2026)\n2) BPI Gold (•••• 8820): Due in 2 days (Oct 19, 2026)',
    description: 'Formatted itemized breakdown of cards due',
  },
  {
    key: 'days_before',
    label: 'Notice Days',
    sample: '3',
    description: 'Number of days before due date configured in settings',
  },
  {
    key: 'app_url',
    label: 'Card Dashboard Link',
    sample: 'https://tenvi.app/dashboard/cards',
    description: 'Direct link to view card statements in Tenvi',
  },
];

export const DEFAULT_LOAN_SMS_TEMPLATE =
  '[Tenvi Reminder] Kumusta {{borrower_name}}! Gentle reminder regarding your loan ({{loan_title}}). Upcoming payment: {{amount_due}} for {{installment_info}} due on {{due_date}} ({{days_remaining}}). Balance remaining: {{balance_remaining}}. Salamat!';

export const DEFAULT_LOAN_EMAIL_SUBJECT =
  'Friendly Loan Payment Reminder - {{amount_due}} ({{days_remaining}})';

export const DEFAULT_LOAN_EMAIL_BODY = `Kumusta {{borrower_name}}!

This is a friendly reminder regarding your loan record ({{loan_title}}).

• Next Due Date: {{due_date}} ({{days_remaining}})
• Amount Due: {{amount_due}} ({{installment_info}})
• Remaining Balance: {{balance_remaining}}

Kindly settle on or before your due date. Thank you very much!

Sent via {{lender_name}}`;

export const DEFAULT_CARD_SMS_TEMPLATE =
  '[Tenvi Alert] Kumusta! You have {{card_count}} credit card bill(s) upcoming:\n{{card_list}}\nPay on time to keep your credit healthy! {{app_url}}';

export const DEFAULT_CARD_EMAIL_SUBJECT =
  'Upcoming Credit Card Bill Reminder ({{card_count}} due soon)';

export const DEFAULT_CARD_EMAIL_BODY = `Kumusta!

This is your automated daily bill reminder for credit cards due within the next {{days_before}} days:

{{card_list}}

Review your statement and record repayments on Tenvi:
{{app_url}}

- The Tenvi Wealth Team`;

/**
 * Replace all {{variable_name}} tokens with actual values.
 * Whitespace inside braces is tolerated (e.g. {{ borrower_name }}).
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string | number | undefined | null>
): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    const val = variables[key];
    if (val === undefined || val === null) {
      return '';
    }
    return String(val);
  });
}

/**
 * Build dynamic sample variables for live preview
 */
export function getSampleLoanVariables(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const v of LOAN_TEMPLATE_VARIABLES) {
    map[v.key] = v.sample;
  }
  return map;
}

export function getSampleCardVariables(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const v of CARD_TEMPLATE_VARIABLES) {
    map[v.key] = v.sample;
  }
  return map;
}

/**
 * Builds standard loan template variables from loan data
 */
export function buildLoanNotificationVariables({
  borrowerName,
  loanTitle,
  dueDate,
  daysRemaining,
  amountDue,
  installmentInfo,
  balanceRemaining,
  lenderName = 'Tenvi',
}: {
  borrowerName: string;
  loanTitle?: string | null;
  dueDate: string;
  daysRemaining: number;
  amountDue: number;
  installmentInfo?: string | null;
  balanceRemaining: number;
  lenderName?: string;
}): Record<string, string> {
  const countdownLabel =
    daysRemaining < 0
      ? `Overdue by ${Math.abs(daysRemaining)} days`
      : daysRemaining === 0
      ? 'Due today'
      : daysRemaining === 1
      ? 'Due tomorrow'
      : `Due in ${daysRemaining} days`;

  return {
    borrower_name: borrowerName || 'Borrower',
    loan_title: loanTitle || 'Personal Loan',
    due_date: formatDate(dueDate),
    days_remaining: countdownLabel,
    amount_due: formatMoney(amountDue),
    installment_info: installmentInfo || 'Scheduled Payment',
    balance_remaining: formatMoney(balanceRemaining),
    lender_name: lenderName,
  };
}

/**
 * Builds standard card template variables from card data
 */
export function buildCardNotificationVariables({
  cardCount,
  cardList,
  daysBefore,
  appUrl = 'https://tenvi.app/dashboard/cards',
}: {
  cardCount: number;
  cardList: string;
  daysBefore: number;
  appUrl?: string;
}): Record<string, string> {
  return {
    card_count: String(cardCount),
    card_list: cardList,
    days_before: String(daysBefore),
    app_url: appUrl,
  };
}

export const DOCUMENT_TEMPLATE_VARIABLES: TemplateVariable[] = [

  {
    key: 'property_name',
    label: 'Property / Asset Name',
    sample: 'Toyota Vios 1.3 XLE',
    description: 'Name of the linked property or vehicle asset',
  },
  {
    key: 'document_title',
    label: 'Document Title',
    sample: 'LTO Official Receipt & CR (2026)',
    description: 'Title of the uploaded document or compliance certificate',
  },
  {
    key: 'document_type',
    label: 'Document Category',
    sample: 'OR/CR (LTO)',
    description: 'Category of document (e.g. OR/CR, LTFRB Franchise, Insurance)',
  },
  {
    key: 'document_number',
    label: 'Reference / Policy Number',
    sample: 'NBC 1234 / CR-90281',
    description: 'Identifier, plate number, policy number, or case number',
  },
  {
    key: 'expiry_date',
    label: 'Expiry Date',
    sample: 'Oct 15, 2026',
    description: 'Document expiration date',
  },
  {
    key: 'days_remaining',
    label: 'Days Countdown',
    sample: 'Expires in 14 days',
    description: 'Relative countdown or overdue label',
  },
  {
    key: 'app_url',
    label: 'Document Link',
    sample: 'https://tenvi.app/dashboard/properties',
    description: 'Direct link to view property details and documents',
  },
];

export const DEFAULT_DOCUMENT_SMS_TEMPLATE =
  '[Tenvi Alert] ⚠️ Document Alert: {{document_title}} for {{property_name}} {{days_remaining}} ({{expiry_date}}). Ref #: {{document_number}}. Please renew promptly.';

export const DEFAULT_DOCUMENT_EMAIL_SUBJECT =
  '[Tenvi Alert] Document Expiration Alert: {{document_title}} for {{property_name}} ({{days_remaining}})';

export const DEFAULT_DOCUMENT_EMAIL_BODY = `Kumusta!

This is an automated reminder regarding an expiring asset compliance document:

• Asset / Property: {{property_name}}
• Document: {{document_title}} ({{document_type}})
• Reference / Policy #: {{document_number}}
• Expiration Date: {{expiry_date}} ({{days_remaining}})

Please prepare renewal requirements (e.g. LTO inspection & emission, LTFRB franchise renewal, or insurance policy premium) to prevent penalties or lapses in coverage.

Manage and view your documents:
{{app_url}}

- Tenvi Asset & Wealth Management`;

/**
 * Builds standard document template variables from document & property data
 */
export function buildDocumentNotificationVariables({
  propertyName,
  documentTitle,
  documentType,
  documentNumber,
  expiryDate,
  daysRemaining,
  appUrl = 'https://tenvi.app/dashboard/properties',
}: {
  propertyName: string;
  documentTitle: string;
  documentType: string;
  documentNumber?: string | null;
  expiryDate: string;
  daysRemaining: number;
  appUrl?: string;
}): Record<string, string> {
  const countdownLabel =
    daysRemaining < 0
      ? `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} ago`
      : daysRemaining === 0
      ? 'Expires today'
      : daysRemaining === 1
      ? 'Expires tomorrow'
      : `Expires in ${daysRemaining} days`;

  return {
    property_name: propertyName,
    document_title: documentTitle,
    document_type: documentType,
    document_number: documentNumber || 'N/A',
    expiry_date: formatDate(expiryDate),
    days_remaining: countdownLabel,
    app_url: appUrl,
  };
}


