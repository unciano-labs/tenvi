import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Please enter your full name'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const transactionSchema = z.object({
  kind: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  categoryId: z.string().uuid().optional().nullable(),
  paymentMethod: z.enum([
    'cash',
    'credit_card',
    'debit_card',
    'gcash',
    'maya',
    'bank_transfer',
  ]),
  creditCardId: z.string().uuid().optional().nullable(),
  savingsId: z.string().uuid().optional().nullable(),
  propertyId: z.string().uuid().optional().nullable(),
  occurredOn: z.string().min(1, 'Please select a date'),
  note: z.string().max(300, 'Note is too long').optional().nullable(),
});

export const creditCardSchema = z.object({
  name: z.string().min(2, 'Card nickname is required (e.g. BDO Gold)'),
  bankName: z.string().min(2, 'Bank name is required (e.g. BDO, BPI, UnionBank)'),
  last4: z
    .string()
    .length(4, 'Enter exactly the last 4 digits')
    .regex(/^\d{4}$/, 'Must be 4 numbers'),
  creditLimit: z.coerce.number().min(0, 'Credit limit cannot be negative').default(0),
  statementDay: z.coerce
    .number()
    .int()
    .min(1, 'Day must be between 1 and 31')
    .max(31, 'Day must be between 1 and 31'),
  dueDay: z.coerce
    .number()
    .int()
    .min(1, 'Day must be between 1 and 31')
    .max(31, 'Day must be between 1 and 31'),
  colorTheme: z.string().default('slate'),
});

export const loanSchema = z.object({
  contactId: z.string().uuid().optional().nullable(),
  newContactName: z.string().optional().nullable(),
  amount: z.coerce.number().positive('Loan amount must be greater than zero'),
  reason: z.string().max(200, 'Reason is too long').optional().nullable(),
  loanedOn: z.string().min(1, 'Date is required'),
  dueDate: z.string().optional().nullable(),
  isInstallment: z.boolean().default(false),
  installmentMonths: z.coerce.number().optional().nullable(),
  monthlyDueDay: z.coerce.number().min(1).max(31).optional().nullable(),
  monthlyInterestRate: z.coerce.number().min(0, 'Interest rate cannot be negative').default(0).optional().nullable(),
  creditCardId: z.string().uuid().optional().nullable(),
  downpaymentAmount: z.coerce.number().min(0, 'Downpayment cannot be negative').default(0).optional().nullable(),
  downpaymentPaymentMethod: z.string().default('cash').optional(),
  borrowerPhone: z.string().optional().nullable().or(z.literal('')),
  borrowerEmail: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  notifyBorrower: z.boolean().default(true),
});

export const updateLoanSchema = loanSchema.extend({
  loanId: z.string().uuid('Invalid loan ID'),
});

export const loanPaymentSchema = z.object({
  loanId: z.string().uuid(),
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  paymentMethod: z.string().default('cash'),
  paidOn: z.string().min(1, 'Payment date is required'),
  note: z.string().max(200).optional().nullable(),
});

export const billSplitSchema = z.object({
  title: z.string().min(2, 'What was this bill for? (e.g. Dinner with Friends)'),
  totalAmount: z.coerce.number().positive('Bill total must be greater than zero'),
  creditCardId: z.string().uuid().optional().nullable(),
  occurredOn: z.string().min(1, 'Date is required'),
  note: z.string().max(200).optional().nullable(),
  participants: z
    .array(
      z.object({
        contactId: z.string().uuid().optional().nullable(),
        name: z.string().min(1, 'Name is required'),
        shareAmount: z.coerce.number().min(0, 'Share amount cannot be negative'),
      })
    )
    .min(1, 'Please add at least one person to split with'),
});

export const savingsAccountSchema = z.object({
  name: z.string().min(2, 'Account or goal nickname is required (e.g. Emergency Fund)'),
  accountType: z.enum(['digital_bank', 'traditional_bank', 'cash', 'ewallet']),
  institutionName: z.string().min(2, 'Please select or enter the bank or account type'),
  accountNumberLast4: z.string().max(8).optional().nullable(),
  currentBalance: z.coerce.number().min(0, 'Balance cannot be negative').default(0),
  targetAmount: z.coerce.number().min(0).optional().nullable(),
  interestRate: z.coerce.number().min(0).max(100).optional().nullable(),
  colorTheme: z.string().default('emerald'),
});

export const savingsBalanceUpdateSchema = z.object({
  id: z.string().uuid(),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  type: z.enum(['deposit', 'withdraw', 'set']),
});

export const notificationSettingsSchema = z.object({
  notifyEmail: z.boolean().default(true),
  emailAddress: z.string().email('Please enter a valid email address').optional().nullable().or(z.literal('')),
  notifySms: z.boolean().default(false),
  phoneNumber: z.string().optional().nullable().or(z.literal('')),
  daysBefore: z.coerce.number().min(1, 'Minimum is 1 day').max(14, 'Maximum is 14 days').default(3),
  loanSmsTemplate: z.string().optional().nullable(),
  loanEmailSubject: z.string().optional().nullable(),
  loanEmailBody: z.string().optional().nullable(),
  cardSmsTemplate: z.string().optional().nullable(),
  cardEmailSubject: z.string().optional().nullable(),
  cardEmailBody: z.string().optional().nullable(),
  smtpEmail: z.string().optional().nullable().or(z.literal('')),
  smtpAppPassword: z.string().optional().nullable().or(z.literal('')),
  httpsmsApiKey: z.string().optional().nullable().or(z.literal('')),
  httpsmsFromNumber: z.string().optional().nullable().or(z.literal('')),
});

export const propertySchema = z.object({
  name: z.string().min(2, 'Property or asset name is required (e.g. Toyota Vios Grab, BGC Studio)'),
  propertyType: z.enum(['vehicle', 'real_estate', 'commercial', 'land', 'equipment', 'other']),
  identifier: z.string().max(50).optional().nullable(),
  estimatedValue: z.coerce.number().min(0, 'Estimated value cannot be negative').default(0),
  purchasePrice: z.coerce.number().min(0).optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  monthlyAmortization: z.coerce.number().min(0).optional().nullable(),
  amortizationDueDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
  annualInsuranceAmount: z.coerce.number().min(0).optional().nullable(),
  insuranceRenewalDate: z.string().optional().nullable(),
  expectedIncomeDaily: z.coerce.number().min(0).optional().nullable(),
  expectedIncomeMonthly: z.coerce.number().min(0).optional().nullable(),
  colorTheme: z.string().default('indigo'),
  status: z.enum(['active', 'maintenance', 'inactive', 'sold']).default('active'),
  notes: z.string().max(500).optional().nullable(),
});



