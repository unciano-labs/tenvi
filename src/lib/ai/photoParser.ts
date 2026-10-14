import { GoogleGenAI } from '@google/genai';
import { getGeminiApiKey, recordGeminiUsage, GEMINI_CANDIDATE_MODELS, withTimeout } from '@/lib/ai/gemini';
import { WEBSITE_ID } from '@/lib/constants';
import { ParsedPhotoItem } from '@/types';
import { UserFinancialContext } from '@/lib/ai/financialContext';
import { formatDateISO } from '@/lib/ai/financialParser';

export interface PhotoImagePayload {
  base64: string;
  mimeType: string;
}

export interface ParsePhotoItemsParams {
  image: PhotoImagePayload;
  userMessage?: string;
  ctx: UserFinancialContext;
  history?: Array<{ sender: 'user' | 'assistant'; text: string }>;
}

export interface ParsePhotoItemsResult {
  reply: string;
  items: ParsedPhotoItem[];
  overallType: 'expense' | 'receivable' | 'mixed' | 'unknown';
  missingParameters: string[];
  quickReplies: string[];
}

export const COMMON_NON_PERSON_WORDS = new Set([
  'lunch', 'dinner', 'breakfast', 'meal', 'food', 'coffee', 'snacks', 'snack',
  'milk tea', 'milktea', 'water', 'electricity', 'groceries', 'grocery', 'gas',
  'fuel', 'fare', 'grab', 'taxi', 'jeep', 'bus', 'train', 'receipt', 'bill',
  'store', 'shop', 'total', 'subtotal', 'tax', 'vat', 'cash', 'gcash', 'maya',
  'card', 'credit', 'debit', 'bank', 'item', 'items', 'amount', 'fee', 'expense',
  'expenses', 'receivable', 'receivables', 'pautang', 'utang', 'yesterday',
  'today', 'tomorrow', 'tonight', 'all', 'them', 'me', 'us', 'you', 'him', 'her',
  'everyone', 'each', 'please', 'now', 'later', 'save', 'saving', 'confirm',
  'cancel', 'yes', 'no', 'unknown', 'other', 'etc', 'starbucks', 'jollibee',
  'mcdo', 'mcdonalds', 'shopee', 'lazada', 'tiktok', 'supermarket', 'payment',
  'due', 'paid', 'unpaid', 'personal', 'money', 'lent', 'borrowed', 'purchase'
]);

export function isValidUUID(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

export function normalizeISODate(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  // Match MM/DD/YYYY or M/D/YYYY
  const mdyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Match YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // ISO with time, e.g. 2026-10-14T...
  const isoPrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoPrefix) {
    return isoPrefix[1];
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Detects whether a parsed photo item might be an existing record (duplicate entry)
 * by matching same amount, same date, and similar description / note.
 */
export function detectDuplicateItem(
  item: ParsedPhotoItem,
  recentTransactions: Array<{ id?: string; amount: number; occurredOn: string; note?: string; categoryName?: string }> = [],
  activeLoans: Array<{ id?: string; amount: number; loanedOn?: string | null; reason?: string; borrower?: string }> = []
): {
  isDuplicate: boolean;
  matchedId?: string;
  matchedDescription?: string;
  matchedDate?: string;
  matchedAmount?: number;
} | null {
  const itemAmt = Number(item.amount || 0);
  if (itemAmt <= 0) return null;
  const itemDate = normalizeISODate(item.date);
  const itemTitle = (item.title || '').trim().toLowerCase();

  // 1. Check against recent transactions (same amount & date & matching description)
  for (const tx of recentTransactions) {
    const txAmt = Number(tx.amount || 0);
    const txDate = normalizeISODate(tx.occurredOn);
    if (Math.abs(itemAmt - txAmt) < 0.01 && itemDate === txDate) {
      const txNote = (tx.note || tx.categoryName || '').trim().toLowerCase();
      const descMatch =
        !itemTitle ||
        !txNote ||
        itemTitle.includes(txNote) ||
        txNote.includes(itemTitle) ||
        itemTitle.split(/\s+/).some((w) => w.length > 2 && txNote.includes(w));

      if (descMatch) {
        return {
          isDuplicate: true,
          matchedId: tx.id,
          matchedDescription: tx.note || tx.categoryName || 'Transaction',
          matchedDate: txDate,
          matchedAmount: txAmt,
        };
      }
    }
  }

  // 2. Check against active loans
  for (const loan of activeLoans) {
    const loanAmt = Number(loan.amount || 0);
    const loanDate = loan.loanedOn ? normalizeISODate(loan.loanedOn) : null;
    if (Math.abs(itemAmt - loanAmt) < 0.01 && (!loanDate || itemDate === loanDate)) {
      const loanDesc = (loan.reason || loan.borrower || '').trim().toLowerCase();
      const itemBorrower = (item.borrowerName || '').trim().toLowerCase();
      const borrowerMatch =
        Boolean(itemBorrower && loan.borrower && (
          itemBorrower.includes(loan.borrower.toLowerCase()) ||
          loan.borrower.toLowerCase().includes(itemBorrower)
        ));
      const descMatch =
        !itemTitle ||
        !loanDesc ||
        itemTitle.includes(loanDesc) ||
        loanDesc.includes(itemTitle) ||
        itemTitle.split(/\s+/).some((w) => w.length > 2 && loanDesc.includes(w));

      if (descMatch || borrowerMatch) {
        return {
          isDuplicate: true,
          matchedId: loan.id,
          matchedDescription: loan.reason || loan.borrower || 'Loan',
          matchedDate: loanDate || itemDate,
          matchedAmount: loanAmt,
        };
      }
    }
  }

  return null;
}

/**
 * Analyzes parsed photo items and refines individual borrower assignments:
 * 1. Checks item title/description against user's contact list
 * 2. Prevents generic receipt words from being falsely tagged as borrower names
 * 3. Prevents blanket assignment of a single borrower to all items unless each item explicitly matches
 * 4. Ensures missingFields correctly flags 'borrower' when an item is a receivable without a valid borrower
 */
export function refineItemBorrowers(
  items: ParsedPhotoItem[],
  contacts: Array<{ id: string; name: string }> = [],
  properties: Array<{ id: string; name: string; identifier?: string | null }> = []
): ParsedPhotoItem[] {
  // First, check if Gemini blanket-assigned the EXACT same non-contact borrowerName across all items
  const nonNullBorrowers = items.map((it) => it.borrowerName?.trim()).filter(Boolean) as string[];
  const allSameBorrower =
    nonNullBorrowers.length > 1 &&
    nonNullBorrowers.every((b) => b.toLowerCase() === nonNullBorrowers[0].toLowerCase());
  const blanketCandidate = allSameBorrower ? nonNullBorrowers[0] : null;
  const blanketMatchesContact = blanketCandidate
    ? contacts.some((c) => c.name.toLowerCase() === blanketCandidate.toLowerCase())
    : false;

  return items.map((item) => {
    let borrowerName = item.borrowerName?.trim() || null;
    let contactId = item.contactId || null;
    const title = item.title || '';
    const titleLower = title.toLowerCase();

    // 1. If borrowerName is a known non-person word, remove it
    if (borrowerName && COMMON_NON_PERSON_WORDS.has(borrowerName.toLowerCase())) {
      borrowerName = null;
      contactId = null;
    }

    // 2. If Gemini blanket-assigned all items to a candidate that is NOT in contacts
    // and this specific item's title does NOT contain that candidate name, clear it!
    if (
      blanketCandidate &&
      !blanketMatchesContact &&
      borrowerName &&
      borrowerName.toLowerCase() === blanketCandidate.toLowerCase() &&
      !titleLower.includes(blanketCandidate.toLowerCase())
    ) {
      borrowerName = null;
      contactId = null;
    }

    // 3. Scan the item title for any matching contact name or registered property/asset
    const sortedContacts = [...contacts].sort((a, b) => b.name.length - a.name.length);
    for (const c of sortedContacts) {
      if (!c.name || c.name.length < 2) continue;
      const cLower = c.name.toLowerCase();
      const escaped = cLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[\\s,.:;!?-]|(?:for|to|kay|ni|from)\\s+)${escaped}(?:[\\s,.:;!?-]|$)`, 'i');
      if (regex.test(title)) {
        borrowerName = c.name;
        contactId = c.id;
        break;
      }
    }

    // 3b. If still no borrower, scan against registered properties & assets (e.g. Toyota Vios, Condo Unit)
    if (!borrowerName && properties.length > 0) {
      const sortedProps = [...properties].sort((a, b) => b.name.length - a.name.length);
      for (const p of sortedProps) {
        if (!p.name || p.name.length < 2) continue;
        const pLower = p.name.toLowerCase();
        const pEscaped = pLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?:^|[\\s,.:;!?-]|(?:for|to|kay|ni|from)\\s+)${pEscaped}(?:[\\s,.:;!?-]|$)`, 'i');
        const identMatch = p.identifier && p.identifier.length >= 3 && titleLower.includes(p.identifier.toLowerCase());
        if (regex.test(title) || identMatch) {
          borrowerName = p.name;
          const matchedContact = contacts.find((c) => c.name.toLowerCase() === p.name.toLowerCase());
          contactId = matchedContact?.id || null;
          break;
        }
      }
    }

    // 4. If borrowerName is set, verify if it matches any contact in contacts
    if (borrowerName && !contactId) {
      const matched = contacts.find((c) => c.name.toLowerCase() === borrowerName!.toLowerCase());
      if (matched) {
        borrowerName = matched.name;
        contactId = matched.id;
      }
    }

    // 5. If item has no borrowerName yet, check if title starts with "Name: " or "Name - " or "kay/ni Name"
    if (!borrowerName) {
      const prefixMatch =
        title.match(/^(?:(?:for|to|kay|ni)\s+)?([A-Z][a-zA-Z]{1,20})\s*[:\-–]\s*/i) ||
        title.match(/\b(?:for|to|kay|ni)\s+([A-Z][a-zA-Z]{1,20})\b/i);
      if (prefixMatch && prefixMatch[1]) {
        const candidate = prefixMatch[1].trim();
        if (!COMMON_NON_PERSON_WORDS.has(candidate.toLowerCase())) {
          const matched = contacts.find((c) => c.name.toLowerCase() === candidate.toLowerCase());
          if (matched) {
            borrowerName = matched.name;
            contactId = matched.id;
          } else {
            borrowerName = candidate;
          }
        }
      }
    }

    // 6. Synchronize missingFields
    const currentMissing = Array.isArray(item.missingFields) ? [...item.missingFields] : [];
    const updatedMissing: ('type' | 'borrower' | 'amount' | 'paymentMethod')[] = currentMissing.filter(
      (f) => f !== 'borrower'
    );
    if (item.type === 'receivable' && !borrowerName) {
      updatedMissing.push('borrower');
    }

    return {
      ...item,
      borrowerName,
      contactId,
      missingFields: updatedMissing,
    };
  });
}

/**
 * Parses single or multiple financial items from a photo (receipt, bill, debt list, etc.)
 * using Gemini Multimodal Vision. Does NOT save automatically — returns items for user confirmation.
 */
export async function parsePhotoFinancialItems({
  image,
  userMessage = '',
  ctx,
}: ParsePhotoItemsParams): Promise<ParsePhotoItemsResult> {
  const apiKey = getGeminiApiKey();
  const trimmedUserMsg = (userMessage || '').trim();

  if (!apiKey) {
    return {
      reply:
        "I received your photo, but my AI Vision key isn't configured in the environment. Please configure `GEMINI_API_KEY` or record the transaction manually.",
      items: [],
      overallType: 'unknown',
      missingParameters: ['api_key'],
      quickReplies: ['Help', 'Sample Prompts'],
    };
  }

  const prompt = `You are an expert financial OCR assistant for Tenvi personal finance app.
The user uploaded a photo (such as a store receipt, grocery bill, handwritten list of debts/pautang, shared dining bill, or bank transfer).
The user also provided this accompanying message: "${trimmedUserMsg || '(No text provided with photo)'}"

TODAY'S DATE: ${ctx.todayISO} (Year: ${ctx.currentYear})
USER EXPENSE CATEGORIES: ${JSON.stringify(ctx.categories || [])}
USER EXISTING CONTACTS: ${JSON.stringify(ctx.contacts || [])}
USER PROPERTIES & ASSETS: ${JSON.stringify((ctx.properties || []).map((p) => ({ id: p.id, name: p.name, identifier: p.identifier })))}
USER CREDIT CARDS: ${JSON.stringify(ctx.cardsContext || [])}
USER SAVINGS & E-WALLETS: ${JSON.stringify(ctx.savingsContext || [])}

YOUR CRITICAL INSTRUCTIONS:
1. PARSE ALL DISTINCT FINANCIAL ITEMS:
   - Carefully read the photo.
   - If the photo is a receipt with distinct items or multiple purchases, extract the itemized entries. If it is a single total transaction, extract the single merchant/item.
   - If it is a handwritten list, ledger, or note containing multiple amounts or names (e.g. debts, contributions, list of expenses), extract EACH entry as an independent item!
   - Every item must have:
     * "id": unique string (e.g. "photo-item-1", "photo-item-2")
     * "title": concise clear description (e.g., "Starbucks Coffee", "Grocery Items", "Lent money for shoes")
     * "amount": positive number in Philippine Pesos (₱). E.g. 150.00, 2400.00
     * "date": "YYYY-MM-DD" (from receipt/image if legible, else default to ${ctx.todayISO})

2. DETERMINE TARGET TYPE ('expense' vs 'receivable'):
   - Check user message first:
     * If user says "expenses", "expense", "gastos", "I spent", "bought", "receipt" -> set type to "expense".
     * If user says "receivables", "receivable", "pautang", "utang", "lent", "money owed", "borrowed", "owed to me" -> set type to "receivable".
     * If user explicitly names a person for all items (e.g. "Mark borrowed all these", "all for John") -> set type to "receivable", set "borrowerName" to that person.
   - If user did NOT specify:
     * If image is clearly a list of people with amounts owed (debts/IOUs/pautang) -> set type to "receivable".
     * If image is a commercial store receipt (restaurant, supermarket, store) -> candidate type is "expense", BUT note in the reply that the user can choose to save as Expenses or Receivables.
     * If completely ambiguous -> set type to "expense" by default, and ask user if they want them saved as Expenses or Receivables.

3. INDIVIDUAL ITEM BORROWER ANALYSIS (CRITICAL):
   - In shared bills, receipts, or handwritten debt notes, DIFFERENT items often belong to DIFFERENT people!
   - Analyze the description / text of EACH specific line item individually for person names.
   - Examples:
     * "Alice ₱500 lunch" -> title: "Lunch", borrowerName: "Alice"
     * "Bob ₱350 grab" -> title: "Grab", borrowerName: "Bob"
     * "Charlie ₱1200 groceries" -> title: "Groceries", borrowerName: "Charlie"
   - NEVER blanket-assign one single borrower name to all items unless the note explicitly says all items belong to that one person!
   - Cross-reference with USER EXISTING CONTACTS: ${JSON.stringify(ctx.contacts || [])}.
   - If a line item does NOT specify who it's for, leave "borrowerName": null so the user can easily select the borrower from the contact dropdown in the confirmation card.

4. MATCH CATEGORIES & CONTACTS:
   - For "expense": match "categoryId" and "categoryName" to closest user category.
   - For "receivable": match "contactId" and "borrowerName" to user contacts if a name matches. If not found in contacts, keep "borrowerName".

5. DETECT MISSING PARAMETERS:
   - If type is "receivable" and "borrowerName" is null/empty -> add "borrower" to "missingFields".
   - If type was not specified by user in message -> add "type_confirmation" to "missingParameters".

6. CONFIRMATION BEFORE SAVING (CRITICAL):
   - You MUST NOT tell the user that the items were already saved to their ledger!
   - Instead, state clearly: "I found [X] items in this photo totaling ₱[TOTAL]. Please confirm if you want me to save them."
   - In "reply", format an attractive, clear markdown list of the parsed items with:
     * Item name
     * Amount (₱...)
     * Type (Expense or Receivable)
     * Category or Borrower name
     * Total sum
     * A clear question asking the user to confirm or specify how to save.

Return a SINGLE valid JSON object with exact keys:
{
  "reply": string,
  "overallType": "expense" | "receivable" | "mixed" | "unknown",
  "missingParameters": string[],
  "items": [
    {
      "id": string,
      "title": string,
      "amount": number,
      "type": "expense" | "receivable",
      "date": "YYYY-MM-DD",
      "categoryId": string | null,
      "categoryName": string | null,
      "paymentMethod": "cash" | "gcash" | "maya" | "credit_card" | "bank_transfer" | null,
      "borrowerName": string | null,
      "contactId": string | null,
      "missingFields": string[]
    }
  ],
  "quickReplies": string[]
}`;

  let cleanedBase64 = image.base64;
  if (cleanedBase64.includes('base64,')) {
    cleanedBase64 = cleanedBase64.split('base64,')[1];
  }

  const mimeType = image.mimeType || 'image/jpeg';
  const startTime = Date.now();

  try {
    const ai = new GoogleGenAI({ apiKey });

    for (const candidate of GEMINI_CANDIDATE_MODELS) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: candidate,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: cleanedBase64,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          }),
          15000,
          `Photo vision candidate ${candidate} timed out after 15s`
        );

        const rawText = response.text || '';
        if (rawText) {
          const latencyMs = Date.now() - startTime;
          const cleanedJson = rawText
            .replace(/^```json\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

          const parsed = JSON.parse(cleanedJson);

          await recordGeminiUsage({
            userId: ctx.todayISO,
            feature: 'statement_vision',
            model: candidate,
            inputTokens: Math.round(prompt.length / 4) + 258,
            outputTokens: Math.round(rawText.length / 4),
            status: 'success',
            latencyMs,
          });

          // Ensure items is valid array with clean properties
          const rawItems: any[] = Array.isArray(parsed.items) ? parsed.items : [];
          const validatedItems: ParsedPhotoItem[] = rawItems
            .map((item, idx) => ({
              id: item.id || `photo-item-${Date.now()}-${idx}`,
              title: String(item.title || `Item ${idx + 1}`).trim(),
              amount: Math.max(0, Number(item.amount || 0)),
              type: (item.type === 'receivable' ? 'receivable' : 'expense') as 'expense' | 'receivable',
              date: item.date || ctx.todayISO,
              categoryId: item.categoryId || null,
              categoryName: item.categoryName || null,
              paymentMethod: item.paymentMethod || 'cash',
              creditCardId: item.creditCardId || null,
              creditCardName: item.creditCardName || null,
              savingsId: item.savingsId || null,
              savingsName: item.savingsName || null,
              borrowerName: item.borrowerName?.trim() || null,
              contactId: item.contactId || null,
              dueDate: item.dueDate || null,
              missingFields: Array.isArray(item.missingFields) ? item.missingFields : [],
            }))
            .filter((item) => item.amount > 0);

          // Refine individual item borrowers by analyzing item descriptions against user contacts and properties/assets
          const refinedItems = refineItemBorrowers(validatedItems, ctx.contacts || [], ctx.properties || []);

          // Detect duplicate entries against user's recent transactions and active loans
          const itemsWithDuplicates = refinedItems.map((item) => ({
            ...item,
            duplicateWarning: detectDuplicateItem(
              item,
              ctx.recentTransactions || [],
              ctx.activeLoansList || []
            ),
          }));

          const defaultQuickReplies =
            parsed.quickReplies && parsed.quickReplies.length > 0
              ? parsed.quickReplies
              : [
                  '✅ Confirm & Save All',
                  'Save as Expenses',
                  'Save as Receivables',
                  'Cancel',
                ];

          return {
            reply: parsed.reply || `I parsed ${itemsWithDuplicates.length} items from your photo. Please confirm before saving.`,
            items: itemsWithDuplicates,
            overallType: parsed.overallType || (itemsWithDuplicates.some((i) => i.type === 'receivable') ? 'receivable' : 'expense'),
            missingParameters: Array.isArray(parsed.missingParameters) ? parsed.missingParameters : [],
            quickReplies: defaultQuickReplies,
          };
        }
      } catch (candErr: any) {
        console.warn(`[Photo Vision] Candidate ${candidate} failed:`, candErr?.message || candErr);
      }
    }
  } catch (err: any) {
    console.error('[Photo Vision] Error processing photo:', err);
  }

  // Graceful fallback if vision model fails
  return {
    reply:
      "I was unable to clearly parse the details from your photo. Could you try uploading a clearer image, or type what you would like to log (e.g. *'Paid 450 for lunch in cash'* or *'Lent 1,000 to Mark'*)?",
    items: [],
    overallType: 'unknown',
    missingParameters: ['unreadable_image'],
    quickReplies: ['Paid 150 for lunch in cash', 'Which card is best to swipe today?'],
  };
}

/**
 * Commits a single photo item to the database:
 * - Expense -> bili_transactions
 * - Receivable -> bili_loans (creates or reuses contact)
 * Returns the created record, and if a contact was created, returns createdContact.
 */
export async function commitSinglePhotoParsedItem({
  supabase,
  userId,
  item,
}: {
  supabase: any;
  userId: string;
  item: ParsedPhotoItem;
}): Promise<{
  success: boolean;
  savedRecord?: any;
  createdContact?: { id: string; name: string } | null;
  error?: string;
}> {
  try {
    const amount = Number(item.amount || 0);
    if (amount <= 0) {
      return { success: false, error: 'Item amount must be greater than zero.' };
    }

    const cleanDate = normalizeISODate(item.date);

    if (item.type === 'expense') {
      const categoryId = isValidUUID(item.categoryId) ? item.categoryId : null;
      const creditCardId =
        item.paymentMethod === 'credit_card' && isValidUUID(item.creditCardId)
          ? item.creditCardId
          : null;
      const savingsId = isValidUUID(item.savingsId) ? item.savingsId : null;
      const allowedMethods = ['cash', 'credit_card', 'debit_card', 'gcash', 'maya', 'bank_transfer'];
      const paymentMethod = allowedMethods.includes(item.paymentMethod || '')
        ? item.paymentMethod!
        : 'cash';

      const { data: newTx, error: txError } = await supabase
        .from('bili_transactions')
        .insert({
          website_id: WEBSITE_ID,
          user_id: userId,
          kind: 'expense',
          amount,
          category_id: categoryId,
          payment_method: paymentMethod,
          credit_card_id: creditCardId,
          savings_id: savingsId,
          occurred_on: cleanDate,
          note: item.title?.trim() || 'Expense from photo',
        })
        .select('*, category:bili_categories(name)')
        .single();

      if (txError || !newTx) {
        console.error('[Commit Single Photo Item] Failed to insert transaction:', txError);
        return { success: false, error: txError?.message || 'Failed to save expense.' };
      }

      // If drawn from savings vault, update balance
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
          await supabase
            .from('bili_savings')
            .update({
              current_balance: Math.max(0, current - amount),
              updated_at: new Date().toISOString(),
            })
            .eq('id', savingsId)
            .eq('website_id', WEBSITE_ID)
            .eq('user_id', userId);
        }
      }

      return { success: true, savedRecord: newTx, createdContact: null };
    } else {
      // Receivable -> bili_loans
      let contactId = isValidUUID(item.contactId) ? item.contactId : null;
      let createdContact: { id: string; name: string } | null = null;
      const borrowerName = item.borrowerName?.trim() || 'Unassigned Borrower';

      if (!contactId) {
        // Query existing contact by name
        const { data: existingContact } = await supabase
          .from('bili_contacts')
          .select('id, name')
          .eq('website_id', WEBSITE_ID)
          .eq('user_id', userId)
          .ilike('name', borrowerName)
          .maybeSingle();

        if (existingContact && existingContact.id) {
          contactId = existingContact.id;
          createdContact = { id: existingContact.id, name: existingContact.name };
        } else {
          // Create new contact
          const { data: newContact, error: contactErr } = await supabase
            .from('bili_contacts')
            .insert({
              website_id: WEBSITE_ID,
              user_id: userId,
              name: borrowerName,
            })
            .select('id, name')
            .single();

          if (newContact && newContact.id) {
            contactId = newContact.id;
            createdContact = { id: newContact.id, name: newContact.name };
          } else if (contactErr) {
            // In case of unique constraint conflict or concurrent insert, retry lookup
            const { data: retryContact } = await supabase
              .from('bili_contacts')
              .select('id, name')
              .eq('website_id', WEBSITE_ID)
              .eq('user_id', userId)
              .ilike('name', borrowerName)
              .maybeSingle();

            if (retryContact) {
              contactId = retryContact.id;
              createdContact = { id: retryContact.id, name: retryContact.name };
            }
          }
        }
      }

      if (!contactId) {
        return { success: false, error: 'Could not resolve or create contact for borrower.' };
      }

      const dueDate = item.dueDate && item.dueDate.trim() ? normalizeISODate(item.dueDate) : null;

      const { data: newLoan, error: loanErr } = await supabase
        .from('bili_loans')
        .insert({
          website_id: WEBSITE_ID,
          user_id: userId,
          contact_id: contactId,
          amount,
          balance_remaining: amount,
          reason: item.title?.trim() || 'Receivable from photo',
          loaned_on: cleanDate,
          due_date: dueDate,
          status: 'unpaid',
          is_installment: false,
        })
        .select('*, contact:bili_contacts(name)')
        .single();

      if (loanErr || !newLoan) {
        console.error('[Commit Single Photo Item] Failed to insert loan:', loanErr);
        return { success: false, error: loanErr?.message || 'Failed to save receivable.' };
      }

      return { success: true, savedRecord: newLoan, createdContact };
    }
  } catch (err: any) {
    console.error('[Commit Single Photo Item] Unexpected error:', err);
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while saving item.',
    };
  }
}

/**
 * Commits confirmed photo items to the database:
 * - Expenses -> bili_transactions
 * - Receivables -> bili_loans (creates contact if missing)
 */
export async function commitPhotoParsedItems({
  supabase,
  userId,
  items,
}: {
  supabase: any;
  userId: string;
  items: ParsedPhotoItem[];
}): Promise<{
  savedTransactions: any[];
  savedLoans: any[];
  createdContacts: Array<{ id: string; name: string }>;
  summary: {
    expenseCount: number;
    receivableCount: number;
    expenseTotal: number;
    receivableTotal: number;
  };
  errors: string[];
}> {
  const savedTransactions: any[] = [];
  const savedLoans: any[] = [];
  const createdContacts: Array<{ id: string; name: string }> = [];
  const errors: string[] = [];
  let expenseCount = 0;
  let receivableCount = 0;
  let expenseTotal = 0;
  let receivableTotal = 0;

  // Cache resolved contacts during this batch run to guarantee same borrower gets same contactId
  const contactBatchCache = new Map<string, string>();

  for (const rawItem of items) {
    const item = { ...rawItem };
    if (item.borrowerName && !item.contactId) {
      const cached = contactBatchCache.get(item.borrowerName.trim().toLowerCase());
      if (cached) {
        item.contactId = cached;
      }
    }

    const res = await commitSinglePhotoParsedItem({
      supabase,
      userId,
      item,
    });

    if (res.success && res.savedRecord) {
      if (item.type === 'expense') {
        savedTransactions.push(res.savedRecord);
        expenseCount++;
        expenseTotal += Number(item.amount || 0);
      } else {
        savedLoans.push(res.savedRecord);
        receivableCount++;
        receivableTotal += Number(item.amount || 0);
        if (res.createdContact) {
          createdContacts.push(res.createdContact);
          contactBatchCache.set(res.createdContact.name.toLowerCase(), res.createdContact.id);
        } else if (item.borrowerName && res.savedRecord?.contact_id) {
          contactBatchCache.set(item.borrowerName.trim().toLowerCase(), res.savedRecord.contact_id);
        } else if (item.borrowerName && item.contactId) {
          contactBatchCache.set(item.borrowerName.trim().toLowerCase(), item.contactId);
        }
      }
    } else {
      errors.push(`"${item.title}": ${res.error || 'Failed to save'}`);
    }
  }

  return {
    savedTransactions,
    savedLoans,
    createdContacts,
    summary: {
      expenseCount,
      receivableCount,
      expenseTotal,
      receivableTotal,
    },
    errors,
  };
}

/**
 * Handles conversational updates to pending photo items (e.g. changing type to expenses, setting borrower, or confirming)
 */
export function updatePendingPhotoItemsWithUserInput({
  items,
  userMessage,
  ctx,
}: {
  items: ParsedPhotoItem[];
  userMessage: string;
  ctx: UserFinancialContext;
}): {
  action: 'commit' | 'update' | 'cancel';
  updatedItems: ParsedPhotoItem[];
  reply: string;
  quickReplies: string[];
} {
  const lower = userMessage.toLowerCase().trim();

  // 1. Confirm / Save
  if (
    lower === 'confirm' ||
    lower === 'save' ||
    lower === 'save all' ||
    lower === 'save them' ||
    lower === 'yes' ||
    lower === 'proceed' ||
    lower === 'yes please' ||
    lower === 'go ahead' ||
    lower.includes('confirm & save') ||
    lower.includes('save all')
  ) {
    return {
      action: 'commit',
      updatedItems: items,
      reply: 'Saving all items to your ledgers...',
      quickReplies: [],
    };
  }

  // 2. Cancel
  if (
    lower === 'cancel' ||
    lower === 'no' ||
    lower === 'never mind' ||
    lower === 'nevermind' ||
    lower.includes("don't save") ||
    lower.includes('stop')
  ) {
    return {
      action: 'cancel',
      updatedItems: [],
      reply: 'Cancelled saving items from the photo. Let me know what else I can help you with!',
      quickReplies: ['How much did I spend this month?', 'Which card is best to swipe today?'],
    };
  }

  // 3. Change all to Expenses
  if (
    lower.includes('expense') ||
    lower.includes('gastos') ||
    lower.includes('personal expense') ||
    lower.includes('save as expense')
  ) {
    const updated = items.map((it) => ({
      ...it,
      type: 'expense' as const,
      borrowerName: null,
      contactId: null,
    }));
    const total = updated.reduce((s, it) => s + Number(it.amount || 0), 0);

    return {
      action: 'update',
      updatedItems: updated,
      reply: `Updated all **${updated.length} items** to **Expenses** (Total: **₱${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}**).\n\nReady to save to your Transactions ledger?`,
      quickReplies: ['✅ Confirm & Save All', 'Save as Receivables', 'Cancel'],
    };
  }

  // 4. Change to Receivables
  if (
    lower.includes('receivable') ||
    lower.includes('pautang') ||
    lower.includes('utang') ||
    lower.includes('lent') ||
    lower.includes('borrowed') ||
    lower.includes('owed')
  ) {
    let detectedBorrower: string | null = null;
    let detectedContactId: string | null = null;

    // Check if user specified borrower name in text, e.g. "receivables for John" or "lent to Sarah"
    const nameMatch = userMessage.match(/(?:for|to|ni|kay|by|from)\s+([A-Za-z0-9\s]{2,25})/i);
    if (nameMatch && nameMatch[1]) {
      const candidateRaw = nameMatch[1].trim().replace(/[.,!?;:]+$/, '');
      const candidateLower = candidateRaw.toLowerCase();
      const existing = (ctx.contacts || []).find(
        (c) => c.name.toLowerCase() === candidateLower
      );
      if (existing) {
        detectedBorrower = existing.name;
        detectedContactId = existing.id;
      } else {
        const words = candidateLower.split(/\s+/).filter(Boolean);
        const hasCommonWord = words.some((w) => COMMON_NON_PERSON_WORDS.has(w));
        if (!hasCommonWord && candidateRaw.length >= 2) {
          detectedBorrower = candidateRaw;
        }
      }
    }

    const isExplicitAll =
      lower.includes('all for') ||
      lower.includes('all to') ||
      lower.includes('all kay') ||
      lower.includes('all ni');

    const updated = items.map((it) => {
      let bName = it.borrowerName;
      let cId = it.contactId;

      if (detectedBorrower && (isExplicitAll || !bName)) {
        bName = detectedBorrower;
        cId = detectedContactId;
      }

      return {
        ...it,
        type: 'receivable' as const,
        borrowerName: bName || null,
        contactId: cId || null,
        missingFields: bName
          ? it.missingFields?.filter((f) => f !== 'borrower') || []
          : Array.from(new Set([...(it.missingFields || []), 'borrower' as const])),
      };
    });

    const total = updated.reduce((s, it) => s + Number(it.amount || 0), 0);

    if (detectedBorrower) {
      return {
        action: 'update',
        updatedItems: updated,
        reply: `Updated **${updated.length} items** as **Receivables** owed by **${detectedBorrower}** (Total: **₱${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}**).\n\nReady to save to your Loans ledger?`,
        quickReplies: ['✅ Confirm & Save All', 'Change Borrower', 'Save as Expenses', 'Cancel'],
      };
    } else {
      return {
        action: 'update',
        updatedItems: updated,
        reply: `Set **${updated.length} items** as **Receivables** (Total: **₱${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}**).\n\n**Who owes this money?** Select a borrower from the dropdown on each item or choose a contact below:`,
        quickReplies: (ctx.contacts || []).slice(0, 3).map((c) => `Receivables for ${c.name}`).concat(['Save as Expenses', 'Cancel']),
      };
    }
  }

  // 5. Default: treat as borrower name ONLY if string matches a contact or isn't a command/control word
  const trimmed = userMessage.trim();
  const trimmedLower = trimmed.toLowerCase();
  const words = trimmedLower.split(/\s+/).filter(Boolean);
  const hasCommonWord = words.some((w) => COMMON_NON_PERSON_WORDS.has(w));
  const isCandidateBorrower =
    trimmed.length >= 2 &&
    trimmed.length < 35 &&
    !hasCommonWord &&
    !['expense', 'expenses', 'receivable', 'receivables', 'confirm', 'save', 'cancel', 'help'].includes(trimmedLower);

  if (isCandidateBorrower && items.some((it) => it.type === 'receivable')) {
    const existing = (ctx.contacts || []).find(
      (c) => c.name.toLowerCase() === trimmedLower
    );
    const borrowerName = existing ? existing.name : trimmed;
    const contactId = existing ? existing.id : null;

    const updated = items.map((it) =>
      it.type === 'receivable'
        ? {
            ...it,
            borrowerName: it.borrowerName || borrowerName,
            contactId: it.contactId || contactId,
            missingFields: (it.borrowerName || borrowerName)
              ? it.missingFields?.filter((f) => f !== 'borrower') || []
              : it.missingFields,
          }
        : it
    );
    const total = updated.reduce((s, it) => s + Number(it.amount || 0), 0);

    return {
      action: 'update',
      updatedItems: updated,
      reply: `Assigned borrower **${borrowerName}** to pending receivables (Total: **₱${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}**).\n\nReady to save to your Loans ledger?`,
      quickReplies: ['✅ Confirm & Save All', 'Save as Expenses', 'Cancel'],
    };
  }

  // Unhandled clarification
  return {
    action: 'update',
    updatedItems: items,
    reply: `You have **${items.length} items** pending confirmation from your photo.\n\nWould you like to save them as **Expenses** or **Receivables**?`,
    quickReplies: ['✅ Confirm & Save All', 'Save as Expenses', 'Save as Receivables', 'Cancel'],
  };
}
