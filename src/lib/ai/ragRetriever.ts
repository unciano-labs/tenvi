import { WEBSITE_ID } from '@/lib/constants';
import { UserFinancialContext } from '@/lib/ai/financialContext';

export interface RagQueryFilters {
  needsRetrieval: boolean;
  timeframeLabel: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  kind?: 'expense' | 'income' | 'all';
  categoryId?: string;
  categoryName?: string;
  creditCardId?: string;
  creditCardName?: string;
  propertyId?: string;
  propertyName?: string;
  searchTerm?: string;
  isComparison?: boolean;
}

export interface RetrievedTransaction {
  id: string;
  kind: 'expense' | 'income';
  amount: number;
  occurredOn: string;
  paymentMethod: string;
  note: string;
  categoryName?: string;
  cardName?: string;
  savingsName?: string;
  propertyName?: string;
}

export interface RagAggregations {
  totalExpenses: number;
  totalIncome: number;
  netCashflow: number;
  count: number;
  averageExpense: number;
  highestExpense: { note: string; amount: number; occurredOn: string; method?: string } | null;
  categoryBreakdown: Array<{ name: string; amount: number; count: number; percentage: number }>;
  paymentMethodBreakdown: Array<{ method: string; amount: number; count: number }>;
}

export interface RagRetrievalResult {
  needsRetrieval: boolean;
  filters: RagQueryFilters;
  transactions: RetrievedTransaction[];
  aggregations: RagAggregations;
  ragContextText: string;
  comparisonText?: string;
}

/**
 * Common merchant/service keywords to detect in user prompts
 */
const KNOWN_MERCHANT_KEYWORDS = [
  'jollibee', 'mcdo', "mcdonald's", 'mcdonalds', 'starbucks', 'chowking', 'mang inasal', 'kfc',
  'grab', 'angkas', 'joyride', 'foodpanda',
  'meralco', 'maynilad', 'manila water', 'pldt', 'globe', 'smart', 'converge',
  'shopee', 'lazada', 'zalora', 'tiktok shop', 'amazon', 'shein', 'uniqlo',
  'sm', 'sm supermarket', 'robinsons', 'puregold', 'waltermart', 'landers', 'snr', "s&r",
  'shell', 'petron', 'caltex', 'seaoil', 'cleanfuel',
  'netflix', 'spotify', 'youtube', 'apple', 'icloud', 'google',
  'mercury drug', 'watsons', 'southstar',
  'cebu pacific', 'philippine airlines', 'airasia', 'agoda', 'booking',
];

/**
 * Fast intent analyzer to detect if a message is asking about historical data,
 * spending metrics, transaction records, or comparisons.
 */
export function analyzeRagIntent(
  message: string,
  ctx: UserFinancialContext,
  history?: any[]
): RagQueryFilters {
  const lower = message.toLowerCase().trim();
  const today = new Date(ctx.todayISO || new Date().toISOString().split('T')[0]);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-12

  // 1. Check for pure transaction logging commands (these don't need historical retrieval)
  const isLoggingCommand =
    /^(bought|spent|paid|swiped|purchased|nag-grab|naggrab|kumain|bumili|nagbayad|hulog|sahod|kita)\b/i.test(lower) &&
    /\d+/.test(lower) &&
    !lower.includes('how much') &&
    !lower.includes('magkano') &&
    !lower.includes('did i') &&
    !lower.includes('show') &&
    !lower.includes('list') &&
    !lower.includes('kailan');

  if (isLoggingCommand) {
    return { needsRetrieval: false, timeframeLabel: 'None' };
  }

  // 2. Indicators of historical question or transaction lookup
  const hasQuestionPattern =
    lower.includes('how much') ||
    lower.includes('how many') ||
    lower.includes('magkano') ||
    lower.includes('ano ang') ||
    lower.includes('anong') ||
    lower.includes('what did i') ||
    lower.includes('when did i') ||
    lower.includes('kailan') ||
    lower.includes('did i pay') ||
    lower.includes('did i buy') ||
    lower.includes('may binili') ||
    lower.includes('may binayaran') ||
    lower.includes('show me') ||
    lower.includes('pakita') ||
    lower.includes('list') ||
    lower.includes('breakdown') ||
    lower.includes('summary') ||
    lower.includes('compare') ||
    lower.includes('kumpara') ||
    lower.includes('highest') ||
    lower.includes('pinakamalaki') ||
    lower.includes('pinakamahal') ||
    lower.includes('biggest') ||
    lower.includes('largest') ||
    lower.includes('cheapest') ||
    lower.includes('transactions') ||
    lower.includes('expenses') ||
    lower.includes('gastos') ||
    lower.includes('swipes') ||
    lower.includes('history') ||
    lower.includes('records') ||
    lower.includes('ledger') ||
    lower.includes('average');

  // Check for time triggers
  const hasTimeTrigger =
    lower.includes('last month') ||
    lower.includes('nakaraang buwan') ||
    lower.includes('this month') ||
    lower.includes('ngayong buwan') ||
    lower.includes('last week') ||
    lower.includes('past 7 days') ||
    lower.includes('yesterday') ||
    lower.includes('kahapon') ||
    lower.includes('past 30 days') ||
    lower.includes('past 3 months') ||
    lower.includes('last 3 months') ||
    lower.includes('past 6 months') ||
    lower.includes('last 6 months') ||
    lower.includes('this year') ||
    lower.includes('last year') ||
    lower.includes('nakaraang taon') ||
    /\b(202[0-9])\b/.test(lower) ||
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(lower);

  // Check for merchant search
  let matchedMerchant: string | undefined = undefined;
  for (const m of KNOWN_MERCHANT_KEYWORDS) {
    if (lower.includes(m)) {
      matchedMerchant = m;
      break;
    }
  }

  // Check for card search
  let matchedCardId: string | undefined = undefined;
  let matchedCardName: string | undefined = undefined;
  for (const c of ctx.creditCards || []) {
    const cName = c.name.toLowerCase();
    const bName = (c.bank_name || '').toLowerCase();
    if (lower.includes(cName) || (bName && lower.includes(bName))) {
      matchedCardId = c.id;
      matchedCardName = c.name;
      break;
    }

    // Significant token match (e.g. "bdo", "bpi", "security bank", "unionbank", "metrobank", "eastwest", "rcbc")
    const bankTokens = bName.split(/\s+/).filter(w => w.length >= 3 && !['bank', 'the', 'and', 'card', 'unibank'].includes(w));
    const cardTokens = cName.split(/\s+/).filter(w => w.length >= 3 && !['bank', 'card', 'gold', 'visa', 'mastercard', 'classic', 'platinum'].includes(w));
    const allTokens = [...bankTokens, ...cardTokens];
    if (allTokens.some(t => new RegExp(`\\b${t}\\b`, 'i').test(lower))) {
      matchedCardId = c.id;
      matchedCardName = c.name;
      break;
    }
  }

  // Check for property search
  let matchedPropertyId: string | undefined = undefined;
  let matchedPropertyName: string | undefined = undefined;
  for (const p of ctx.properties || []) {
    const pName = p.name.toLowerCase();
    const pIdent = (p.identifier || '').toLowerCase();
    if (lower.includes(pName) || (pIdent && lower.includes(pIdent))) {
      matchedPropertyId = p.id;
      matchedPropertyName = p.name;
      break;
    }
  }

  // Check for category matching
  let matchedCategoryId: string | undefined = undefined;
  let matchedCategoryName: string | undefined = undefined;
  for (const cat of ctx.categories || []) {
    const catLower = cat.name.toLowerCase();
    if (lower.includes(catLower)) {
      matchedCategoryId = cat.id;
      matchedCategoryName = cat.name;
      break;
    }
  }

  // Synonym matching for common categories if direct name didn't match
  if (!matchedCategoryId) {
    const categorySynonyms: Record<string, string[]> = {
      'Food & Dining': ['food', 'dining', 'restaurant', 'eat', 'dinner', 'lunch', 'breakfast', 'pagkain'],
      'Groceries': ['groceries', 'supermarket', 'market', 'grocery', 'palengke'],
      'Utilities': ['utilities', 'utility', 'bills', 'electric', 'electricity', 'kuryente', 'water', 'tubig', 'internet', 'meralco', 'maynilad', 'pldt'],
      'Transportation': ['transportation', 'transpo', 'gas', 'gasolina', 'fuel', 'toll', 'parking', 'grab', 'angkas', 'fare', 'pamasahe'],
      'Shopping': ['shopping', 'clothes', 'shoes', 'gamit', 'shopee', 'lazada', 'mall'],
      'Entertainment': ['entertainment', 'movies', 'cinema', 'games', 'leisure'],
      'Health & Medical': ['health', 'medical', 'medicine', 'gamot', 'hospital', 'clinic', 'doctor'],
    };

    for (const [targetName, synonyms] of Object.entries(categorySynonyms)) {
      if (synonyms.some((syn) => lower.includes(syn))) {
        const found = (ctx.categories || []).find(
          (c) => c.name.toLowerCase() === targetName.toLowerCase()
        );
        if (found) {
          matchedCategoryId = found.id;
          matchedCategoryName = found.name;
          break;
        }
      }
    }
  }

  // Needs retrieval if:
  // - It has a question pattern
  // - Or has a time trigger (e.g. "last month", "August")
  // - Or asks about a specific merchant, card, property, or category
  const needsRetrieval = Boolean(
    hasQuestionPattern ||
    hasTimeTrigger ||
    matchedMerchant ||
    (matchedCardId && (lower.includes('spend') || lower.includes('swipe') || lower.includes('transaction'))) ||
    (matchedPropertyId && (lower.includes('income') || lower.includes('earned') || lower.includes('boundary') || lower.includes('boundary'))) ||
    (matchedCategoryId && (lower.includes('how much') || lower.includes('total') || lower.includes('spend')))
  );

  if (!needsRetrieval) {
    return { needsRetrieval: false, timeframeLabel: 'None' };
  }

  // Determine kind filter
  let kind: 'expense' | 'income' | 'all' = 'all';
  if (
    lower.includes('spent') ||
    lower.includes('spend') ||
    lower.includes('expense') ||
    lower.includes('gastos') ||
    lower.includes('purchased') ||
    lower.includes('bought') ||
    lower.includes('swipe')
  ) {
    kind = 'expense';
  } else if (
    lower.includes('income') ||
    lower.includes('earned') ||
    lower.includes('salary') ||
    lower.includes('sahod') ||
    lower.includes('kita') ||
    lower.includes('revenue') ||
    lower.includes('deposit')
  ) {
    kind = 'income';
  }

  // Determine date ranges
  let startDate: string | undefined = undefined;
  let endDate: string | undefined = undefined;
  let timeframeLabel = 'Recent Records';
  let isComparison = false;

  if (
    lower.includes('compare') ||
    lower.includes('vs') ||
    lower.includes('kumpara') ||
    (lower.includes('this month') && lower.includes('last month'))
  ) {
    isComparison = true;
    timeframeLabel = 'Comparison (This Month vs Last Month)';
    // Span 2 full months
    const prevMonthDate = new Date(currentYear, currentMonth - 2, 1);
    startDate = formatDateToISO(prevMonthDate);
    endDate = ctx.todayISO;
  } else if (lower.includes('last month') || lower.includes('nakaraang buwan') || lower.includes('previous month')) {
    // 1st of previous month to last day of previous month
    const prevMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevMonthNum = currentMonth === 1 ? 12 : currentMonth - 1;
    const firstDay = new Date(prevMonthYear, prevMonthNum - 1, 1);
    const lastDay = new Date(prevMonthYear, prevMonthNum, 0); // day 0 = last day of prevMonthNum
    startDate = formatDateToISO(firstDay);
    endDate = formatDateToISO(lastDay);
    timeframeLabel = `Last Month (${firstDay.toLocaleString('en-US', { month: 'long', year: 'numeric' })})`;
  } else if (lower.includes('this month') || lower.includes('ngayong buwan')) {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    startDate = formatDateToISO(firstDay);
    endDate = ctx.todayISO;
    timeframeLabel = `This Month (${firstDay.toLocaleString('en-US', { month: 'long', year: 'numeric' })})`;
  } else if (lower.includes('yesterday') || lower.includes('kahapon')) {
    const yDate = new Date(today);
    yDate.setDate(yDate.getDate() - 1);
    startDate = formatDateToISO(yDate);
    endDate = formatDateToISO(yDate);
    timeframeLabel = `Yesterday (${startDate})`;
  } else if (lower.includes('last week') || lower.includes('past 7 days') || lower.includes('nakaraang linggo')) {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    startDate = formatDateToISO(d);
    endDate = ctx.todayISO;
    timeframeLabel = `Past 7 Days (${startDate} to ${endDate})`;
  } else if (lower.includes('past 30 days') || lower.includes('last 30 days')) {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    startDate = formatDateToISO(d);
    endDate = ctx.todayISO;
    timeframeLabel = `Past 30 Days (${startDate} to ${endDate})`;
  } else if (lower.includes('past 3 months') || lower.includes('last 3 months')) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - 3);
    startDate = formatDateToISO(d);
    endDate = ctx.todayISO;
    timeframeLabel = `Past 3 Months (${startDate} to ${endDate})`;
  } else if (lower.includes('past 6 months') || lower.includes('last 6 months')) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - 6);
    startDate = formatDateToISO(d);
    endDate = ctx.todayISO;
    timeframeLabel = `Past 6 Months (${startDate} to ${endDate})`;
  } else if (lower.includes('last year') || lower.includes('nakaraang taon')) {
    const targetY = currentYear - 1;
    startDate = `${targetY}-01-01`;
    endDate = `${targetY}-12-31`;
    timeframeLabel = `Last Year (${targetY})`;
  } else if (lower.includes('this year') || lower.includes('ngayong taon')) {
    startDate = `${currentYear}-01-01`;
    endDate = ctx.todayISO;
    timeframeLabel = `This Year (${currentYear})`;
  } else {
    // Check specific month names (e.g. "august", "in august", "july 2026")
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    let matchedMonthIdx = -1;
    for (let i = 0; i < monthNames.length; i++) {
      const reg = new RegExp(`\\b${monthNames[i]}\\b`, 'i');
      if (reg.test(lower)) {
        matchedMonthIdx = i;
        break;
      }
    }

    if (matchedMonthIdx !== -1) {
      // Check if a specific year was stated (e.g. "August 2025")
      const yearMatch = lower.match(/\b(202[0-9])\b/);
      let targetYear = currentYear;
      if (yearMatch) {
        targetYear = parseInt(yearMatch[1], 10);
      } else if (matchedMonthIdx + 1 > currentMonth) {
        // If they ask for October and we are in September, assume previous year unless specified
        targetYear = currentYear - 1;
      }

      const firstDay = new Date(targetYear, matchedMonthIdx, 1);
      const lastDay = new Date(targetYear, matchedMonthIdx + 1, 0);
      startDate = formatDateToISO(firstDay);
      endDate = formatDateToISO(lastDay);
      timeframeLabel = `${firstDay.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`;
    } else {
      // Check explicit year alone (e.g. "2025")
      const yearMatch = lower.match(/\b(202[0-9])\b/);
      if (yearMatch) {
        const targetYear = parseInt(yearMatch[1], 10);
        startDate = `${targetYear}-01-01`;
        endDate = targetYear === currentYear ? ctx.todayISO : `${targetYear}-12-31`;
        timeframeLabel = `Year ${targetYear}`;
      }
    }
  }

  // Contextual continuity: If no timeframe was explicitly mentioned in this turn,
  // check recent conversation history to inherit previously queried timeframe (e.g. "How about food?")
  if (!startDate && !endDate && history && history.length > 0) {
    const recentTurns = [...history].reverse().slice(0, 4);
    for (const turn of recentTurns) {
      const prevText = String(turn.text || '');
      if (prevText) {
        const prevFilters = analyzeRagIntent(prevText, ctx);
        if (prevFilters.startDate || prevFilters.endDate) {
          startDate = prevFilters.startDate;
          endDate = prevFilters.endDate;
          timeframeLabel = `${prevFilters.timeframeLabel} (Follow-up)`;
          break;
        }
      }
    }
  }

  return {
    needsRetrieval: true,
    timeframeLabel,
    startDate,
    endDate,
    kind,
    categoryId: matchedCategoryId,
    categoryName: matchedCategoryName,
    creditCardId: matchedCardId,
    creditCardName: matchedCardName,
    propertyId: matchedPropertyId,
    propertyName: matchedPropertyName,
    searchTerm: matchedMerchant,
    isComparison,
  };
}

/**
 * Executes structured SQL query on Supabase and aggregates results.
 */
export async function retrieveRagFinancialContext({
  supabase,
  userId,
  message,
  ctx,
  history,
}: {
  supabase: any;
  userId: string;
  message: string;
  ctx: UserFinancialContext;
  history?: any[];
}): Promise<RagRetrievalResult> {
  const filters = analyzeRagIntent(message, ctx, history);

  if (!filters.needsRetrieval) {
    return {
      needsRetrieval: false,
      filters,
      transactions: [],
      aggregations: createEmptyAggregations(),
      ragContextText: '',
    };
  }

  try {
    let query = supabase
      .from('bili_transactions')
      .select(`
        id,
        kind,
        amount,
        occurred_on,
        payment_method,
        note,
        created_at,
        category:bili_categories(id, name, kind),
        credit_card:bili_credit_cards(id, name, bank_name, last_4),
        savings:bili_savings(id, name, institution_name),
        property:bili_properties(id, name, identifier)
      `)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', userId);

    if (filters.startDate) {
      query = query.gte('occurred_on', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('occurred_on', filters.endDate);
    }
    if (filters.kind && filters.kind !== 'all') {
      query = query.eq('kind', filters.kind);
    }
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters.creditCardId) {
      query = query.eq('credit_card_id', filters.creditCardId);
    }
    if (filters.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }
    if (filters.searchTerm) {
      query = query.ilike('note', `%${filters.searchTerm}%`);
    }

    // Limit to 60 transactions for comprehensive accuracy without bloating tokens
    query = query
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60);

    const { data: rows, error } = await query;

    if (error) {
      console.warn('[Tenvi AI RAG] Query failed:', error);
      return {
        needsRetrieval: false,
        filters,
        transactions: [],
        aggregations: createEmptyAggregations(),
        ragContextText: '',
      };
    }

    const transactions: RetrievedTransaction[] = (rows || []).map((r: any) => ({
      id: r.id,
      kind: r.kind,
      amount: Number(r.amount || 0),
      occurredOn: r.occurred_on,
      paymentMethod: r.payment_method,
      note: r.note || '',
      categoryName: r.category?.name,
      cardName: r.credit_card?.name ? `${r.credit_card.name} (*${r.credit_card.last_4})` : undefined,
      savingsName: r.savings?.name,
      propertyName: r.property?.name,
    }));

    // Aggregate statistics
    let totalExpenses = 0;
    let totalIncome = 0;
    const categoryTotals: Record<string, { amount: number; count: number; kind: 'expense' | 'income' }> = {};
    const methodTotals: Record<string, { amount: number; count: number }> = {};
    let highestExpense: { note: string; amount: number; occurredOn: string; method?: string } | null = null;

    for (const t of transactions) {
      if (t.kind === 'expense') {
        totalExpenses += t.amount;
        if (!highestExpense || t.amount > highestExpense.amount) {
          highestExpense = {
            note: t.note || 'Expense',
            amount: t.amount,
            occurredOn: t.occurredOn,
            method: t.cardName || t.paymentMethod,
          };
        }
      } else {
        totalIncome += t.amount;
      }

      const catName = t.categoryName || 'Uncategorized';
      if (!categoryTotals[catName]) categoryTotals[catName] = { amount: 0, count: 0, kind: t.kind };
      categoryTotals[catName].amount += t.amount;
      categoryTotals[catName].count += 1;

      const methodName = t.cardName || t.paymentMethod;
      if (!methodTotals[methodName]) methodTotals[methodName] = { amount: 0, count: 0 };
      methodTotals[methodName].amount += t.amount;
      methodTotals[methodName].count += 1;
    }

    const netCashflow = totalIncome - totalExpenses;
    const count = transactions.length;
    const expenseCount = transactions.filter((t) => t.kind === 'expense').length;
    const averageExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;

    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([name, data]) => {
        const baseTotal = data.kind === 'income' ? totalIncome : totalExpenses;
        return {
          name,
          amount: data.amount,
          count: data.count,
          percentage: baseTotal > 0 ? Math.round((data.amount / baseTotal) * 100) : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const paymentMethodBreakdown = Object.entries(methodTotals)
      .map(([method, data]) => ({
        method,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    const aggregations: RagAggregations = {
      totalExpenses,
      totalIncome,
      netCashflow,
      count,
      averageExpense,
      highestExpense,
      categoryBreakdown,
      paymentMethodBreakdown,
    };

    // Format prompt text for Gemini
    const ragContextText = formatRagPromptContext({
      filters,
      transactions,
      aggregations,
    });

    return {
      needsRetrieval: true,
      filters,
      transactions,
      aggregations,
      ragContextText,
    };
  } catch (err) {
    console.error('[Tenvi AI RAG] Unexpected retrieval error:', err);
    return {
      needsRetrieval: false,
      filters,
      transactions: [],
      aggregations: createEmptyAggregations(),
      ragContextText: '',
    };
  }
}

/**
 * Helper to format the retrieved RAG records into a high-density, prompt-ready markdown block.
 */
function formatRagPromptContext({
  filters,
  transactions,
  aggregations,
}: {
  filters: RagQueryFilters;
  transactions: RetrievedTransaction[];
  aggregations: RagAggregations;
}): string {
  const parts: string[] = [];

  parts.push('======================================================================');
  parts.push('RETRIEVED HISTORICAL FINANCIAL RECORDS (RAG - SUPABASE DIRECT QUERY):');
  parts.push(`Query Target: ${filters.timeframeLabel}`);
  if (filters.categoryName) parts.push(`Category Filter: ${filters.categoryName}`);
  if (filters.creditCardName) parts.push(`Credit Card Filter: ${filters.creditCardName}`);
  if (filters.propertyName) parts.push(`Property/Asset Filter: ${filters.propertyName}`);
  if (filters.searchTerm) parts.push(`Search Term: "${filters.searchTerm}"`);
  parts.push(`Total Matching Transactions Found: ${transactions.length}`);

  if (transactions.length === 0) {
    parts.push('RESULT: No matching transactions found in the user\'s Tenvi ledger for this timeframe/query.');
    parts.push('Instruction: Politely inform the user that no matching transactions were found for that timeframe or filter in their Tenvi records.');
    parts.push('======================================================================');
    return parts.join('\n');
  }

  // Summary Metrics
  parts.push('\nAGGREGATED SUMMARY METRICS:');
  parts.push(`• Total Expenses: ₱${aggregations.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  parts.push(`• Total Income: ₱${aggregations.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  parts.push(`• Net Cashflow: ${aggregations.netCashflow >= 0 ? '+' : ''}₱${aggregations.netCashflow.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  if (aggregations.averageExpense > 0) {
    parts.push(`• Average Expense: ₱${aggregations.averageExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  }
  if (aggregations.highestExpense) {
    parts.push(
      `• Highest Expense: ₱${aggregations.highestExpense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ("${aggregations.highestExpense.note}" on ${aggregations.highestExpense.occurredOn} via ${aggregations.highestExpense.method})`
    );
  }

  if (aggregations.categoryBreakdown.length > 0) {
    parts.push('\nBREAKDOWN BY CATEGORY:');
    for (const cat of aggregations.categoryBreakdown.slice(0, 8)) {
      parts.push(`• ${cat.name}: ₱${cat.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${cat.count} transactions, ${cat.percentage}%)`);
    }
  }

  if (aggregations.paymentMethodBreakdown.length > 0) {
    parts.push('\nBREAKDOWN BY PAYMENT METHOD:');
    for (const m of aggregations.paymentMethodBreakdown.slice(0, 5)) {
      parts.push(`• ${m.method}: ₱${m.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${m.count} transactions)`);
    }
  }

  // Itemized transactions list (top 25)
  const itemsToShow = transactions.slice(0, 25);
  parts.push(`\nMATCHING LEDGER TRANSACTIONS (Showing top ${itemsToShow.length} records, sorted by date):`);
  itemsToShow.forEach((t, i) => {
    const paymentLabel = t.cardName ? `Card: ${t.cardName}` : `Method: ${t.paymentMethod}`;
    const propLabel = t.propertyName ? ` | Asset: ${t.propertyName}` : '';
    parts.push(
      `${i + 1}. [${t.occurredOn}] ${t.kind.toUpperCase()} ₱${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Cat: ${t.categoryName || 'General'} | ${paymentLabel}${propLabel} | Note: "${t.note}"`
    );
  });

  parts.push('======================================================================');
  return parts.join('\n');
}

function createEmptyAggregations(): RagAggregations {
  return {
    totalExpenses: 0,
    totalIncome: 0,
    netCashflow: 0,
    count: 0,
    averageExpense: 0,
    highestExpense: null,
    categoryBreakdown: [],
    paymentMethodBreakdown: [],
  };
}

function formatDateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
