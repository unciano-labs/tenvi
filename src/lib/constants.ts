// Canonical Tenvi Multi-tenant Website & Role constants
export const TENVI_WEBSITE_ID = '65d4f86e-1829-417a-981f-bc7aad7bc953';
export const TENVI_DEFAULT_ROLE_ID = '02bf8818-b503-4f94-beac-6c45aa12e368';

function sanitizeUuid(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  const cleaned = val.trim().replace(/^["']|["']$/g, '').trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(cleaned) ? cleaned : fallback;
}

export const WEBSITE_ID = sanitizeUuid(
  process.env.NEXT_PUBLIC_WEBSITE_ID || process.env.WEBSITE_ID,
  TENVI_WEBSITE_ID
);

export const DEFAULT_ROLE_ID = sanitizeUuid(
  process.env.NEXT_PUBLIC_DEFAULT_ROLE_ID || process.env.DEFAULT_ROLE_ID,
  TENVI_DEFAULT_ROLE_ID
);

// Default Currency for display
export const DEFAULT_CURRENCY = 'PHP';
export const CURRENCY_SYMBOL = '₱';

// Curated List of Philippine Banks that offer Credit Cards
export const PH_CREDIT_CARD_BANKS = [
  'BDO Unibank',
  'BPI (Bank of the Philippine Islands)',
  'Metrobank',
  'UnionBank of the Philippines',
  'RCBC Credit (Bankard)',
  'Security Bank',
  'EastWest Bank',
  'PNB (Philippine National Bank)',
  'Chinabank',
  'HSBC Philippines',
  'Bank of Commerce (BankCom)',
  'Landbank of the Philippines',
  'AUB (Asia United Bank)',
  'Maybank Philippines',
  'Atome Card',
  'Other Bank',
] as const;

// Installment loan terms in months
export const INSTALLMENT_MONTHS_OPTIONS = [3, 6, 12, 24, 36, 48, 60] as const;
export type InstallmentMonths = (typeof INSTALLMENT_MONTHS_OPTIONS)[number];

// Curated List of Philippine Savings Institutions (Cash, Digital Banks, Traditional Banks, E-Wallets)
export const PH_SAVINGS_INSTITUTIONS = [
  // 1. Cash
  { name: 'Cash on Hand / Physical Wallet', type: 'cash', group: 'Cash' },
  { name: 'Emergency Cash Fund (Envelope / Vault)', type: 'cash', group: 'Cash' },

  // 2. Digital Banks (High-Yield Interest & Popular)
  { name: 'Maya Savings', type: 'digital_bank', group: 'Digital Banks' },
  { name: 'CIMB Bank (GSave / UpSave)', type: 'digital_bank', group: 'Digital Banks' },
  { name: 'MariBank (Shopee)', type: 'digital_bank', group: 'Digital Banks' },
  { name: 'GoTyme Bank (Robinsons)', type: 'digital_bank', group: 'Digital Banks' },
  { name: 'SeaBank (Shopee)', type: 'digital_bank', group: 'Digital Banks' },
  { name: 'Tonik Digital Bank', type: 'digital_bank', group: 'Digital Banks' },
  { name: 'OwnBank', type: 'digital_bank', group: 'Digital Banks' },
  { name: 'Netbank Mobile', type: 'digital_bank', group: 'Digital Banks' },
  { name: 'UNO Digital Bank', type: 'digital_bank', group: 'Digital Banks' },
  { name: 'DiskarTech (RCBC)', type: 'digital_bank', group: 'Digital Banks' },
  { name: 'Komo (EastWest)', type: 'digital_bank', group: 'Digital Banks' },

  // 3. Traditional Commercial & Universal Banks
  { name: 'BDO (Banco de Oro)', type: 'traditional_bank', group: 'Traditional Banks' },
  { name: 'BPI (Bank of the Philippine Islands)', type: 'traditional_bank', group: 'Traditional Banks' },
  { name: 'Metrobank', type: 'traditional_bank', group: 'Traditional Banks' },
  { name: 'UnionBank of the Philippines', type: 'traditional_bank', group: 'Traditional Banks' },
  { name: 'Security Bank', type: 'traditional_bank', group: 'Traditional Banks' },
  { name: 'RCBC (Rizal Commercial Banking Corp)', type: 'traditional_bank', group: 'Traditional Banks' },
  { name: 'PNB (Philippine National Bank)', type: 'traditional_bank', group: 'Traditional Banks' },
  { name: 'Chinabank (China Banking Corp)', type: 'traditional_bank', group: 'Traditional Banks' },
  { name: 'EastWest Bank', type: 'traditional_bank', group: 'Traditional Banks' },
  { name: 'Landbank of the Philippines', type: 'traditional_bank', group: 'Traditional Banks' },
  { name: 'DBP (Development Bank of the Philippines)', type: 'traditional_bank', group: 'Traditional Banks' },
  { name: 'Bank of Commerce (BankCom)', type: 'traditional_bank', group: 'Traditional Banks' },
  { name: 'PSBank (Philippine Savings Bank)', type: 'traditional_bank', group: 'Traditional Banks' },
  { name: 'AUB (Asia United Bank)', type: 'traditional_bank', group: 'Traditional Banks' },
  { name: 'Maybank Philippines', type: 'traditional_bank', group: 'Traditional Banks' },
  { name: 'HSBC Philippines', type: 'traditional_bank', group: 'Traditional Banks' },
  { name: 'PBCom (Philippine Bank of Communications)', type: 'traditional_bank', group: 'Traditional Banks' },
  { name: 'Robinsons Bank', type: 'traditional_bank', group: 'Traditional Banks' },

  // 4. E-Wallets
  { name: 'GCash Wallet', type: 'ewallet', group: 'E-Wallets' },
  { name: 'Maya Wallet', type: 'ewallet', group: 'E-Wallets' },
  { name: 'GrabPay', type: 'ewallet', group: 'E-Wallets' },

  // 5. Other
  { name: 'Other Bank / Account', type: 'traditional_bank', group: 'Other' },
] as const;

// Friendly Payment Methods for Everyday Users
export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: 'Banknote', color: 'emerald' },
  { id: 'gcash', label: 'GCash', icon: 'Smartphone', color: 'blue' },
  { id: 'maya', label: 'Maya', icon: 'Zap', color: 'green' },
  { id: 'credit_card', label: 'Credit Card', icon: 'CreditCard', color: 'indigo' },
  { id: 'debit_card', label: 'Debit Card', icon: 'CreditCard', color: 'cyan' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: 'Building2', color: 'slate' },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['id'];

// Default Categories seeded for new users
export const DEFAULT_CATEGORIES = [
  // Expenses (Money Out)
  { name: 'Food & Groceries', icon: 'ShoppingCart', kind: 'expense', color: '#0F172A' },
  { name: 'Dining Out', icon: 'Utensils', kind: 'expense', color: '#0F172A' },
  { name: 'Commute & Gas', icon: 'Car', kind: 'expense', color: '#0F172A' },
  { name: 'Electric & Water Bills', icon: 'Zap', kind: 'expense', color: '#0F172A' },
  { name: 'Internet & Phone', icon: 'Wifi', kind: 'expense', color: '#0F172A' },
  { name: 'Shopping & Clothes', icon: 'ShoppingBag', kind: 'expense', color: '#0F172A' },
  { name: 'Health & Medical', icon: 'HeartPulse', kind: 'expense', color: '#0F172A' },
  { name: 'Entertainment & Subs', icon: 'Tv', kind: 'expense', color: '#0F172A' },
  { name: 'Other Expense', icon: 'MoreHorizontal', kind: 'expense', color: '#0F172A' },

  // Incomes (Money In)
  { name: 'Salary & Wages', icon: 'Wallet', kind: 'income', color: '#0F172A' },
  { name: 'Freelance & Side Gig', icon: 'Briefcase', kind: 'income', color: '#0F172A' },
  { name: 'Investments / Dividends', icon: 'TrendingUp', kind: 'income', color: '#0F172A' },
  { name: 'Gifts & Allowance', icon: 'Gift', kind: 'income', color: '#0F172A' },
  { name: 'Other Income', icon: 'PlusCircle', kind: 'income', color: '#0F172A' },
] as const;

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

export interface DocumentTypeOption {
  value: PropertyDocumentType;
  label: string;
  category: 'vehicle' | 'real_estate' | 'general';
  description: string;
}

export const DOCUMENT_TYPE_PRESETS: DocumentTypeOption[] = [
  {
    value: 'or_cr',
    label: 'OR / CR (LTO Official Receipt & Certificate of Registration)',
    category: 'vehicle',
    description: 'Annual LTO motor vehicle registration and proof of ownership',
  },
  {
    value: 'insurance_policy',
    label: 'Insurance Policy (Comprehensive / TPL)',
    category: 'general',
    description: 'Motor vehicle, fire, liability, or comprehensive insurance',
  },
  {
    value: 'ltfrb_franchise',
    label: 'LTFRB Franchise / CPC / Provisional Authority',
    category: 'vehicle',
    description: 'Certificate of Public Convenience for taxi, TNVS, van, or fleet',
  },
  {
    value: 'deed_of_sale',
    label: 'Deed of Absolute Sale / Transfer Documents',
    category: 'general',
    description: 'Notarized sales contract or transfer of ownership record',
  },
  {
    value: 'pms_record',
    label: 'PMS Maintenance / Emission / Inspection',
    category: 'vehicle',
    description: 'Periodic maintenance service, emission test, or safety check',
  },
  {
    value: 'tax_declaration',
    label: 'Real Property Tax (Amilyar) / Title / Tax Dec',
    category: 'real_estate',
    description: 'Annual municipal property tax (amilyar) or Transfer Certificate of Title',
  },
  {
    value: 'lease_contract',
    label: 'Lease / Tenancy / Rental Contract',
    category: 'real_estate',
    description: 'Commercial or residential lease agreement with renewal period',
  },
  {
    value: 'warranty',
    label: 'Warranty Certificate / Service Manual',
    category: 'general',
    description: 'Manufacturer or dealer warranty and service booklet',
  },
  {
    value: 'other',
    label: 'Other Compliance / Official Document',
    category: 'general',
    description: 'Custom permits, licenses, or agreements',
  },
];

