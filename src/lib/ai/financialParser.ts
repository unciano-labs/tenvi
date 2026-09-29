import { PaymentMethod } from '@/lib/constants';

export interface AvailableProperty {
  id: string;
  name: string;
  property_type: string;
  identifier?: string | null;
  expected_income_daily: number;
  expected_income_monthly: number;
  status: string;
}

export interface ParsedFinancialIntent {
  kind?: 'expense' | 'income';
  amount?: number;
  paymentMethod?: PaymentMethod;
  creditCardId?: string | null;
  creditCardName?: string | null;
  savingsId?: string | null;
  savingsName?: string | null;
  propertyId?: string | null;
  propertyName?: string | null;
  occurredOn?: string; // YYYY-MM-DD
  occurredOnList?: string[]; // Array of YYYY-MM-DD for multi logs
  isMultiLog?: boolean;
  dateRangeLabel?: string;
  hasExplicitDate?: boolean;
  categoryId?: string | null;
  categoryName?: string | null;
  note?: string;
  missingFields: ('amount' | 'paymentMethod' | 'creditCardId' | 'kind')[];
  isGreetingOrHelp?: boolean;
  confidence: number;
}

export interface AvailableCategory {
  id: string;
  name: string;
  kind: 'expense' | 'income';
}

export interface AvailableCreditCard {
  id: string;
  name: string;
  bank_name?: string;
  last_4?: string;
}

export interface AvailableSavingsAccount {
  id: string;
  name: string;
  institution_name: string;
  account_type?: string;
}


// Format Date helper
export function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatFriendlyDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - target.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays === 2) return '2 days ago';

  return target.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: target.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Extract date expressions: "yesterday", "today", "the day before yesterday", "last friday", or specific dates
 */
export function parseDateExpression(
  text: string,
  baseDate: Date = new Date()
): { dateStr: string; hasExplicitDate: boolean; matchedText?: string } {
  const lower = text.toLowerCase();

  // "the day before yesterday"
  if (lower.includes('the day before yesterday') || lower.includes('day before yesterday')) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - 2);
    return { dateStr: formatDateISO(d), hasExplicitDate: true, matchedText: 'the day before yesterday' };
  }

  // "yesterday" / "kahapon"
  if (/\b(yesterday|kahapon)\b/i.test(lower)) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - 1);
    return { dateStr: formatDateISO(d), hasExplicitDate: true, matchedText: 'yesterday' };
  }

  // "today" / "kanina" / "ngayon"
  if (/\b(today|kanina|ngayon)\b/i.test(lower)) {
    return { dateStr: formatDateISO(baseDate), hasExplicitDate: true, matchedText: 'today' };
  }

  // Days of the week (e.g. "last monday", "last friday")
  const dayOfWeekMatch = lower.match(/\b(?:last\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (dayOfWeekMatch) {
    const daysMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    const targetDay = daysMap[dayOfWeekMatch[1].toLowerCase()];
    const currentDay = baseDate.getDay();
    let diff = currentDay - targetDay;
    if (diff <= 0) diff += 7; // go to previous occurrence
    const d = new Date(baseDate);
    d.setDate(d.getDate() - diff);
    return { dateStr: formatDateISO(d), hasExplicitDate: true, matchedText: dayOfWeekMatch[0] };
  }

  // Explicit date formats like "Sep 27", "September 27", "2026-09-27"
  const isoMatch = lower.match(/\b(20\d\d-[01]\d-[0-3]\d)\b/);
  if (isoMatch) {
    return { dateStr: isoMatch[1], hasExplicitDate: true, matchedText: isoMatch[1] };
  }

  const monthNames =
    'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
  const monthDateRegex = new RegExp(
    `\\b(${monthNames})\\s+([0-3]?[0-9])(?:st|nd|rd|th)?(?:,?\\s*(20\\d\\d))?\\b`,
    'i'
  );
  const monthMatch = lower.match(monthDateRegex);
  if (monthMatch) {
    const monthStr = monthMatch[1];
    const dayNum = parseInt(monthMatch[2], 10);
    const yearNum = monthMatch[3] ? parseInt(monthMatch[3], 10) : baseDate.getFullYear();
    const parsed = new Date(`${monthStr} ${dayNum}, ${yearNum}`);
    if (!isNaN(parsed.getTime())) {
      return { dateStr: formatDateISO(parsed), hasExplicitDate: true, matchedText: monthMatch[0] };
    }
  }

  // Default to today if no date specified
  return { dateStr: formatDateISO(baseDate), hasExplicitDate: false };
}

/**
 * Extract date range expressions:
 * - "from last week until today" / "from lastweek until today"
 * - "from last week until yesterday" / "from lastweek until yesterday"
 * - "last 5 days", "past 7 days"
 * - "from [Date1] to [Date2]"
 */
export function parseDateRangeExpression(
  text: string,
  baseDate: Date = new Date()
): { dates: string[]; isRange: boolean; label: string } {
  const lower = text.toLowerCase();

  // 1. "from last week until yesterday" / "from lastweek until yesterday" / "from last week to yesterday"
  if (
    /from\s+last\s*week\s+(?:until|to|thru|through)\s+yesterday/i.test(lower) ||
    /last\s*week\s+(?:until|to|thru|through)\s+yesterday/i.test(lower)
  ) {
    const dates: string[] = [];
    // 7 days ago up to yesterday
    for (let i = 7; i >= 1; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      dates.push(formatDateISO(d));
    }
    return {
      dates,
      isRange: true,
      label: `From ${formatFriendlyDate(dates[0])} to Yesterday (${dates.length} days)`,
    };
  }

  // 2. "from last week until today" / "from lastweek until today" / "from last week to today"
  if (
    /from\s+last\s*week\s+(?:until|to|thru|through)\s+today/i.test(lower) ||
    /last\s*week\s+(?:until|to|thru|through)\s+today/i.test(lower)
  ) {
    const dates: string[] = [];
    // 7 days ago up to today
    for (let i = 7; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      dates.push(formatDateISO(d));
    }
    return {
      dates,
      isRange: true,
      label: `From ${formatFriendlyDate(dates[0])} to Today (${dates.length} days)`,
    };
  }

  // 3. "last N days" / "past N days" (e.g. "last 5 days", "last 7 days")
  const lastNDaysMatch = lower.match(/\b(?:last|past)\s+(\d{1,2})\s+days?\b/i);
  if (lastNDaysMatch) {
    const count = Math.min(31, Math.max(1, parseInt(lastNDaysMatch[1], 10)));
    const untilYesterday = /\buntil\s+yesterday\b/i.test(lower);
    const offset = untilYesterday ? 1 : 0;
    const dates: string[] = [];
    for (let i = count - 1 + offset; i >= offset; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      dates.push(formatDateISO(d));
    }
    return {
      dates,
      isRange: true,
      label: `Last ${count} days (${formatFriendlyDate(dates[0])} to ${formatFriendlyDate(dates[dates.length - 1])})`,
    };
  }

  // 4. "from yesterday to today" / "from yesterday until today" / "yesterday and today"
  if (
    /from\s+yesterday\s+(?:to|until|thru|through)\s+today/i.test(lower) ||
    /yesterday\s+and\s+today/i.test(lower)
  ) {
    const y = new Date(baseDate);
    y.setDate(y.getDate() - 1);
    const dates = [formatDateISO(y), formatDateISO(baseDate)];
    return {
      dates,
      isRange: true,
      label: `Yesterday and Today (2 days)`,
    };
  }

  // 5. Explicit range: "from [Day/Date] to [Day/Date]" or "from [Day/Date] until [Day/Date]"
  const explicitRangeMatch = lower.match(
    /\bfrom\s+(.+?)\s+(?:to|until|thru|through)\s+(.+?)(?:\s+(?:boundary|income|cash|via|using|$))/i
  );
  if (explicitRangeMatch) {
    const startPart = explicitRangeMatch[1].trim();
    const endPart = explicitRangeMatch[2].trim();

    const startParsed = parseDateExpression(startPart, baseDate);
    const endParsed = parseDateExpression(endPart, baseDate);

    if (startParsed.hasExplicitDate && endParsed.hasExplicitDate) {
      const s = new Date(startParsed.dateStr);
      const e = new Date(endParsed.dateStr);

      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s <= e) {
        const dates: string[] = [];
        const cur = new Date(s);
        let safety = 0;
        while (cur <= e && safety < 31) {
          dates.push(formatDateISO(cur));
          cur.setDate(cur.getDate() + 1);
          safety++;
        }
        if (dates.length > 0) {
          return {
            dates,
            isRange: dates.length > 1,
            label: `From ${formatFriendlyDate(dates[0])} to ${formatFriendlyDate(dates[dates.length - 1])} (${dates.length} days)`,
          };
        }
      }
    }
  }

  return { dates: [], isRange: false, label: '' };
}

/**
 * Match user property or vehicle asset from utterance
 */
export function matchPropertyFromText(
  text: string,
  properties: AvailableProperty[] = []
): AvailableProperty | null {
  if (!properties || properties.length === 0) return null;
  const lower = text.toLowerCase();

  // 1. Exact or partial name or identifier match
  for (const prop of properties) {
    const nameLower = prop.name.toLowerCase();
    if (lower.includes(nameLower)) {
      return prop;
    }
    if (prop.identifier && lower.includes(prop.identifier.toLowerCase())) {
      return prop;
    }
  }

  // 2. Token / word boundary matching (e.g. "vios", "ertiga", "innova")
  for (const prop of properties) {
    const tokens = prop.name
      .toLowerCase()
      .split(/[\s()_-]+/)
      .filter((t) => t.length > 2);
    for (const token of tokens) {
      if (['the', 'and', 'for', 'with', 'car', 'vehicle'].includes(token)) continue;
      const regex = new RegExp(`\\b${token}\\b`, 'i');
      if (regex.test(lower)) {
        return prop;
      }
    }
  }

  return null;
}


/**
 * Extract amount from text
 * Handles:
 * "worth 1120", "1120 pesos", "₱1,120", "PHP 1120.50", "1.5k", "cost 500", "spent 350"
 */
export function parseAmount(text: string): { amount?: number; matchedText?: string } {
  // Check for 'k' shorthand e.g. "1.5k" or "2k"
  const kMatch = text.match(/(?:(?:worth|cost|for|amount|spent|paid)\s+)?(?:₱|php|pesos?)?\s*([0-9]+(?:\.[0-9]+)?)\s*k\b/i);
  if (kMatch) {
    const val = parseFloat(kMatch[1]) * 1000;
    if (!isNaN(val) && val > 0) {
      return { amount: Math.round(val * 100) / 100, matchedText: kMatch[0] };
    }
  }

  // Look for currency symbol or explicit keywords first
  const explicitMatch = text.match(
    /(?:(?:worth|cost|amounting\s+to|for|amount\s+of|spent|paid|received|earned)\s+)?(?:₱|php|pesos?)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i
  );
  if (explicitMatch) {
    const cleaned = explicitMatch[1].replace(/,/g, '');
    const val = parseFloat(cleaned);
    if (!isNaN(val) && val > 0) {
      return { amount: val, matchedText: explicitMatch[0] };
    }
  }

  // Look for "worth 1120", "cost 1120", "for 1120", etc.
  const keywordMatch = text.match(
    /\b(?:worth|cost|amount(?:ing)?(?:\s+to)?|for|spent|paid|bought|received|earned)\s+([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\b/i
  );
  if (keywordMatch) {
    const cleaned = keywordMatch[1].replace(/,/g, '');
    const val = parseFloat(cleaned);
    if (!isNaN(val) && val > 0) {
      return { amount: val, matchedText: keywordMatch[0] };
    }
  }

  // Standalone numbers that look like currency (e.g. 1120, 1,120, 500)
  // We avoid matching numbers in credit card digits, dates, or day counts (e.g. "last 5 days")
  let cleanForNumbers = text.replace(/\b(?:last|past)\s+\d+\s+days?\b/gi, ' ');
  cleanForNumbers = cleanForNumbers.replace(/\b\d+\s+(?:days?|weeks?|months?|hours?|hrs?)\b/gi, ' ');

  const numbers = cleanForNumbers.match(/\b([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\b/g);
  if (numbers) {
    for (const numStr of numbers) {
      const cleaned = numStr.replace(/,/g, '');
      const val = parseFloat(cleaned);
      // Skip 4-digit numbers that look like years (e.g. 2024, 2025, 2026) unless prefixed with currency
      if (val >= 2020 && val <= 2035 && !text.includes('₱') && !text.toLowerCase().includes('php')) {
        continue;
      }
      if (!isNaN(val) && val > 0) {
        return { amount: val, matchedText: numStr };
      }
    }
  }

  return {};
}

/**
 * Extract payment method and match credit card if applicable
 */
export function parsePaymentMethod(
  text: string,
  creditCards: AvailableCreditCard[] = []
): {
  paymentMethod?: PaymentMethod;
  creditCardId?: string | null;
  creditCardName?: string | null;
  matchedText?: string;
} {
  const lower = text.toLowerCase();

  // Credit Card explicit keywords or matching user's credit cards
  const isCreditCardKeyword = /\b(credit\s*card|credit|cc)\b/i.test(lower);

  // Check if text mentions any specific card by name, bank, or last 4
  for (const card of creditCards) {
    const cardNameLower = card.name.toLowerCase();
    const bankNameLower = (card.bank_name || '').toLowerCase();
    const last4 = card.last_4;

    const matchesName = cardNameLower.length > 2 && lower.includes(cardNameLower);
    const matchesBank = bankNameLower.length > 2 && (
      lower.includes(bankNameLower) ||
      (bankNameLower.includes('bdo') && lower.includes('bdo')) ||
      (bankNameLower.includes('bpi') && lower.includes('bpi')) ||
      (bankNameLower.includes('metrobank') && lower.includes('metrobank')) ||
      (bankNameLower.includes('unionbank') && lower.includes('unionbank')) ||
      (bankNameLower.includes('chinabank') && lower.includes('chinabank')) ||
      (bankNameLower.includes('rcbc') && lower.includes('rcbc')) ||
      (bankNameLower.includes('eastwest') && lower.includes('eastwest')) ||
      (bankNameLower.includes('security') && lower.includes('security bank'))
    );
    const matchesLast4 = last4 && lower.includes(last4);

    if (matchesName || matchesBank || matchesLast4) {
      return {
        paymentMethod: 'credit_card',
        creditCardId: card.id,
        creditCardName: `${card.name}${card.bank_name ? ` (${card.bank_name})` : ''}`,
        matchedText: matchesName ? card.name : (matchesBank ? card.bank_name : last4),
      };
    }
  }

  if (isCreditCardKeyword) {
    // If user has exactly one active credit card, default to it
    if (creditCards.length === 1) {
      const onlyCard = creditCards[0];
      return {
        paymentMethod: 'credit_card',
        creditCardId: onlyCard.id,
        creditCardName: onlyCard.name,
        matchedText: 'credit card',
      };
    }
    return {
      paymentMethod: 'credit_card',
      creditCardId: null,
      matchedText: 'credit card',
    };
  }

  // Cash / Pera
  if (/\b(cash|pera|physical cash|bills?|coins?|cash on hand)\b/i.test(lower)) {
    return { paymentMethod: 'cash', matchedText: 'cash' };
  }

  // GCash
  if (/\b(gcash|g-cash|g cash)\b/i.test(lower)) {
    return { paymentMethod: 'gcash', matchedText: 'gcash' };
  }

  // Maya / PayMaya
  if (/\b(maya|paymaya|pay-maya|pay maya)\b/i.test(lower)) {
    return { paymentMethod: 'maya', matchedText: 'maya' };
  }

  // Debit Card
  if (/\b(debit\s*card|debit)\b/i.test(lower)) {
    return { paymentMethod: 'debit_card', matchedText: 'debit card' };
  }

  // Bank Transfer / Online Transfer
  if (/\b(bank\s*transfer|online\s*bank|bank|transfer|instapay|pesonet|wire)\b/i.test(lower)) {
    return { paymentMethod: 'bank_transfer', matchedText: 'bank transfer' };
  }

  return {};
}

/**
 * Extract savings account or cash vault if mentioned
 */
export function parseSavingsAccount(
  text: string,
  savingsAccounts: AvailableSavingsAccount[] = []
): {
  savingsId?: string | null;
  savingsName?: string | null;
  matchedText?: string;
} {
  const lower = text.toLowerCase();

  for (const acc of savingsAccounts) {
    const nameLower = acc.name.toLowerCase();
    const instLower = acc.institution_name.toLowerCase();

    const matchesName = nameLower.length > 2 && lower.includes(nameLower);
    const matchesInst =
      instLower.length > 2 &&
      (lower.includes(instLower) ||
        (instLower.includes('maya') && lower.includes('maya')) ||
        (instLower.includes('cimb') && lower.includes('cimb')) ||
        (instLower.includes('gotyme') && lower.includes('gotyme')) ||
        (instLower.includes('seabank') && lower.includes('seabank')) ||
        (instLower.includes('tonik') && lower.includes('tonik')) ||
        (instLower.includes('maribank') && lower.includes('maribank')));

    if (matchesName || matchesInst) {
      return {
        savingsId: acc.id,
        savingsName: acc.name,
        matchedText: matchesName ? acc.name : acc.institution_name,
      };
    }
  }

  return {};
}

/**
 * Detect Kind: 'expense' (Money Out) or 'income' (Money In)
 */
export function parseKind(text: string): { kind?: 'expense' | 'income'; matchedText?: string } {
  const lower = text.toLowerCase();

  // Income triggers
  if (
    /\b(received|receive|earned|earn|salary|sweldo|income|sahod|bonus|dividend|allowance|got paid|inflow|cashback|refund|deposit|deposited)\b/i.test(
      lower
    )
  ) {
    return { kind: 'income', matchedText: 'income' };
  }

  // Expense triggers
  if (
    /\b(bought|buy|spent|spend|paid|pay|purchase|ordered|cost|worth|expense|bill|bills|gas|food|dinner|lunch|breakfast|groceries|snack|coffee|sub|subscription|load|rent|withdraw|withdrew)\b/i.test(
      lower
    )
  ) {
    return { kind: 'expense', matchedText: 'expense' };
  }

  return {};
}

/**
 * Match Category based on description keywords
 */
export function matchCategory(
  text: string,
  kind: 'expense' | 'income',
  categories: AvailableCategory[] = []
): { categoryId?: string; categoryName?: string } {
  const lower = text.toLowerCase();
  const relevantCategories = categories.filter((c) => c.kind === kind);

  // Keyword rules for common categories
  const categoryRules: { keywords: string[]; targetName: string }[] = [
    // Food & Groceries
    {
      keywords: ['grocery', 'groceries', 'supermarket', 'market', 'sm hypermarket', 'puregold', 'robinsons supermarket', 'deli', 'snack', 'meat', 'vegetable', 'fruit'],
      targetName: 'Food & Groceries',
    },
    // Dining Out / Food
    {
      keywords: ['food', 'lunch', 'dinner', 'breakfast', 'meal', 'restaurant', 'dine', 'cafe', 'coffee', 'starbucks', 'jollibee', 'mcdo', 'mcdonalds', 'kfc', 'grabfood', 'foodpanda', 'chowking', 'mang inasal'],
      targetName: 'Dining Out',
    },
    // Commute & Gas
    {
      keywords: ['grab', 'gas', 'gasoline', 'fuel', 'petron', 'shell', 'caltex', 'angkas', 'joyride', 'taxi', 'commute', 'jeep', 'bus', 'mrt', 'lrt', 'toll', 'rfid', 'easytrip', 'autosweep', 'parking'],
      targetName: 'Commute & Gas',
    },
    // Electric & Water
    {
      keywords: ['meralco', 'electric', 'electricity', 'water', 'maynilad', 'manila water', 'utility', 'utilities', 'kuryente', 'tubig'],
      targetName: 'Electric & Water Bills',
    },
    // Internet & Phone
    {
      keywords: ['internet', 'wifi', 'pldt', 'globe', 'smart', 'converge', 'load', 'prepaid', 'postpaid', 'telecom'],
      targetName: 'Internet & Phone',
    },
    // Shopping & Clothes
    {
      keywords: ['shopping', 'shopee', 'lazada', 'clothes', 'clothing', 'shirt', 'pants', 'shoes', 'uniqlo', 'zara', 'h&m', 'shein', 'tiktok shop'],
      targetName: 'Shopping & Clothes',
    },
    // Health & Medical
    {
      keywords: ['health', 'medical', 'hospital', 'doctor', 'clinic', 'dentist', 'dental', 'medicine', 'drug', 'mercury drug', 'watsons', 'vitamins'],
      targetName: 'Health & Medical',
    },
    // Entertainment & Subs
    {
      keywords: ['netflix', 'spotify', 'youtube', 'disney', 'movie', 'cinema', 'game', 'steam', 'playstation', 'concert', 'party'],
      targetName: 'Entertainment & Subs',
    },
    // Salary & Wages
    {
      keywords: ['salary', 'sweldo', 'sahod', 'payroll', 'wages', 'compensation', 'paycheck'],
      targetName: 'Salary & Wages',
    },
    // Freelance & Side Gig
    {
      keywords: ['freelance', 'client', 'gig', 'upwork', 'fiverr', 'consulting', 'project fee'],
      targetName: 'Freelance & Side Gig',
    },
    // Investments / Dividends
    {
      keywords: ['investment', 'dividend', 'interest', 'crypto', 'stocks', 'yield'],
      targetName: 'Investments / Dividends',
    },
    // Gifts & Allowance
    {
      keywords: ['gift', 'allowance', 'pamasko', 'birthday', 'remittance', 'padala'],
      targetName: 'Gifts & Allowance',
    },
  ];

  // Try matching against rules
  for (const rule of categoryRules) {
    const hasKeyword = rule.keywords.some((kw) => {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(lower);
    });

    if (hasKeyword) {
      // Find matching category in user's list
      const matched = relevantCategories.find(
        (c) => c.name.toLowerCase() === rule.targetName.toLowerCase() ||
               (rule.targetName === 'Dining Out' && c.name.toLowerCase().includes('food'))
      );
      if (matched) {
        return { categoryId: matched.id, categoryName: matched.name };
      }
    }
  }

  // Exact / partial match with user categories directly
  for (const cat of relevantCategories) {
    const catWords = cat.name.toLowerCase().split(/[\s&/]+/);
    for (const word of catWords) {
      if (word.length > 3 && lower.includes(word)) {
        return { categoryId: cat.id, categoryName: cat.name };
      }
    }
  }

  // Fallback to "Food & Groceries" if "food" was mentioned but no exact match
  if (lower.includes('food')) {
    const foodCat = relevantCategories.find((c) => c.name.toLowerCase().includes('food'));
    if (foodCat) return { categoryId: foodCat.id, categoryName: foodCat.name };
  }

  // Fallback to "Other Expense" or "Other Income"
  const defaultOther = relevantCategories.find((c) => c.name.toLowerCase().includes('other'));
  if (defaultOther) {
    return { categoryId: defaultOther.id, categoryName: defaultOther.name };
  }

  if (relevantCategories.length > 0) {
    return { categoryId: relevantCategories[0].id, categoryName: relevantCategories[0].name };
  }

  return {};
}

/**
 * Clean up text to form a concise note / title
 */
export function extractCleanNote(text: string, amountStr?: string): string {
  let cleaned = text;

  // Remove common phrases
  const stopPhrases = [
    /\bbought\b/gi,
    /\bspent\b/gi,
    /\bpaid\b/gi,
    /\bpurchased\b/gi,
    /\breceived\b/gi,
    /\bearned\b/gi,
    /\bworth\b/gi,
    /\bcosting\b/gi,
    /\bcost\b/gi,
    /\busing\s+cash\b/gi,
    /\busing\s+gcash\b/gi,
    /\busing\s+maya\b/gi,
    /\busing\s+credit\s*card\b/gi,
    /\busing\s+bank\s*transfer\b/gi,
    /\bwith\s+cash\b/gi,
    /\bwith\s+gcash\b/gi,
    /\bwith\s+maya\b/gi,
    /\bwith\s+credit\s*card\b/gi,
    /\bvia\s+cash\b/gi,
    /\bvia\s+gcash\b/gi,
    /\bvia\s+maya\b/gi,
    /\bvia\s+bank\s*transfer\b/gi,
    /\bthru\s+gcash\b/gi,
    /\byesterday\b/gi,
    /\btoday\b/gi,
    /\bkanina\b/gi,
    /\bkahapon\b/gi,
    /\bthe day before yesterday\b/gi,
    /\blast\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    /\bpesos?\b/gi,
    /\bphp\b/gi,
    /₱/g,
  ];

  for (const pattern of stopPhrases) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // Remove numbers that match amount
  cleaned = cleaned.replace(/\b[0-9]+(?:\.[0-9]+)?\s*k?\b/g, ' ');

  // Clean punctuation and excess whitespace
  cleaned = cleaned.replace(/[,;.]+/g, ' ').replace(/\s+/g, ' ').trim();

  // If text is empty or meaningless, return generic note
  if (!cleaned || cleaned.length < 2) {
    return 'Transaction';
  }

  // Capitalize first letter of each word
  return cleaned
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Main parser function: extracts all financial entities from a user utterance
 */
export function parseFinancialInput(
  rawText: string,
  categories: AvailableCategory[] = [],
  creditCards: AvailableCreditCard[] = [],
  savingsAccounts: AvailableSavingsAccount[] = [],
  baseDate: Date = new Date(),
  properties: AvailableProperty[] = []
): ParsedFinancialIntent {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // Check for greetings / help requests
  if (
    /^(hi|hello|hey|yo|good morning|good afternoon|good evening|kamusta|musta|help|what can you do|features)$/i.test(
      lower
    ) ||
    lower.startsWith('what can you do') ||
    lower === '?'
  ) {
    return {
      isGreetingOrHelp: true,
      missingFields: [],
      confidence: 1,
    };
  }

  // Check for matched asset property (e.g. "Toyota Vios")
  const matchedProp = matchPropertyFromText(text, properties);

  // Check for date range expressions (e.g. "from last week until yesterday")
  const dateRange = parseDateRangeExpression(text, baseDate);

  // 1. Detect Kind (expense vs income)
  let { kind } = parseKind(text);
  if (
    !kind &&
    (lower.includes('boundary') ||
      lower.includes('income') ||
      lower.includes('kita') ||
      (matchedProp &&
        !lower.includes('spent') &&
        !lower.includes('paid') &&
        !lower.includes('gastos') &&
        !lower.includes('repair') &&
        !lower.includes('gas')))
  ) {
    kind = 'income';
  }

  // 2. Parse Amount
  let { amount } = parseAmount(text);
  // If user didn't specify amount but mentioned a property with daily boundary
  if (
    (amount === undefined || amount <= 0) &&
    matchedProp &&
    Number(matchedProp.expected_income_daily) > 0 &&
    kind === 'income'
  ) {
    amount = Number(matchedProp.expected_income_daily);
  }

  // 3. Parse Payment Method & Credit Card
  let { paymentMethod, creditCardId, creditCardName } = parsePaymentMethod(text, creditCards);
  if (!paymentMethod && matchedProp && kind === 'income') {
    paymentMethod = 'cash'; // Default daily boundary collection method
  }

  // 4. Parse Savings Account / Vault
  const { savingsId, savingsName } = parseSavingsAccount(text, savingsAccounts);

  if (savingsId && !paymentMethod) {
    const matchedAcc = savingsAccounts.find((a) => a.id === savingsId);
    if (matchedAcc?.account_type === 'cash') {
      paymentMethod = 'cash';
    } else if (matchedAcc?.account_type === 'ewallet') {
      paymentMethod = matchedAcc.institution_name.toLowerCase().includes('maya') ? 'maya' : 'gcash';
    } else {
      paymentMethod = 'bank_transfer';
    }
  }

  // 5. Parse Date or Range
  let dateStr: string;
  let hasExplicitDate: boolean;
  let isMultiLog = false;
  let occurredOnList: string[] | undefined;
  let dateRangeLabel: string | undefined;

  if (dateRange.isRange && dateRange.dates.length > 0) {
    isMultiLog = true;
    occurredOnList = dateRange.dates;
    dateRangeLabel = dateRange.label;
    dateStr = dateRange.dates[dateRange.dates.length - 1]; // Latest date
    hasExplicitDate = true;
  } else {
    const singleDate = parseDateExpression(text, baseDate);
    dateStr = singleDate.dateStr;
    hasExplicitDate = singleDate.hasExplicitDate;
  }

  // If no kind was found, default to 'expense' if amount is present and context implies buying or paying
  if (!kind && amount) {
    kind = 'expense';
  }

  // 6. Match Category
  let categoryId: string | undefined;
  let categoryName: string | undefined;
  if (kind) {
    const matchedCat = matchCategory(text, kind, categories);
    categoryId = matchedCat.categoryId;
    categoryName = matchedCat.categoryName;
  }

  // 7. Extract Note
  let note = extractCleanNote(text);
  if (matchedProp) {
    note = `${matchedProp.name} ${lower.includes('boundary') || kind === 'income' ? 'Daily Boundary' : 'Expense'}`;
  }

  // 8. Determine Missing Fields
  const missingFields: ('amount' | 'paymentMethod' | 'creditCardId' | 'kind')[] = [];

  if (!kind) {
    missingFields.push('kind');
  }

  if (amount === undefined || amount <= 0) {
    missingFields.push('amount');
  }

  if (!paymentMethod && !savingsId) {
    missingFields.push('paymentMethod');
  } else if (paymentMethod === 'credit_card' && !creditCardId && creditCards.length > 1) {
    // If credit card selected, but multiple cards exist and none matched
    missingFields.push('creditCardId');
  }

  return {
    kind,
    amount,
    paymentMethod,
    creditCardId,
    creditCardName,
    savingsId: savingsId || null,
    savingsName: savingsName || null,
    propertyId: matchedProp ? matchedProp.id : null,
    propertyName: matchedProp ? matchedProp.name : null,
    occurredOn: dateStr,
    occurredOnList,
    isMultiLog,
    dateRangeLabel,
    hasExplicitDate,
    categoryId: categoryId || null,
    categoryName: categoryName || (matchedProp ? 'Asset Revenue' : null),
    note: note || (kind === 'expense' ? 'Expense' : 'Income'),
    missingFields,
    confidence: 0.9,
  };
}

/**
 * Merge follow-up user answer into existing pending state
 */
export function mergePendingFinancialState(
  previous: ParsedFinancialIntent,
  followUpText: string,
  categories: AvailableCategory[] = [],
  creditCards: AvailableCreditCard[] = [],
  savingsAccounts: AvailableSavingsAccount[] = [],
  baseDate: Date = new Date(),
  properties: AvailableProperty[] = []
): ParsedFinancialIntent {
  const followUpParsed = parseFinancialInput(
    followUpText,
    categories,
    creditCards,
    savingsAccounts,
    baseDate,
    properties
  );

  // Preserve previous date if follow-up didn't explicitly specify a date
  const effectiveOccurredOn = followUpParsed.hasExplicitDate
    ? followUpParsed.occurredOn
    : (previous.occurredOn || formatDateISO(baseDate));


  // Preserve previous note if previous had a meaningful note and follow up is just a method/card/amount
  const effectiveNote =
    previous.note && previous.note !== 'Transaction' && previous.note !== 'Expense' && previous.note !== 'Income'
      ? previous.note
      : (followUpParsed.note && followUpParsed.note !== 'Transaction' ? followUpParsed.note : (previous.note || 'Expense'));

  const merged: ParsedFinancialIntent = {
    ...previous,
    kind: followUpParsed.kind || previous.kind || 'expense',
    amount: followUpParsed.amount !== undefined ? followUpParsed.amount : previous.amount,
    paymentMethod: followUpParsed.paymentMethod || previous.paymentMethod,
    creditCardId: followUpParsed.creditCardId !== undefined ? followUpParsed.creditCardId : previous.creditCardId,
    creditCardName: followUpParsed.creditCardName || previous.creditCardName,
    savingsId: followUpParsed.savingsId !== undefined ? followUpParsed.savingsId : previous.savingsId,
    savingsName: followUpParsed.savingsName || previous.savingsName,
    occurredOn: effectiveOccurredOn,
    hasExplicitDate: previous.hasExplicitDate || followUpParsed.hasExplicitDate,
    note: effectiveNote,
    missingFields: [],
    confidence: 0.95,
  };

  // Re-evaluate Category if needed
  if (!merged.categoryId && merged.kind) {
    const matched = matchCategory(followUpText, merged.kind, categories);
    merged.categoryId = matched.categoryId || previous.categoryId;
    merged.categoryName = matched.categoryName || previous.categoryName;
  }

  // Check if credit card needs specification
  if (merged.paymentMethod === 'credit_card' && !merged.creditCardId && creditCards.length > 1) {
    const cardMatch = parsePaymentMethod(followUpText, creditCards);
    if (cardMatch.creditCardId) {
      merged.creditCardId = cardMatch.creditCardId;
      merged.creditCardName = cardMatch.creditCardName;
    }
  }

  // Recalculate missing fields
  const missing: ('amount' | 'paymentMethod' | 'creditCardId' | 'kind')[] = [];
  if (!merged.kind) missing.push('kind');
  if (merged.amount === undefined || merged.amount <= 0) missing.push('amount');
  if (!merged.paymentMethod && !merged.savingsId) missing.push('paymentMethod');
  else if (merged.paymentMethod === 'credit_card' && !merged.creditCardId && creditCards.length > 1) {
    missing.push('creditCardId');
  }

  merged.missingFields = missing;
  return merged;
}
