import { Category } from '@/types';

export interface ParsedStatementTransaction {
  id: string; // unique client id for staging/selection
  date: string; // YYYY-MM-DD
  rawDate: string;
  description: string;
  amount: number;
  isPayment: boolean; // true if it is a payment to the card or refund
  categoryId?: string | null;
  categoryName?: string | null;
  confidence: number;
  isDuplicate?: boolean;
  duplicateType?: 'loan_installment' | 'existing_transaction';
  duplicateReason?: string;
  matchedLoanId?: string;
  matchedInstallmentId?: string;
  matchedTransactionId?: string;
}

export interface StatementParseResult {
  transactions: ParsedStatementTransaction[];
  statementDate?: string;
  totalCharges?: number;
  totalCredits?: number;
  duplicateCount?: number;
  cardLast4Detected?: string;
  rawTextPreview?: string;
  source: 'gemini_vision' | 'pdf_text' | 'ocr_image' | 'pasted_text';
}

export interface ExistingCardTransaction {
  id: string;
  amount: number | string;
  occurred_on: string;
  note?: string | null;
  kind: string;
  loan_id?: string | null;
}

export interface CardLoanWithInstallments {
  id: string;
  reason?: string | null;
  amount: number | string;
  installment_months?: number | null;
  contact?: { name: string } | null;
  installments?: Array<{
    id: string;
    installment_number: number;
    statement_date?: string | null;
    due_date: string;
    amount: number | string;
    is_paid: boolean;
  }>;
}

/**
 * Detect duplicates in parsed statement transactions against:
 * 1. Active loan installments swiped on this credit card (e.g. Jessa Mae iPhone monthly installment)
 * 2. Existing transactions already recorded for this credit card
 */
export function detectStatementDuplicates(
  transactions: ParsedStatementTransaction[],
  existingTransactions: ExistingCardTransaction[] = [],
  cardLoans: CardLoanWithInstallments[] = []
): {
  transactions: ParsedStatementTransaction[];
  duplicateCount: number;
} {
  const matchedTxIds = new Set<string>();
  const matchedInstIds = new Set<string>();

  const normalize = (str?: string | null) =>
    (str || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

  const enriched = transactions.map((t) => {
    const itemAmount = Number(t.amount || 0);

    // 1. Check against Loan Installments on this card
    for (const loan of cardLoans) {
      const borrowerName = loan.contact?.name || 'Borrower';
      const reason = loan.reason || '';
      const normBorrower = normalize(borrowerName);
      const normReason = normalize(reason);
      const normDesc = normalize(t.description);

      for (const inst of loan.installments || []) {
        if (matchedInstIds.has(inst.id)) continue;

        const instAmount = Number(inst.amount || 0);
        // Allow up to 0.10 currency variance for rounding differences
        const isAmountMatch = Math.abs(instAmount - itemAmount) <= 0.1;
        if (!isAmountMatch) continue;

        // Check date similarity
        const targetDateStr = inst.statement_date || inst.due_date;
        let isDateClose = false;
        if (targetDateStr && t.date) {
          const tTime = new Date(t.date).getTime();
          const targetTime = new Date(targetDateStr).getTime();
          if (!isNaN(tTime) && !isNaN(targetTime)) {
            const diffDays = Math.abs((tTime - targetTime) / (1000 * 60 * 60 * 24));
            // Statements cutoff within a ±14 day cycle window or same billing month
            isDateClose = diffDays <= 14;
          }
        }

        // Check textual keyword cues (e.g. "iphone", "jessa", or installment count like "01/12")
        const instNumPattern = `${inst.installment_number}/${loan.installment_months || ''}`;
        const hasKeywordMatch =
          (normBorrower.length > 2 && normDesc.includes(normBorrower)) ||
          (normReason.length > 2 && normDesc.includes(normReason)) ||
          normDesc.includes(instNumPattern);

        if (isDateClose || hasKeywordMatch) {
          matchedInstIds.add(inst.id);
          const totalMonths = loan.installment_months ? `/${loan.installment_months}` : '';
          return {
            ...t,
            isDuplicate: true,
            duplicateType: 'loan_installment' as const,
            duplicateReason: `Matches Loan Installment #${inst.installment_number}${totalMonths} for ${borrowerName}${reason ? ` (${reason})` : ''} (₱${instAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })})`,
            matchedLoanId: loan.id,
            matchedInstallmentId: inst.id,
          };
        }
      }
    }

    // 2. Check against Existing Transactions on this card
    for (const exTx of existingTransactions) {
      if (matchedTxIds.has(exTx.id)) continue;

      // Expense matches purchase, income matches payment
      const kindMatches =
        (!t.isPayment && exTx.kind === 'expense') || (t.isPayment && exTx.kind === 'income');
      if (!kindMatches) continue;

      const exAmount = Number(exTx.amount || 0);
      const isAmountMatch = Math.abs(exAmount - itemAmount) <= 0.05;
      if (!isAmountMatch) continue;

      // Exact date match
      const isExactDate = exTx.occurred_on === t.date;

      // Close date match (within ±3 days)
      let isCloseDate = false;
      if (exTx.occurred_on && t.date) {
        const tTime = new Date(t.date).getTime();
        const exTime = new Date(exTx.occurred_on).getTime();
        if (!isNaN(tTime) && !isNaN(exTime)) {
          const diffDays = Math.abs((tTime - exTime) / (1000 * 60 * 60 * 24));
          isCloseDate = diffDays <= 3;
        }
      }

      const normDesc = normalize(t.description);
      const normNote = normalize(exTx.note);
      const hasDescSimilarity =
        normDesc.length > 3 && normNote.length > 3 &&
        (normDesc.includes(normNote) || normNote.includes(normDesc));

      if (isExactDate || (isCloseDate && hasDescSimilarity)) {
        matchedTxIds.add(exTx.id);
        const dateFormatted = exTx.occurred_on || 'same date';
        const noteSnippet = exTx.note ? ` "${exTx.note}"` : '';
        return {
          ...t,
          isDuplicate: true,
          duplicateType: 'existing_transaction' as const,
          duplicateReason: `Matches existing transaction from ${dateFormatted}:${noteSnippet} (₱${exAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })})`,
          matchedTransactionId: exTx.id,
        };
      }
    }

    return t;
  });

  const duplicateCount = enriched.filter((t) => t.isDuplicate).length;

  return {
    transactions: enriched,
    duplicateCount,
  };
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/**
 * Normalizes a date into YYYY-MM-DD.
 * If the year is not included in the input, defaults to referenceYear (current year).
 */
export function normalizeDate(
  dateStr: string,
  referenceYear: number = new Date().getFullYear()
): { isoDate: string; valid: boolean } {
  if (!dateStr || !dateStr.trim()) {
    const today = new Date();
    const y = referenceYear;
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return { isoDate: `${y}-${m}-${d}`, valid: false };
  }

  // Clean trailing commas, normalize dots (e.g. "Aug. 15" -> "Aug 15"), collapse whitespace
  const clean = dateStr
    .trim()
    .replace(/,/g, '')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ');

  // 1. ISO format: 2026-08-25 or 2026/08/25
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    let y = parseInt(isoMatch[1], 10);
    // If year is invalid or obviously bogus (e.g. 0000 or < 2000), default to referenceYear
    if (y < 2000 || y > 2099) {
      y = referenceYear;
    }
    const m = String(parseInt(isoMatch[2], 10)).padStart(2, '0');
    const d = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
    return { isoDate: `${y}-${m}-${d}`, valid: true };
  }

  // 2. Numeric: MM/DD/YYYY or DD/MM/YYYY or MM/DD/YY or MM/DD or MM-DD
  const numMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?$/);
  if (numMatch) {
    let p1 = parseInt(numMatch[1], 10);
    let p2 = parseInt(numMatch[2], 10);
    let rawYear = numMatch[3];

    let year = referenceYear;
    if (rawYear) {
      const parsedYear = parseInt(rawYear, 10);
      if (rawYear.length === 2) {
        year = 2000 + parsedYear;
      } else if (parsedYear >= 2000 && parsedYear <= 2099) {
        year = parsedYear;
      } else {
        year = referenceYear;
      }
    }

    // Determine month vs day
    let month = p1;
    let day = p2;
    if (p1 > 12 && p2 <= 12) {
      // DD/MM format
      month = p2;
      day = p1;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const mStr = String(month).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      return { isoDate: `${year}-${mStr}-${dStr}`, valid: true };
    }
  }

  // 3. Named month: "AUG 25", "25 AUG", "AUG 25 2026", "25-AUG-2026", "Aug. 15"
  const alphaMatch1 = clean.match(/^([a-zA-Z]{3,9})[\s\-/]+(\d{1,2})(?:[\s\-/]+(\d{2,4}))?$/);
  const alphaMatch2 = clean.match(/^(\d{1,2})[\s\-/]+([a-zA-Z]{3,9})(?:[\s\-/]+(\d{2,4}))?$/);

  const matched = alphaMatch1 || alphaMatch2;
  if (matched) {
    let monthWord = (alphaMatch1 ? matched[1] : matched[2]).toLowerCase();
    let day = parseInt(alphaMatch1 ? matched[2] : matched[1], 10);
    let rawYear = matched[3];

    let month = MONTH_NAMES[monthWord];
    if (month && day >= 1 && day <= 31) {
      let year = referenceYear;
      if (rawYear) {
        const parsedYear = parseInt(rawYear, 10);
        if (rawYear.length === 2) {
          year = 2000 + parsedYear;
        } else if (parsedYear >= 2000 && parsedYear <= 2099) {
          year = parsedYear;
        } else {
          year = referenceYear;
        }
      }
      const mStr = String(month).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      return { isoDate: `${year}-${mStr}-${dStr}`, valid: true };
    }
  }

  // Fallback today with referenceYear
  const today = new Date();
  const y = referenceYear;
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return { isoDate: `${y}-${m}-${d}`, valid: false };
}

/**
 * Intelligent Merchant to Category matcher
 */
export function matchCategoryForMerchant(
  merchant: string,
  categories: Category[]
): { categoryId: string | null; categoryName: string | null } {
  const m = merchant.toLowerCase();

  const rules: { keywords: string[]; targetNameRegex: RegExp }[] = [
    {
      keywords: [
        'grab food', 'foodpanda', 'jollibee', 'mcdonalds', 'mcdo', 'starbucks', 'kfc',
        'chowking', 'mang inasal', 'pizzahut', 'shakeys', 'dominos', 'bistro', 'cafe',
        'coffee', 'restaurant', 'restobar', 'ramen', 'samgyupsal', 'burger', 'bakery',
        'dunkin', 'tim hortons', 'bo\'s coffee', 'bonchon', 'barbecue'
      ],
      targetNameRegex: /dining|food|groceries|eating/i,
    },
    {
      keywords: [
        'supermarket', 'puregold', 'sm market', 'robinsons super', 'waltermart', 's&r',
        'landers', 'savemore', 'dali', 'allhome', 'grocery', 'marketplace', 'hypermarket'
      ],
      targetNameRegex: /groceries|food/i,
    },
    {
      keywords: [
        'shell', 'petron', 'caltex', 'cleanfuel', 'seaoil', 'total gas', 'phoenix',
        'grab', 'angkas', 'joyride', 'taxi', 'toll', 'easytrip', 'autosweep', 'mptc',
        'mrt', 'lrt', 'parking', 'gasoline'
      ],
      targetNameRegex: /commute|gas|transport|travel/i,
    },
    {
      keywords: [
        'shopee', 'lazada', 'amazon', 'zara', 'uniqlo', 'h&m', 'shein', 'zalora',
        'sm department', 'robinsons dept', 'watsons', 'miniso', 'tiktok shop',
        'clothing', 'apparel', 'fashion'
      ],
      targetNameRegex: /shopping|clothes/i,
    },
    {
      keywords: [
        'meralco', 'maynilad', 'manila water', 'globe', 'smart', 'pldt', 'converge',
        'dito', 'sky cable', 'prime water', 'electric', 'telecom'
      ],
      targetNameRegex: /electric|water|bills|internet|phone/i,
    },
    {
      keywords: [
        'netflix', 'spotify', 'youtube', 'disney', 'apple.com/bill', 'google *', 'itunes',
        'steam', 'playstation', 'nintendo', 'cinema', 'sm cinema', 'ayala cinema', 'hbo'
      ],
      targetNameRegex: /entertainment|subs|movies/i,
    },
    {
      keywords: [
        'mercury drug', 'southstar', 'rose pharmacy', 'hospital', 'clinic', 'medical',
        'dental', 'doctor', 'generika', 'the generics pharmacy'
      ],
      targetNameRegex: /health|medical/i,
    },
    {
      keywords: [
        'cebu pacific', 'philippine airlines', 'airasia', 'agoda', 'booking.com',
        'airbnb', 'klook', 'hotel', 'resort', 'flight'
      ],
      targetNameRegex: /travel|other/i,
    },
  ];

  // Try matching against specific keyword rules first
  for (const rule of rules) {
    if (rule.keywords.some((kw) => m.includes(kw))) {
      const matchedCat = categories.find((c) => rule.targetNameRegex.test(c.name));
      if (matchedCat) {
        return { categoryId: matchedCat.id, categoryName: matchedCat.name };
      }
    }
  }

  // Fallback to searching category name tokens in merchant
  for (const cat of categories) {
    const catTokens = cat.name.toLowerCase().split(/[\s&/]+/);
    if (catTokens.some((token) => token.length > 3 && m.includes(token))) {
      return { categoryId: cat.id, categoryName: cat.name };
    }
  }

  // Default to Other Expense or first expense category
  const otherCat =
    categories.find((c) => /other/i.test(c.name) && c.kind === 'expense') ||
    categories.find((c) => c.kind === 'expense');

  return {
    categoryId: otherCat ? otherCat.id : null,
    categoryName: otherCat ? otherCat.name : null,
  };
}

/**
 * Checks if a line describes a payment or credit to the credit card
 */
export function isPaymentOrCredit(description: string, rawLine: string): boolean {
  const text = (description + ' ' + rawLine).toLowerCase();

  const paymentKeywords = [
    'payment - thank you',
    'payment thank you',
    'payment received',
    'auto-debit',
    'autodebit',
    'online payment',
    'atm payment',
    'bpi online payment',
    'bdo pay',
    'mb pay',
    'metrobank direct',
    'pymt rcvd',
    'reversal',
    'refund',
    'cash advance payment',
  ];

  if (paymentKeywords.some((kw) => text.includes(kw))) {
    return true;
  }

  // Check for CR or - at the end of line e.g. "15,000.00 CR" or "-15,000.00"
  if (/\bcr\b/i.test(rawLine) || rawLine.trim().endsWith('-')) {
    return true;
  }

  return false;
}

/**
 * Parses raw statement text (from PDF or OCR) into structured transactions
 */
export function parseStatementText(
  rawText: string,
  categories: Category[] = [],
  referenceYear: number = new Date().getFullYear()
): StatementParseResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const transactions: ParsedStatementTransaction[] = [];
  let detectedYear = referenceYear;
  let cardLast4: string | undefined = undefined;

  const MONTHS_PATTERN =
    '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
  const DATE_PATTERN_STR =
    '(?:\\b(\\d{4}[-/]\\d{1,2}[-/]\\d{1,2})\\b|\\b(\\d{1,2}[-/]\\d{1,2}(?:[-/]\\d{2,4})?)\\b|\\b(\\d{1,2}\\.\\d{1,2}\\.\\d{2,4})\\b|\\b(' +
    MONTHS_PATTERN +
    '[\\s\\-/.]+\\d{1,2}(?:,?[-\\s/.]+\\d{2,4})?)\\b|\\b(\\d{1,2}[\\s\\-/.]+' +
    MONTHS_PATTERN +
    '(?:,?[-\\s/.]+\\d{2,4})?)\\b)';
  const AMOUNT_PATTERN_STR =
    '(?:(?:PHP|₱|\\$)\\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\\.[0-9]{2})|[0-9]+(?:\\.[0-9]{2}))\\s*(CR|-)?(?:\\s*$|\\s+)';

  // 1. Scan for statement year or card last 4 digits in header (prior to transaction rows)
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const l = lines[i];

    // Card last 4: e.g. "•••• 1234" or "5520-XXXX-XXXX-1234" or "ending in 1234"
    const cardMatch = l.match(
      /(?:(?:\d{4}|[•*xX]{4})[-\s]?){3}(\d{4})|\bending in\s+(\d{4})\b|\bcard\s*(?:no\.?|number)?:?\s*.*(\d{4})\b/i
    );
    if (cardMatch && !cardLast4) {
      cardLast4 = cardMatch[1] || cardMatch[2] || cardMatch[3];
    }

    // Only inspect header lines that do not have transaction amounts for statement year
    const hasAmount = new RegExp(AMOUNT_PATTERN_STR, 'i').test(l);
    if (!hasAmount) {
      const statementYearMatch =
        l.match(/(?:statement|billing|period|cycle|as of|date)[\s\w.:/-]*\b(202[0-9]|203[0-9])\b/i) ||
        l.match(/\b(202[0-9]|203[0-9])\b/);

      if (statementYearMatch) {
        detectedYear = parseInt(statementYearMatch[1], 10);
      }
    }
  }

  // 2. Parse individual transaction rows
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    // Skip obvious header or footer noise
    const lineHasAmount = new RegExp(AMOUNT_PATTERN_STR, 'i').test(line);
    if (
      /statement of account|billing summary|rewards points|previous balance|minimum amount due|total amount due|page \d+ of \d+|customer service|credit limit|cash advance limit/i.test(
        line
      ) &&
      !lineHasAmount
    ) {
      continue;
    }

    // Find all dates in this line
    const dateMatches = Array.from(line.matchAll(new RegExp(DATE_PATTERN_STR, 'gi')));
    if (dateMatches.length === 0) continue;

    // Find all amounts in this line
    const amountMatches = Array.from(line.matchAll(new RegExp(AMOUNT_PATTERN_STR, 'gi')));
    if (amountMatches.length === 0) continue;

    // Use the first date found as transaction date (defaults missing year to detectedYear / currentYear)
    const firstDateStr = dateMatches[0][0];
    const { isoDate } = normalizeDate(firstDateStr, detectedYear);

    // Use the last amount match as transaction amount
    const lastAmtMatch = amountMatches[amountMatches.length - 1];
    const rawAmt = lastAmtMatch[1].replace(/,/g, '');
    const amountNum = parseFloat(rawAmt);

    if (isNaN(amountNum) || amountNum <= 0) continue;

    // Extract description text: everything between the last date and the amount
    let dateEndPos = (dateMatches[0].index || 0) + dateMatches[0][0].length;
    if (dateMatches.length > 1) {
      // If two dates (Trans date & Post date), cut after second date
      dateEndPos = (dateMatches[1].index || 0) + dateMatches[1][0].length;
    }

    const amtStartPos = lastAmtMatch.index || line.length;
    let description = line.substring(dateEndPos, amtStartPos).trim();

    // Clean up reference numbers and terminal garbage
    description = description
      .replace(/\b\d{10,25}\b/g, '') // long ref numbers
      .replace(/^[\s.:/-]+|[\s.:/-]+$/g, '') // trim punctuation
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!description || description.length < 2) {
      description = 'Card Transaction';
    }

    const isCredit = isPaymentOrCredit(description, line);
    const { categoryId, categoryName } = matchCategoryForMerchant(description, categories);

    transactions.push({
      id: `stmt-tx-${idx}-${Date.now()}`,
      date: isoDate,
      rawDate: firstDateStr,
      description,
      amount: amountNum,
      isPayment: isCredit,
      categoryId,
      categoryName,
      confidence: 0.9,
    });
  }

  // Calculate totals
  const totalCharges = transactions
    .filter((t) => !t.isPayment)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCredits = transactions
    .filter((t) => t.isPayment)
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    transactions,
    totalCharges,
    totalCredits,
    cardLast4Detected: cardLast4,
    rawTextPreview: lines.slice(0, 15).join('\n'),
    source: 'pasted_text',
  };
}
