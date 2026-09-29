import { z } from 'zod';
import {
  loginSchema,
  registerSchema,
  transactionSchema,
  creditCardSchema,
  loanSchema,
  loanPaymentSchema,
  billSplitSchema,
  savingsAccountSchema,
  savingsBalanceUpdateSchema,
  propertySchema,
} from '@/lib/validations/schemas';

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type CreditCardInput = z.infer<typeof creditCardSchema>;
export type LoanInput = z.infer<typeof loanSchema>;
export type LoanPaymentInput = z.infer<typeof loanPaymentSchema>;
export type BillSplitInput = z.infer<typeof billSplitSchema>;
export type SavingsAccountInput = z.infer<typeof savingsAccountSchema>;
export type PropertyInput = z.infer<typeof propertySchema>;

export interface SavingsAccount {
  id: string;
  website_id: string;
  user_id: string;
  name: string;
  account_type: 'digital_bank' | 'traditional_bank' | 'cash' | 'ewallet';
  institution_name: string;
  account_number_last4?: string | null;
  current_balance: number;
  target_amount?: number | null;
  interest_rate?: number | null;
  color_theme: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  website_id: string;
  user_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  website_id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  kind: 'expense' | 'income';
  is_default: boolean;
  created_at: string;
}

export interface CreditCard {
  id: string;
  website_id: string;
  user_id: string;
  name: string;
  bank_name: string;
  last_4: string;
  credit_limit: number;
  statement_day: number;
  due_day: number;
  color_theme: string;
  is_active: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  website_id: string;
  user_id: string;
  kind: 'income' | 'expense';
  amount: number;
  category_id?: string | null;
  payment_method: string;
  credit_card_id?: string | null;
  savings_id?: string | null;
  property_id?: string | null;
  loan_id?: string | null;
  occurred_on: string;
  note?: string | null;
  created_at: string;
  category?: Category | null;
  credit_card?: CreditCard | null;
  savings?: SavingsAccount | null;
  property?: Property | null;
  loan?: Loan | null;
}

export type PropertyType = 'vehicle' | 'real_estate' | 'commercial' | 'land' | 'equipment' | 'other';
export type PropertyStatus = 'active' | 'maintenance' | 'inactive' | 'sold';

export interface Property {
  id: string;
  website_id: string;
  user_id: string;
  name: string;
  property_type: PropertyType;
  identifier?: string | null;
  estimated_value: number;
  purchase_price?: number | null;
  purchase_date?: string | null;
  monthly_amortization?: number | null;
  amortization_due_day?: number | null;
  annual_insurance_amount?: number | null;
  insurance_renewal_date?: string | null;
  expected_income_daily?: number | null;
  expected_income_monthly?: number | null;
  color_theme: string;
  status: PropertyStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  documents?: PropertyDocument[];
}

export type PropertyDocumentType =
  | 'or_cr'
  | 'insurance_policy'
  | 'ltfrb_franchise'
  | 'deed_of_sale'
  | 'pms_record'
  | 'tax_declaration'
  | 'lease_contract'
  | 'warranty'
  | 'other';

export interface PropertyDocument {
  id: string;
  website_id: string;
  user_id: string;
  property_id: string;
  title: string;
  document_type: PropertyDocumentType;
  document_number?: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  notify_before_days: number;
  notify_email: boolean;
  notify_sms: boolean;
  last_notified_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  property?: Property | null;
}


export interface Loan {
  id: string;
  website_id: string;
  user_id: string;
  contact_id: string;
  amount: number;
  balance_remaining: number;
  status: 'unpaid' | 'partial' | 'paid';
  reason?: string | null;
  loaned_on: string;
  due_date?: string | null;
  is_installment: boolean;
  installment_months?: number | null;
  monthly_due_day?: number | null;
  monthly_amount?: number | null;
  monthly_interest_rate?: number | null;
  total_interest?: number | null;
  credit_card_id?: string | null;
  downpayment_amount?: number;
  downpayment_paid?: boolean;
  borrower_phone?: string | null;
  borrower_email?: string | null;
  notify_borrower?: boolean;
  created_at: string;
  contact?: Contact | null;
  credit_card?: CreditCard | null;
  payments?: LoanPayment[];
  installments?: LoanInstallment[];
  transactions?: Transaction[];
}

export interface LoanInstallment {
  id: string;
  website_id: string;
  user_id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  statement_date?: string | null;
  amount: number;
  principal_amount?: number | null;
  interest_amount?: number | null;
  is_paid: boolean;
  paid_on?: string | null;
  payment_method?: string | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanPayment {
  id: string;
  website_id: string;
  user_id: string;
  loan_id: string;
  amount: number;
  payment_method: string;
  paid_on: string;
  note?: string | null;
  created_at: string;
}

export interface BillSplit {
  id: string;
  website_id: string;
  user_id: string;
  title: string;
  total_amount: number;
  credit_card_id?: string | null;
  occurred_on: string;
  note?: string | null;
  created_at: string;
  credit_card?: CreditCard | null;
  participants?: SplitParticipant[];
}

export interface SplitParticipant {
  id: string;
  website_id: string;
  user_id: string;
  split_id: string;
  contact_id: string;
  share_amount: number;
  is_paid: boolean;
  paid_on?: string | null;
  payment_note?: string | null;
  contact?: Contact | null;
}

export interface NotificationSettings {
  id: string;
  website_id: string;
  user_id: string;
  notify_email: boolean;
  email_address?: string | null;
  notify_sms: boolean;
  phone_number?: string | null;
  days_before: number;
  last_notified_at?: string | null;
  loan_sms_template?: string | null;
  loan_email_subject?: string | null;
  loan_email_body?: string | null;
  card_sms_template?: string | null;
  card_email_subject?: string | null;
  card_email_body?: string | null;
  smtp_email?: string | null;
  smtp_app_password?: string | null;
  httpsms_api_key?: string | null;
  httpsms_from_number?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  website_id: string;
  user_id: string;
  channel: 'email' | 'sms';
  recipient: string;
  card_names?: string | null;
  loan_id?: string | null;
  document_id?: string | null;
  email_subject?: string | null;
  message_body: string;
  status: 'sent' | 'simulated' | 'failed';
  error_message?: string | null;
  sent_date: string;
  created_at: string;
  document?: PropertyDocument | null;
}

export interface NotificationLogsStats {
  total: number;
  sent: number;
  simulated: number;
  failed: number;
  email: number;
  sms: number;
}

export interface GetNotificationLogsOptions {
  page?: number;
  limit?: number;
  search?: string;
  channel?: 'all' | 'email' | 'sms';
  status?: 'all' | 'sent' | 'simulated' | 'failed';
}

export interface GetNotificationLogsResponse {
  logs: NotificationLog[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  stats?: NotificationLogsStats;
  error?: string;
}

export interface GeminiUsageLog {
  id: string;
  website_id: string;
  user_id: string;
  feature: 'statement_vision' | 'ai_chat' | 'test_connection';
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  status: 'success' | 'rate_limit' | 'error';
  error_message?: string | null;
  latency_ms: number;
  created_at: string;
}

export interface GeminiUsageStats {
  hasKeyConfigured: boolean;
  maskedKey: string;
  dailyRequestsUsed: number;
  dailyRequestsLimit: number;
  dailyPercentUsed: number;
  dailyRemainingRequests: number;
  minuteRateLimit: number;
  tokensUsedToday: number;
  usageByFeature: {
    statementVision: number;
    aiChat: number;
    other: number;
  };
  lastRequestAt?: string | null;
  resetHoursRemaining: number;
}

export interface UserOnboarding {
  id: string;
  website_id: string;
  user_id: string;
  completed: boolean;
  step: number;
  dismissed_checklist: boolean;
  has_added_account: boolean;
  has_added_transaction: boolean;
  has_added_card_or_loan: boolean;
  has_tried_ai: boolean;
  preferred_modules: string[];
  created_at: string;
  updated_at: string;
}



