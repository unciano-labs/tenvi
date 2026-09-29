import { WEBSITE_ID } from '@/lib/constants';
import {
  parseFinancialInput,
  mergePendingFinancialState,
  formatFriendlyDate,
  ParsedFinancialIntent,
  AvailableCategory,
  AvailableCreditCard,
  AvailableSavingsAccount,
  AvailableProperty,
} from '@/lib/ai/financialParser';
import { calculateOptimalCardToSwipe } from '@/lib/finance/calculations';
import { isClearlyOffTopic, hasFinancialOrTenviRelevance } from '@/lib/ai/guardrails';
import { revalidatePath } from 'next/cache';

export interface LoanSummaryItem {
  id: string;
  borrower: string;
  reason: string;
  amount: number;
  balanceRemaining: number;
  status: string;
  dueDate?: string | null;
}

export interface SplitSummaryItem {
  id: string;
  title: string;
  debtor: string;
  unpaidShare: number;
}

export interface UserFinancialContext {
  todayISO: string;
  currentYear: number;
  categories: AvailableCategory[];
  creditCards: AvailableCreditCard[];
  savingsAccounts: AvailableSavingsAccount[];
  properties: AvailableProperty[];
  cardsContext: any[];
  savingsContext: any[];
  totalSpentThisMonth: number;
  totalIncomeThisMonth: number;
  totalLiquidSavings: number;
  emergencyRunwayMonths: string;
  totalReceivables: number;
  totalPayables: number;
  optimalCardResult: any;
  bestCardInfo: string;
  activeLoansList: LoanSummaryItem[];
  activeSplitsList: SplitSummaryItem[];
}


export async function fetchUserFinancialContext(
  supabase: any,
  userId: string
): Promise<UserFinancialContext> {
  const now = new Date();
  const startOfMonthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const [categoriesRes, cardsRes, savingsRes, transactionsRes, loansRes, splitsRes, propertiesRes] = await Promise.all([
    supabase
      .from('bili_categories')
      .select('id, name, kind')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', userId),
    supabase
      .from('bili_credit_cards')
      .select('id, name, bank_name, last_4, credit_limit, statement_day, due_day, is_active')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('bili_savings')
      .select('id, name, institution_name, account_type, current_balance, is_active')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('bili_transactions')
      .select('id, kind, amount, occurred_on, payment_method, credit_card_id, savings_id, property_id, note')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', userId)
      .gte('occurred_on', startOfMonthISO),
    supabase
      .from('bili_loans')
      .select(`
        id,
        reason,
        amount,
        balance_remaining,
        credit_card_id,
        status,
        loaned_on,
        due_date,
        is_installment,
        contact:bili_contacts(id, name)
      `)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', userId)
      .neq('status', 'paid'),
    supabase
      .from('bili_bill_splits')
      .select(`
        id,
        title,
        total_amount,
        occurred_on,
        participants:bili_split_participants(
          id,
          share_amount,
          is_paid,
          contact:bili_contacts(id, name)
        )
      `)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', userId),
    supabase
      .from('bili_properties')
      .select('id, name, property_type, identifier, expected_income_daily, expected_income_monthly, status')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', userId)
      .eq('status', 'active'),
  ]);

  const categories: AvailableCategory[] = (categoriesRes.data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
  }));

  const creditCards: AvailableCreditCard[] = (cardsRes.data || []).map((card: any) => ({
    id: card.id,
    name: card.name,
    bank_name: card.bank_name,
    last_4: card.last_4,
  }));

  const savingsAccounts: AvailableSavingsAccount[] = (savingsRes.data || []).map((acc: any) => ({
    id: acc.id,
    name: acc.name,
    institution_name: acc.institution_name,
    account_type: acc.account_type,
  }));

  const properties: AvailableProperty[] = (propertiesRes.data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    property_type: p.property_type,
    identifier: p.identifier,
    expected_income_daily: Number(p.expected_income_daily || 0),
    expected_income_monthly: Number(p.expected_income_monthly || 0),
    status: p.status,
  }));

  const rawCards = cardsRes.data || [];
  const rawTransactions = transactionsRes.data || [];
  const rawLoans = loansRes.data || [];
  const rawSplits = splitsRes.data || [];
  const rawSavings = savingsRes.data || [];

  let totalSpentThisMonth = 0;
  let totalIncomeThisMonth = 0;
  for (const tx of rawTransactions) {
    if (tx.kind === 'income') {
      totalIncomeThisMonth += Number(tx.amount || 0);
    } else {
      totalSpentThisMonth += Number(tx.amount || 0);
    }
  }

  let totalLiquidSavings = 0;
  for (const s of rawSavings) {
    totalLiquidSavings += Number(s.current_balance || 0);
  }

  // Calculate real active receivables from loans and splits
  let totalLoanReceivables = 0;
  const activeLoansList: LoanSummaryItem[] = [];
  for (const l of rawLoans) {
    const bal = Math.max(0, Number(l.balance_remaining || 0));
    totalLoanReceivables += bal;
    activeLoansList.push({
      id: l.id,
      borrower: l.contact?.name || 'Unknown Borrower',
      reason: l.reason || 'Personal Loan',
      amount: Number(l.amount || 0),
      balanceRemaining: bal,
      status: l.status,
      dueDate: l.due_date,
    });
  }

  let totalSplitReceivables = 0;
  const activeSplitsList: SplitSummaryItem[] = [];
  for (const s of rawSplits) {
    for (const p of s.participants || []) {
      if (!p.is_paid) {
        const share = Number(p.share_amount || 0);
        totalSplitReceivables += share;
        activeSplitsList.push({
          id: s.id,
          title: s.title || 'Bill Split',
          debtor: p.contact?.name || 'Shared Debtor',
          unpaidShare: share,
        });
      }
    }
  }

  const totalReceivables = totalLoanReceivables + totalSplitReceivables;
  const totalPayables = 0;

  const optimalCardResult = calculateOptimalCardToSwipe(rawCards, rawTransactions, rawLoans, now);
  const bestCardInfo = optimalCardResult.bestCard
    ? `${optimalCardResult.bestCard.card.name} (${optimalCardResult.bestCard.floatDays} interest-free float days until ${formatFriendlyDate(optimalCardResult.bestCard.paymentDueDate)})`
    : 'No active credit cards registered yet';

  const emergencyRunwayMonths =
    totalSpentThisMonth > 0
      ? (totalLiquidSavings / totalSpentThisMonth).toFixed(1)
      : totalLiquidSavings > 0
      ? '6+'
      : '0.0';

  const todayISO = now.toISOString().split('T')[0];
  const currentYear = now.getFullYear();

  const cardsContext = rawCards.map((c: any) => {
    const match = optimalCardResult.rankedCards.find((r: any) => r.card?.id === c.id);
    return {
      id: c.id,
      name: c.name,
      bank_name: c.bank_name,
      last_4: c.last_4,
      float_days: match?.floatDays ?? 0,
      recommendation: match ? `${match.floatDays} float days` : '',
    };
  });

  const savingsContext = rawSavings.map((s: any) => ({
    id: s.id,
    name: s.name,
    institution_name: s.institution_name,
    balance: Number(s.current_balance || 0),
  }));

  return {
    todayISO,
    currentYear,
    categories,
    creditCards,
    savingsAccounts,
    cardsContext,
    savingsContext,
    totalSpentThisMonth,
    totalIncomeThisMonth,
    totalLiquidSavings,
    emergencyRunwayMonths,
    totalReceivables,
    totalPayables,
    optimalCardResult,
    bestCardInfo,
    activeLoansList,
    activeSplitsList,
    properties,
  };
}

export interface ChatHistoryItem {
  sender: 'user' | 'assistant';
  text: string;
}

export function buildGeminiChatPrompt(
  ctx: UserFinancialContext,
  message: string,
  pendingState: ParsedFinancialIntent | null,
  history?: ChatHistoryItem[]
): string {
  const systemPrompt = `You are Tenvi AI, a warm, highly knowledgeable, and friendly personal wealth assistant exclusively designed for Tenvi users in the Philippines.
You understand English, Tagalog, and Taglish ("nag-grab", "bayad kuryente", "swinipe", "kanina", "kahapon", "sahod", "ipon", "utang", "pautang", "bili").

STRICT DOMAIN & TOPIC GUARDRAILS:
1. You are strictly and exclusively **Tenvi AI**, a specialized personal financial copilot and digital ledger assistant for Tenvi.
2. PERMISSIBLE TOPICS:
   - Any question about **Tenvi** features, navigation, and workflows (Dashboard, Transactions ledger, Credit Cards, statement uploads, billing cut-offs, due dates, Current Unbilled Cycle, Receivables / Pautang loans, Bill Splits, Savings vaults, Emergency Living Runway, Categories).
   - Personal finances, money management, cashflow, Philippine banking & e-wallets (GCash, Maya, BDO, BPI, UnionBank, Metrobank, RCBC, Security Bank, GoTyme, SeaBank, CIMB, Tonik, Maya Bank, etc.), credit card utilization, interest-free float days, payment due dates, and debt payoff.
   - Natural language logging of expenses, income, deposits, and bills into Tenvi.
3. STRICT PROHIBITION ON OUTSIDE TOPICS:
   - You MUST STRICTLY REFUSE any queries, tasks, or conversations outside of Tenvi and personal finance.
   - Outside topics include: general programming/coding, software engineering, writing code or scripts, debugging, academic essays, homework, creative fiction, poetry, storytelling, jokes, cooking recipes, science, physics, history, geography, celebrity news, movies/pop culture, sports, gaming, horoscope, medical advice, relationship advice, or politics.
4. OUT-OF-BOUNDS DEFLECTION PROTOCOL:
   - If the user's message is outside of Tenvi or personal finance, you MUST categorize the intent as "out_of_bounds".
   - Set "reply" to a polite, branded markdown refusal message redirecting the user back to Tenvi and personal finance:
     "I am **Tenvi AI**, your dedicated personal finance copilot. I am only able to assist with questions about **Tenvi**, your transactions, credit cards, billing cut-offs, loans, receivables, and personal financial management.\\n\\nHow can I help you manage your finances today?"
   - For "out_of_bounds", set "transaction": null, "missingFields": [], and provide helpful financial "quickReplies":
     ["Which card is best to swipe today?", "How much did I spend this month?", "What is my emergency living runway?", "Bought food worth 1120, yesterday using cash"].

USER LIVE FINANCIAL CONTEXT:
- Today's Date: ${ctx.todayISO} (Year: ${ctx.currentYear})
- Expense/Income Categories: ${JSON.stringify(ctx.categories)}
- User Credit Cards: ${JSON.stringify(ctx.cardsContext)}
- Best Card to Swipe Today: ${ctx.bestCardInfo}
- Savings & Bank Vaults: ${JSON.stringify(ctx.savingsContext)}
- Registered Properties & Assets: ${JSON.stringify(ctx.properties)}
- This Month Financial Metrics:
  * Total Spent This Month: ₱${ctx.totalSpentThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
  * Total Income This Month: ₱${ctx.totalIncomeThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
  * Total Liquid Savings: ₱${ctx.totalLiquidSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
  * Emergency Living Runway: ${ctx.emergencyRunwayMonths} months
  * Active Receivables (Owed to user): ₱${ctx.totalReceivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}
  * Active Loans / Money Lent Breakdown (${ctx.activeLoansList.length} items): ${JSON.stringify(ctx.activeLoansList)}
  * Unpaid Bill Splits Breakdown (${ctx.activeSplitsList.length} items): ${JSON.stringify(ctx.activeSplitsList)}
  * Active Payables (Debts owed): ₱${ctx.totalPayables.toLocaleString('en-US', { minimumFractionDigits: 2 })}

YOUR RESPONSIBILITIES:
1. Determine the user's INTENT:
   - "log_transaction": User wants to record a single transaction (expense, income, bill, swipe, purchase, deposit).
   - "log_multiple_transactions": User wants to record multi-day entries (e.g. logging income/daily boundary of a property or asset like Toyota Vios over multiple dates or a date range).
   - "financial_query": User asks a question about their spending, best card to swipe, due dates, emergency runway, savings, loans, or wealth advice.
   - "greeting_or_help": User says hello, asks what you can do, or asks for sample prompts.
   - "out_of_bounds": User asks anything outside of Tenvi or personal finance (coding, science, pop culture, general trivia, recipes, etc.).

2. MULTI-DAY LOGGING & VEHICLE/PROPERTY DAILY BOUNDARY:
   * When user asks to log income or daily boundary for an asset or property (e.g. "Toyota Vios", "Vios", or plate/identifier):
     - Identify the property in "Registered Properties & Assets".
     - If no explicit amount is given, ALWAYS use its registered daily boundary rate "expected_income_daily" (e.g. 1000 for Toyota Vios).
     - Default paymentMethod is "cash" and kind is "income" for vehicle daily boundary.
     - Parse the requested date range relative to Today's Date (${ctx.todayISO}):
       * "from last week until yesterday" / "from lastweek until yesterday": 7 consecutive days starting 7 days before today up to yesterday.
       * "from last week until today" / "from lastweek until today": 8 consecutive days starting 7 days before today up to today (${ctx.todayISO}).
       * "last N days": N consecutive days ending yesterday (if "until yesterday") or today.
       * "from [Day/Date] to [Day/Date]": every date inclusive.
     - Set intent: "log_multiple_transactions".
     - In "transactions" array, create one item for EACH day in the date range with:
       * "kind": "income"
       * "amount": expected_income_daily (e.g. 1000)
       * "paymentMethod": "cash"
       * "propertyId": property.id
       * "propertyName": property.name
       * "occurredOn": "YYYY-MM-DD"
       * "note": property.name + " Daily Boundary"
       * "categoryName": "Asset Revenue"
     - Set "reply" to an enthusiastic, markdown-rich confirmation detailing:
       * Number of daily boundary entries recorded
       * Daily boundary rate (e.g. ₱1,000.00/day)
       * Total income recorded (e.g. ₱7,000.00)
       * Date range covered
       * Confirmation that all entries are linked directly to the property's digital ledger.

3. If intent is "out_of_bounds":
   - Return the polite branded refusal in "reply" redirecting to Tenvi and personal finance.
   - Set "transaction": null, "transactions": null, "missingFields": [].
   - Provide 3-4 financial quick replies.

4. If intent is "log_transaction":
   - Extract transaction details:
     * "kind": "expense" or "income" (default "expense" unless income words appear)
     * "amount": positive number (e.g. 1120). If omitted, it is MISSING.
     * "paymentMethod": "cash", "credit_card", "gcash", "maya", "bank_transfer", or "savings". If not stated, it is MISSING.
     * "creditCardId": match to closest user credit card ID if paymentMethod is "credit_card" or card name mentioned. If user used a credit card but didn't specify which one and has multiple cards, creditCardId is MISSING.
     * "savingsId": match to closest user savings account ID if deposited or drawn from a specific stash/bank.
     * "propertyId": match to closest user property ID if an asset/vehicle was mentioned.
     * "categoryId": match to closest user category ID.
     * "occurredOn": "YYYY-MM-DD" (calculate relative to Today's Date: e.g. "yesterday" = 1 day before today; default is ${ctx.todayISO}).
     * "note": short clean description (e.g. "Jollibee Food", "Grab Car", "Meralco Electric Bill", "Monthly Salary").
   - List any missing essential fields in "missingFields" array: possible values: ["amount", "paymentMethod", "creditCardId", "kind"].
   - If missingFields is empty:
     * Set "reply" to a cheerful confirmation summary noting the amount, item, payment method, and date.
     * Set "quickReplies": []
   - If missingFields has items:
     * Ask specifically for the missing item in "reply".
     * Provide helpful "quickReplies".

5. If intent is "financial_query":
   - Provide an intelligent, concise, accurate answer using the USER LIVE FINANCIAL CONTEXT and RECENT CONVERSATION HISTORY.
   - When asked about receivables, pautang, or who owes money: Always cite the exact total of ₱${ctx.totalReceivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}, and itemize the specific borrowers, items, and remaining balances from the Active Loans / Money Lent Breakdown.
   - Suggest 2-3 relevant follow-up "quickReplies".

6. If intent is "greeting_or_help":
   - Warm welcome explaining Tenvi AI's abilities.
   - Provide 3-4 clickable sample prompts in "quickReplies".

7. STREAMING REQUIREMENT:
   Always place the "reply" key FIRST in the JSON output so that real-time streaming delivers text immediately:
{
  "reply": string,
  "intent": "log_transaction" | "log_multiple_transactions" | "financial_query" | "greeting_or_help" | "out_of_bounds",
  "transaction": {
    "kind": "expense" | "income",
    "amount": number | null,
    "paymentMethod": "cash" | "credit_card" | "gcash" | "maya" | "bank_transfer" | "savings" | null,
    "creditCardId": string | null,
    "creditCardName": string | null,
    "savingsId": string | null,
    "savingsName": string | null,
    "propertyId": string | null,
    "propertyName": string | null,
    "categoryId": string | null,
    "categoryName": string | null,
    "occurredOn": string | null,
    "note": string | null
  } | null,
  "transactions": [
    {
      "kind": "expense" | "income",
      "amount": number,
      "paymentMethod": "cash" | "credit_card" | "gcash" | "maya" | "bank_transfer" | "savings",
      "creditCardId": string | null,
      "creditCardName": string | null,
      "savingsId": string | null,
      "savingsName": string | null,
      "propertyId": string | null,
      "propertyName": string | null,
      "categoryId": string | null,
      "categoryName": string | null,
      "occurredOn": string,
      "note": string
    }
  ] | null,
  "missingFields": string[],
  "quickReplies": string[]
}`;

  let fullPrompt = `${systemPrompt}\n\n`;

  // Multi-turn conversation history (capped at 10 recent messages)
  const recentHistory = (history || [])
    .filter((m) => m && m.text && m.text.trim())
    .slice(-10);

  if (recentHistory.length > 0) {
    const formattedTranscript = recentHistory
      .map(
        (m, idx) =>
          `[Turn ${idx + 1}] ${m.sender === 'user' ? 'User' : 'Tenvi AI'}: "${m.text.trim()}"`
      )
      .join('\n');

    fullPrompt += `MULTI-TURN CONVERSATION MEMORY (Previous ${recentHistory.length} turns):
${formattedTranscript}

CONVERSATIONAL CONTINUITY INSTRUCTIONS:
- You have memory of the above conversation turns.
- Use this history to resolve pronouns ("it", "that", "this"), follow-ups ("why?", "tell me more", "how about the other one?"), and progressive questions.
- Maintain dialogue flow smoothly while answering the user's latest input below.

`;
  }

  if (pendingState && pendingState.missingFields.length > 0) {
    fullPrompt += `CURRENT CONVERSATION STATE:
The user is continuing a previously started transaction that was missing details:
PREVIOUS PENDING STATE: ${JSON.stringify(pendingState)}

USER NEW MESSAGE: "${message}"
Update the transaction details with this new input. If all essential fields are now satisfied, return missingFields: [].`;
  } else {
    fullPrompt += `USER NEW MESSAGE: "${message}"`;
  }

  return fullPrompt;
}

export async function commitAITransaction({
  supabase,
  userId,
  kind,
  amount,
  categoryId,
  paymentMethod,
  creditCardId,
  savingsId,
  propertyId,
  occurredOn,
  note,
  creditCardName,
  savingsName,
  propertyName,
  categoryName,
}: {
  supabase: any;
  userId: string;
  kind: 'expense' | 'income';
  amount: number;
  categoryId?: string | null;
  paymentMethod: string;
  creditCardId?: string | null;
  savingsId?: string | null;
  propertyId?: string | null;
  occurredOn: string;
  note: string;
  creditCardName?: string | null;
  savingsName?: string | null;
  propertyName?: string | null;
  categoryName?: string | null;
}) {
  const { data: newRecord, error: insertErr } = await supabase
    .from('bili_transactions')
    .insert({
      website_id: WEBSITE_ID,
      user_id: userId,
      kind,
      amount,
      category_id: categoryId || null,
      payment_method: paymentMethod,
      credit_card_id: paymentMethod === 'credit_card' ? creditCardId || null : null,
      savings_id: savingsId || null,
      property_id: propertyId || null,
      occurred_on: occurredOn,
      note,
    })
    .select('id')
    .single();

  if (insertErr || !newRecord) {
    throw new Error(insertErr?.message || 'Database error inserting transaction');
  }

  // Update linked savings balance if connected
  if (savingsId) {
    const { data: account } = await supabase
      .from('bili_savings')
      .select('id, current_balance')
      .eq('id', savingsId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', userId)
      .maybeSingle();

    if (account) {
      const current = Number(account.current_balance || 0);
      const updated = kind === 'income' ? current + amount : Math.max(0, current - amount);
      await supabase
        .from('bili_savings')
        .update({
          current_balance: updated,
          updated_at: new Date().toISOString(),
        })
        .eq('id', savingsId)
        .eq('website_id', WEBSITE_ID)
        .eq('user_id', userId);
    }
  }

  // Invalidate Next.js cache
  try {
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/transactions');
    revalidatePath('/dashboard/cards');
    revalidatePath('/dashboard/savings');
    revalidatePath('/dashboard/properties');
  } catch {}

  return {
    id: newRecord.id,
    kind,
    amount,
    paymentMethod,
    creditCardName: creditCardName || null,
    savingsName: savingsName || null,
    propertyName: propertyName || null,
    propertyId: propertyId || null,
    categoryName: categoryName || (kind === 'expense' ? 'Expense' : 'Income'),
    occurredOn,
    note,
  };
}

export async function commitAIMultipleTransactions({
  supabase,
  userId,
  transactions,
}: {
  supabase: any;
  userId: string;
  transactions: Array<{
    kind: 'expense' | 'income';
    amount: number;
    categoryId?: string | null;
    paymentMethod: string;
    creditCardId?: string | null;
    savingsId?: string | null;
    propertyId?: string | null;
    occurredOn: string;
    note: string;
    creditCardName?: string | null;
    savingsName?: string | null;
    propertyName?: string | null;
    categoryName?: string | null;
  }>;
}) {
  if (!transactions || transactions.length === 0) return [];

  const rowsToInsert = transactions.map((tx) => ({
    website_id: WEBSITE_ID,
    user_id: userId,
    kind: tx.kind,
    amount: tx.amount,
    category_id: tx.categoryId || null,
    payment_method: tx.paymentMethod,
    credit_card_id: tx.paymentMethod === 'credit_card' ? tx.creditCardId || null : null,
    savings_id: tx.savingsId || null,
    property_id: tx.propertyId || null,
    occurred_on: tx.occurredOn,
    note: tx.note,
  }));

  const { data: insertedRecords, error } = await supabase
    .from('bili_transactions')
    .insert(rowsToInsert)
    .select('id, occurred_on, amount, kind, note, payment_method, property_id');

  if (error || !insertedRecords) {
    throw new Error(error?.message || 'Database error batch inserting transactions');
  }

  // Invalidate Next.js cache
  try {
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/transactions');
    revalidatePath('/dashboard/cards');
    revalidatePath('/dashboard/savings');
    revalidatePath('/dashboard/properties');
  } catch {}

  return insertedRecords.map((rec: any, idx: number) => {
    const orig = transactions[idx] || {};
    return {
      id: rec.id,
      kind: rec.kind,
      amount: Number(rec.amount),
      paymentMethod: rec.payment_method,
      creditCardName: orig.creditCardName || null,
      savingsName: orig.savingsName || null,
      propertyName: orig.propertyName || null,
      propertyId: rec.property_id || orig.propertyId || null,
      categoryName: orig.categoryName || (rec.kind === 'expense' ? 'Expense' : 'Income'),
      occurredOn: rec.occurred_on,
      note: rec.note,
    };
  });
}

export async function executeFallbackLocalChat({
  message,
  ctx,
  pendingState,
  supabase,
  userId,
}: {
  message: string,
  ctx: UserFinancialContext,
  pendingState: ParsedFinancialIntent | null,
  supabase: any,
  userId: string,
}) {
  const lowerMsg = message.toLowerCase().trim();

  // 1. Common Financial Queries
  if (lowerMsg.includes('which card') || lowerMsg.includes('best card') || lowerMsg.includes('swipe today')) {
    const cardReply = ctx.optimalCardResult.bestCard
      ? `💳 Your best card to swipe today is **${ctx.optimalCardResult.bestCard.card.name}** with **${ctx.optimalCardResult.bestCard.floatDays} interest-free float days** (due on ${formatFriendlyDate(ctx.optimalCardResult.bestCard.paymentDueDate)}).`
      : 'You do not have any active credit cards set up yet. You can add one in Cards!';
    return {
      reply: cardReply,
      quickReplies: ['How much did I spend this month?', 'What is my emergency living runway?'],
      pendingState: null,
    };
  }

  if (lowerMsg.includes('how much') && (lowerMsg.includes('spent') || lowerMsg.includes('spend'))) {
    return {
      reply: `📊 You have spent a total of **₱${ctx.totalSpentThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}** so far this month, with total income of **₱${ctx.totalIncomeThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}**.`,
      quickReplies: ['Which card is best to swipe today?', 'What is my emergency living runway?'],
      pendingState: null,
    };
  }

  if (lowerMsg.includes('runway') || lowerMsg.includes('emergency')) {
    return {
      reply: `🛡️ Your emergency living runway is **${ctx.emergencyRunwayMonths} months**, backed by **₱${ctx.totalLiquidSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}** in liquid savings across your accounts.`,
      quickReplies: ['Which card is best to swipe today?', 'How much did I spend this month?'],
      pendingState: null,
    };
  }

  if (lowerMsg.includes('unbilled') || lowerMsg.includes('unbilled cycle')) {
    return {
      reply: `💳 In **Tenvi**, the **Current Unbilled Cycle** tracks transactions made after your card's latest statement cutoff. This lets you monitor your upcoming bill in real-time before the bank issues the statement!`,
      quickReplies: ['Which card is best to swipe today?', 'How do billing cut-offs work?'],
      pendingState: null,
    };
  }

  if (
    lowerMsg.includes('cutoff') ||
    lowerMsg.includes('cut-off') ||
    (lowerMsg.includes('billing') && lowerMsg.includes('cycle'))
  ) {
    return {
      reply: `📅 **Billing Cut-offs in Tenvi**:\n\n• **Current Cut-off Tab**: Shows transactions for your current statement cycle.\n• **Current Unbilled Cycle**: Pinpoints swipes made after the statement cutoff before the new bill is released.\n• **All Cut-offs Tab**: Lets you review all past and future cycles with recorded transactions.`,
      quickReplies: ['Which card is best to swipe today?', 'What is Current Unbilled Cycle?'],
      pendingState: null,
    };
  }

  if (
    lowerMsg.includes('receivable') ||
    lowerMsg.includes('pautang') ||
    lowerMsg.includes('owe me') ||
    lowerMsg.includes('owed to me') ||
    lowerMsg.includes('who owes')
  ) {
    let breakdownText = '';
    if (ctx.activeLoansList.length > 0) {
      breakdownText = ctx.activeLoansList
        .map(
          (l) =>
            `• **${l.borrower}**: ₱${l.balanceRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${l.reason})`
        )
        .join('\n');
    }
    if (ctx.activeSplitsList.length > 0) {
      const splitsText = ctx.activeSplitsList
        .map(
          (s) =>
            `• **${s.debtor}**: ₱${s.unpaidShare.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${s.title})`
        )
        .join('\n');
      breakdownText = breakdownText ? `${breakdownText}\n${splitsText}` : splitsText;
    }

    const reply =
      ctx.totalReceivables > 0
        ? `🤝 **Active Receivables: ₱${ctx.totalReceivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}**\n\nYou currently have **₱${ctx.totalReceivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}** in outstanding money owed to you across **${ctx.activeLoansList.length}** active loan${ctx.activeLoansList.length > 1 ? 's' : ''}:\n\n${breakdownText}\n\nYou can view full payment schedules, log repayments, or send reminders in the [Receivables Hub](/dashboard/receivables).`
        : `🤝 You currently have **₱0.00** in active receivables or money owed to you in Tenvi.`;

    return {
      reply,
      quickReplies: ['Which card is best to swipe today?', 'How much did I spend this month?'],
      pendingState: null,
    };
  }

  if (lowerMsg.includes('split') || lowerMsg.includes('bill split')) {
    return {
      reply: `👥 **Bill Splits in Tenvi**:\n\nSplit dining, rent, or travel bills with friends in [Splits](/dashboard/splits). Tenvi tracks individual member shares and automatically calculates settlements.`,
      quickReplies: ['Which card is best to swipe today?', 'How much did I spend this month?'],
      pendingState: null,
    };
  }

  if (
    lowerMsg.includes('statement') &&
    (lowerMsg.includes('upload') || lowerMsg.includes('parse') || lowerMsg.includes('pdf') || lowerMsg.includes('csv'))
  ) {
    return {
      reply: `📄 **Statement Uploads in Tenvi**:\n\nGo to [Cards](/dashboard/cards) and click **Upload Statement**. Tenvi parses your bank PDF or CSV statements, identifies monthly installments, flags duplicates, and groups transactions into their appropriate billing cut-offs!`,
      quickReplies: ['Which card is best to swipe today?', 'What is Current Unbilled Cycle?'],
      pendingState: null,
    };
  }

  // 2. Offline Guardrail: Strictly deflect outside topics
  const isOffTopic =
    isClearlyOffTopic(message) || (!pendingState && !hasFinancialOrTenviRelevance(message));
  if (isOffTopic) {
    return {
      reply:
        "I am **Tenvi AI**, your dedicated personal finance copilot. I am only able to assist with questions about **Tenvi**, your transactions, credit cards, billing cut-offs, loans, receivables, and personal financial management.\n\nHow can I help you manage your finances today?",
      quickReplies: [
        'Which card is best to swipe today?',
        'How much did I spend this month?',
        'What is my emergency living runway?',
        'Bought food worth 1120, yesterday using cash',
      ],
      pendingState: null,
    };
  }

  // 3. Local Regex Parser
  let parsed: ParsedFinancialIntent;
  if (pendingState && pendingState.missingFields.length > 0) {
    parsed = mergePendingFinancialState(
      pendingState,
      message,
      ctx.categories,
      ctx.creditCards,
      ctx.savingsAccounts,
      new Date(),
      ctx.properties
    );
  } else {
    parsed = parseFinancialInput(
      message,
      ctx.categories,
      ctx.creditCards,
      ctx.savingsAccounts,
      new Date(),
      ctx.properties
    );
  }

  if (parsed.isGreetingOrHelp) {
    return {
      reply:
        "👋 Hi there! I'm your Tenvi AI wealth assistant. You can enter your spending and income in natural language and I'll automatically parse and log it to your digital ledger.\n\nTry entering:\n• **'bought food worth 1120, yesterday using cash'**\n• **'paid 450 for Grab via GCash today'**\n• **'received 25,000 salary via bank transfer'**\n• **'log income of toyota vios, from lastweek until yesterday'**",
      quickReplies: [
        'bought food worth 1120, yesterday using cash',
        'log income of toyota vios, from lastweek until yesterday',
        'which card is best to swipe today?',
        'how much did I spend this month?',
      ],
      pendingState: null,
    };
  }

  // Check for Multi-Log Batch Entries (e.g. Daily Boundary over date range)
  if (parsed.isMultiLog && parsed.occurredOnList && parsed.occurredOnList.length > 0) {
    if (parsed.missingFields.length > 0) {
      const nextMissing = parsed.missingFields[0];
      if (nextMissing === 'amount') {
        return {
          reply: `How much is the daily rate or amount for **${parsed.propertyName || parsed.note || 'this entry'}** per day?`,
          quickReplies: ['₱500', '₱1,000', '₱1,500', '₱2,000'],
          pendingState: parsed,
        };
      }
      if (nextMissing === 'paymentMethod') {
        return {
          reply: `How did you collect or pay this?`,
          quickReplies: ['💵 Cash', '📱 GCash', '⚡ Maya', '🏦 Bank Transfer'],
          pendingState: parsed,
        };
      }
    }

    // All fields ready for multi-log batch insertion
    const batchItems = parsed.occurredOnList.map((date) => ({
      kind: parsed.kind || 'income',
      amount: parsed.amount || 0,
      categoryId: parsed.categoryId || null,
      paymentMethod: parsed.paymentMethod || 'cash',
      creditCardId: parsed.creditCardId || null,
      savingsId: parsed.savingsId || null,
      propertyId: parsed.propertyId || null,
      occurredOn: date,
      note: parsed.note || `${parsed.propertyName || 'Property'} Daily Boundary`,
      creditCardName: parsed.creditCardName || null,
      savingsName: parsed.savingsName || null,
      propertyName: parsed.propertyName || null,
      categoryName: parsed.categoryName || 'Asset Revenue',
    }));

    const savedTransactions = await commitAIMultipleTransactions({
      supabase,
      userId,
      transactions: batchItems,
    });

    const dailyRate = parsed.amount || 0;
    const totalAmount = dailyRate * parsed.occurredOnList.length;
    const formattedTotal = `₱${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    const formattedDaily = `₱${dailyRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const reply = `✅ Recorded **${parsed.occurredOnList.length} daily boundary income entries** of **${formattedDaily}/day** for **${parsed.propertyName || 'Property'}** totaling **${formattedTotal}** (${parsed.dateRangeLabel || 'Multi-day'}). All entries are now linked to your property digital ledger!`;

    return {
      reply,
      pendingState: null,
      quickReplies: [
        'Which card is best to swipe today?',
        'How much did I spend this month?',
      ],
      transactions: savedTransactions,
    };
  }

  if (parsed.missingFields.length > 0) {
    const nextMissing = parsed.missingFields[0];

    if (nextMissing === 'kind') {
      return {
        reply: `Is this **Money Out (Expense)** or **Money In (Income)**?`,
        quickReplies: ['💸 Money Out (Expense)', '💰 Money In (Income)'],
        pendingState: parsed,
      };
    }

    if (nextMissing === 'amount') {
      const itemNote =
        parsed.note && parsed.note !== 'Expense' && parsed.note !== 'Transaction'
          ? ` for **${parsed.note}**`
          : '';
      return {
        reply: `How much was the amount${itemNote}? (e.g. ₱1,120 or 500)`,
        quickReplies: ['₱500', '₱1,000', '₱1,500', '₱2,500'],
        pendingState: parsed,
      };
    }

    if (nextMissing === 'paymentMethod') {
      const formattedAmt = parsed.amount
        ? `₱${parsed.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        : '';
      const itemNote =
        parsed.note && parsed.note !== 'Expense' && parsed.note !== 'Transaction'
          ? ` for **${parsed.note}**`
          : '';
      const dateDesc = parsed.occurredOn ? ` on ${formatFriendlyDate(parsed.occurredOn)}` : '';

      return {
        reply: `Got it! ${parsed.kind === 'income' ? 'Income' : 'Expense'} of **${formattedAmt}**${itemNote}${dateDesc}. How did you pay or receive this?`,
        quickReplies: ['💵 Cash', '📱 GCash', '⚡ Maya', '💳 Credit Card', '🏦 Bank Transfer'],
        pendingState: parsed,
      };
    }

    if (nextMissing === 'creditCardId') {
      const cardOptions = ctx.creditCards.map(
        (c) => `${c.name}${c.bank_name ? ` (${c.bank_name})` : ''}`
      );
      return {
        reply: `Which credit card did you use for this transaction?`,
        quickReplies: cardOptions.length > 0 ? cardOptions : ['Credit Card'],
        pendingState: parsed,
      };
    }
  }

  // All fields ready - commit to Supabase
  const finalKind = parsed.kind || 'expense';
  const finalAmount = parsed.amount || 0;
  const finalPaymentMethod = parsed.paymentMethod || 'cash';
  const finalDate = parsed.occurredOn || ctx.todayISO;
  const finalNote =
    parsed.note && parsed.note !== 'Transaction'
      ? parsed.note
      : finalKind === 'expense'
      ? 'Expense'
      : 'Income';

  const transaction = await commitAITransaction({
    supabase,
    userId,
    kind: finalKind,
    amount: finalAmount,
    categoryId: parsed.categoryId || null,
    paymentMethod: finalPaymentMethod,
    creditCardId: parsed.creditCardId || null,
    savingsId: parsed.savingsId || null,
    propertyId: parsed.propertyId || null,
    occurredOn: finalDate,
    note: finalNote,
    creditCardName: parsed.creditCardName || null,
    savingsName: parsed.savingsName || null,
    propertyName: parsed.propertyName || null,
    categoryName: parsed.categoryName || (finalKind === 'expense' ? 'Expense' : 'Income'),
  });

  const formattedAmt = `₱${finalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const friendlyDate = formatFriendlyDate(finalDate);
  const methodLabel =
    finalPaymentMethod === 'gcash'
      ? 'GCash'
      : finalPaymentMethod === 'maya'
      ? 'Maya'
      : finalPaymentMethod === 'credit_card'
      ? 'Credit Card'
      : finalPaymentMethod.toUpperCase().replace('_', ' ');

  const connectionNote = parsed.propertyName
    ? ` Linked to **${parsed.propertyName}**.`
    : parsed.creditCardName
    ? ` Connected directly to your **${parsed.creditCardName}** card transactions.`
    : parsed.savingsName
    ? ` Connected directly to your **${parsed.savingsName}** savings stash.`
    : '';

  const reply = `✅ Recorded **${finalKind === 'expense' ? 'Money Out (Expense)' : 'Money In (Income)'}** of **${formattedAmt}** for **${finalNote}** via **${methodLabel}** (${friendlyDate}).${connectionNote} Your digital ledger has been automatically updated!`;

  return {
    reply,
    pendingState: null,
    quickReplies: [
      'Which card is best to swipe today?',
      'How much did I spend this month?',
    ],
    transaction,
  };
}
