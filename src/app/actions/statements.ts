'use server';

import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { revalidatePath } from 'next/cache';
import {
  parseStatementText,
  ParsedStatementTransaction,
  StatementParseResult,
  matchCategoryForMerchant,
  normalizeDate,
  detectStatementDuplicates,
  ExistingCardTransaction,
  CardLoanWithInstallments,
} from '@/lib/ai/statementParser';
import { Category } from '@/types';

interface RawImportTransactionInput {
  date: string;
  description: string;
  amount: number;
  isPayment: boolean;
  categoryId?: string | null;
}

/**
 * Server Action to parse an uploaded statement file (PDF or Image) or pasted text
 * Automatically checks for duplicates against existing card transactions and active loan installments.
 */
export async function parseStatementFileAction(
  formData: FormData,
  cardId: string,
  userGeminiKey?: string
): Promise<{ success: boolean; result?: StatementParseResult; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    // 1. Fetch categories to power auto-categorization
    const { data: categories } = await supabase
      .from('bili_categories')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .order('name', { ascending: true });

    const userCategories: Category[] = categories || [];

    // 2. Fetch existing card transactions and linked loans with installments for duplicate detection
    let existingTransactions: ExistingCardTransaction[] = [];
    let cardLoans: CardLoanWithInstallments[] = [];

    if (cardId) {
      const [txRes, loanRes] = await Promise.all([
        supabase
          .from('bili_transactions')
          .select('id, amount, occurred_on, note, kind, loan_id')
          .eq('credit_card_id', cardId)
          .eq('website_id', WEBSITE_ID)
          .eq('user_id', user.id),
        supabase
          .from('bili_loans')
          .select(`
            id,
            reason,
            amount,
            installment_months,
            contact:bili_contacts(name),
            installments:bili_loan_installments(
              id,
              installment_number,
              statement_date,
              due_date,
              amount,
              is_paid
            )
          `)
          .eq('credit_card_id', cardId)
          .eq('website_id', WEBSITE_ID)
          .eq('user_id', user.id),
      ]);

      if (txRes.data) {
        existingTransactions = txRes.data as ExistingCardTransaction[];
      }
      if (loanRes.data) {
        cardLoans = loanRes.data as unknown as CardLoanWithInstallments[];
      }
    }

    const currentYear = new Date().getFullYear();

    // Check if pasted raw text was sent
    const pastedText = formData.get('pastedText') as string | null;
    if (pastedText && pastedText.trim().length > 0) {
      const rawResult = parseStatementText(pastedText, userCategories, currentYear);
      rawResult.source = 'pasted_text';
      const { transactions: enrichedTx, duplicateCount } = detectStatementDuplicates(
        rawResult.transactions,
        existingTransactions,
        cardLoans
      );
      return {
        success: true,
        result: {
          ...rawResult,
          transactions: enrichedTx,
          duplicateCount,
        },
      };
    }

    // Otherwise, handle uploaded File
    const file = formData.get('file') as File | null;
    if (!file) {
      return { success: false, error: 'No statement file or text provided.' };
    }

    const fileType = file.type || '';
    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const apiKey = userGeminiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // A. If Gemini API key is provided, try multimodal vision first
    if (apiKey) {
      const startTime = Date.now();
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const { recordGeminiUsage, GEMINI_CANDIDATE_MODELS } = await import('@/lib/ai/gemini');
        const ai = new GoogleGenAI({ apiKey });

        const base64Data = buffer.toString('base64');
        let mimeType = fileType;
        if (!mimeType || mimeType === 'application/octet-stream') {
          if (fileName.endsWith('.pdf')) {
            mimeType = 'application/pdf';
          } else if (fileName.endsWith('.png')) {
            mimeType = 'image/png';
          } else if (fileName.endsWith('.webp')) {
            mimeType = 'image/webp';
          } else if (fileName.endsWith('.heic')) {
            mimeType = 'image/heic';
          } else {
            mimeType = 'image/jpeg';
          }
        }

        const prompt = `You are an expert financial document parser. Extract all credit card transaction records from this statement image or PDF.

CRITICAL DATE EXTRACTION RULES:
1. Return dates in "YYYY-MM-DD" format.
2. If the year is NOT explicitly stated in the document or on the transaction row, you MUST default the year to the current year: ${currentYear}.
3. Do not hallucinate or guess older years (such as 2023, 2024, or 2025) if the document does not explicitly print a year; always default missing years to ${currentYear}.

Return a valid JSON array of objects, where each object has:
- "date": string in "YYYY-MM-DD" format (defaulting missing year to ${currentYear})
- "description": string (clean merchant or transaction name)
- "amount": number (positive float, e.g. 1250.50)
- "isPayment": boolean (true if this is a payment/credit to the card or refund, false if purchase/swipe)
- "suggestedCategory": string (one of: Food & Groceries, Dining Out, Commute & Gas, Electric & Water Bills, Internet & Phone, Shopping & Clothes, Health & Medical, Entertainment & Subs, Other Expense)

If no transactions are found, return an empty array [].`;

        let activeModel = GEMINI_CANDIDATE_MODELS[0];
        let response: any = null;
        let lastModelError: any = null;

        for (const candidate of GEMINI_CANDIDATE_MODELS) {
          try {
            activeModel = candidate;
            response = await ai.models.generateContent({
              model: activeModel,
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      inlineData: {
                        mimeType,
                        data: base64Data,
                      },
                    },
                    { text: prompt },
                  ],
                },
              ],
              config: {
                responseMimeType: 'application/json',
              },
            });

            if (response && response.text) {
              break;
            }
          } catch (modelErr: any) {
            lastModelError = modelErr;
            console.warn(`Gemini model ${candidate} failed (${modelErr?.message || modelErr}), trying next candidate...`);
          }
        }

        if (!response || !response.text) {
          throw lastModelError || new Error('All Gemini candidate models failed to respond.');
        }

        const latencyMs = Date.now() - startTime;
        const replyText = response.text || '';
        
        let parsedJson: any[] = [];
        try {
          const cleaned = replyText.replace(/```json/gi, '').replace(/```/g, '').trim();
          parsedJson = JSON.parse(cleaned);
        } catch (parseError) {
          console.warn('Direct JSON parse failed, extracting substring:', parseError);
          const firstBracket = replyText.indexOf('[');
          const lastBracket = replyText.lastIndexOf(']');
          if (firstBracket !== -1 && lastBracket > firstBracket) {
            try {
              parsedJson = JSON.parse(replyText.slice(firstBracket, lastBracket + 1));
            } catch {
              parsedJson = [];
            }
          }
        }

        if (Array.isArray(parsedJson) && parsedJson.length > 0) {
          // Log successful usage in bili_ai_usage
          await recordGeminiUsage({
            userId: user.id,
            feature: 'statement_vision',
            model: activeModel,
            latencyMs,
            status: 'success',
          });

          const geminiTransactions: ParsedStatementTransaction[] = parsedJson.map((item, idx) => {
            const { categoryId, categoryName } = matchCategoryForMerchant(
              item.description || item.suggestedCategory || '',
              userCategories
            );

            // Pass through normalizeDate to guarantee clean YYYY-MM-DD format defaulting missing year to currentYear
            const rawDateStr = String(item.date || '').trim();
            const { isoDate } = normalizeDate(rawDateStr, currentYear);

            return {
              id: `gemini-tx-${idx}-${Date.now()}`,
              date: isoDate,
              rawDate: rawDateStr || isoDate,
              description: item.description || 'Card Swipe',
              amount: Math.abs(Number(item.amount || 0)),
              isPayment: Boolean(item.isPayment),
              categoryId,
              categoryName,
              confidence: 0.98,
            };
          });

          const totalCharges = geminiTransactions
            .filter((t) => !t.isPayment)
            .reduce((sum, t) => sum + t.amount, 0);

          const totalCredits = geminiTransactions
            .filter((t) => t.isPayment)
            .reduce((sum, t) => sum + t.amount, 0);

          const { transactions: enrichedTx, duplicateCount } = detectStatementDuplicates(
            geminiTransactions,
            existingTransactions,
            cardLoans
          );

          return {
            success: true,
            result: {
              transactions: enrichedTx,
              totalCharges,
              totalCredits,
              duplicateCount,
              source: 'gemini_vision',
              rawTextPreview: replyText.slice(0, 300),
            },
          };
        }
      } catch (geminiError: any) {
        console.warn('Gemini multimodal extraction error, falling back to local OCR/parser:', geminiError);
        const { recordGeminiUsage } = await import('@/lib/ai/gemini');
        await recordGeminiUsage({
          userId: user.id,
          feature: 'statement_vision',
          status: 'error',
          errorMessage: geminiError?.message,
          latencyMs: Date.now() - startTime,
        });
      }
    }

    // B. Local Extraction Fallback (100% Free & Offline)
    let extractedText = '';
    const isPdf = fileType.includes('pdf') || fileName.endsWith('.pdf');

    if (isPdf) {
      // PDF text extraction using pure pdf-parse implementation (bypasses index.js debug block)
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse/lib/pdf-parse.js');
        const parsedPdf = await pdfParse(buffer);
        extractedText = parsedPdf.text || '';
      } catch (pdfErr) {
        console.error('pdf-parse error:', pdfErr);
        return {
          success: false,
          error: 'Failed to extract text from PDF. The document might be password-protected or an image-only scan.',
        };
      }
    } else {
      // Image OCR using tesseract.js with explicit workerPath for Turbopack compatibility
      try {
        const path = await import('path');
        const { createWorker } = await import('tesseract.js');
        const workerPath = path.join(
          process.cwd(),
          'node_modules/tesseract.js/src/worker-script/node/index.js'
        );
        const worker = await createWorker('eng', 1, {
          workerPath,
          errorHandler: (err) => console.error('Tesseract worker error:', err),
        });
        const ret = await worker.recognize(buffer);
        extractedText = ret.data.text || '';
        await worker.terminate();
      } catch (ocrErr) {
        console.error('Tesseract OCR error:', ocrErr);
        return {
          success: false,
          error: 'Failed to run OCR on the uploaded image. Please ensure the image is clear or try pasting the statement text directly.',
        };
      }
    }

    if (!extractedText.trim()) {
      return {
        success: false,
        error: 'No legible text could be extracted from this statement file. Try pasting the text directly or uploading a clearer file.',
      };
    }

    // Run smart pattern parser with currentYear as fallback
    const rawLocalResult = parseStatementText(extractedText, userCategories, currentYear);
    rawLocalResult.source = isPdf ? 'pdf_text' : 'ocr_image';

    const { transactions: enrichedLocalTx, duplicateCount: localDupCount } = detectStatementDuplicates(
      rawLocalResult.transactions,
      existingTransactions,
      cardLoans
    );

    return {
      success: true,
      result: {
        ...rawLocalResult,
        transactions: enrichedLocalTx,
        duplicateCount: localDupCount,
      },
    };
  } catch (error: any) {
    console.error('Statement parsing fatal error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred while parsing the statement.',
    };
  }
}

/**
 * Server Action to batch import user-confirmed transactions from a statement
 */
export async function importStatementTransactionsAction(
  cardId: string,
  transactions: RawImportTransactionInput[]
): Promise<{ success: boolean; importedCount: number; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, importedCount: 0, error: 'Unauthorized.' };
    }

    if (!transactions || transactions.length === 0) {
      return { success: false, importedCount: 0, error: 'No transactions selected for import.' };
    }

    // Verify credit card ownership
    const { data: card, error: cardError } = await supabase
      .from('bili_credit_cards')
      .select('id, name')
      .eq('id', cardId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .single();

    if (cardError || !card) {
      return { success: false, importedCount: 0, error: 'Target credit card not found.' };
    }

    // Prepare rows for batch insert into bili_transactions
    const rows = transactions.map((t) => ({
      website_id: WEBSITE_ID,
      user_id: user.id,
      kind: t.isPayment ? 'income' : 'expense',
      amount: Math.abs(t.amount),
      payment_method: 'credit_card',
      credit_card_id: cardId,
      category_id: t.categoryId || null,
      occurred_on: t.date || new Date().toISOString().split('T')[0],
      note: t.description.trim() || 'Card Swipe',
    }));

    const { error: insertError } = await supabase.from('bili_transactions').insert(rows);

    if (insertError) {
      console.error('Error batch inserting statement transactions:', insertError);
      return { success: false, importedCount: 0, error: 'Failed to save transactions to database.' };
    }

    // Revalidate relevant cache paths
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/cards');
    revalidatePath(`/dashboard/cards/${cardId}`);
    revalidatePath('/dashboard/transactions');

    return {
      success: true,
      importedCount: rows.length,
    };
  } catch (err: any) {
    console.error('Import statement fatal error:', err);
    return {
      success: false,
      importedCount: 0,
      error: err.message || 'Failed to import transactions.',
    };
  }
}
