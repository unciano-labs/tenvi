'use server';

import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { Category } from '@/types';
import { matchCategoryForMerchant, normalizeDate } from '@/lib/ai/statementParser';

export interface ReceiptParseResult {
  merchant: string;
  amount: number;
  date: string;
  paymentMethod: 'cash' | 'credit_card' | 'gcash' | 'maya' | 'bank_transfer' | null;
  itemsSummary: string | null;
  categoryId: string | null;
  categoryName: string | null;
  source: 'gemini_vision' | 'ocr_fallback';
  rawTextPreview?: string;
}

/**
 * Server Action to parse a single receipt or invoice image.
 * Uses Gemini Multimodal Vision with automatic local Tesseract OCR fallback.
 */
export async function parseReceiptImageAction(
  formData: FormData
): Promise<{ success: boolean; result?: ReceiptParseResult; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return { success: false, error: 'No receipt image provided.' };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name.toLowerCase();
    const fileType = file.type || 'image/jpeg';
    const currentYear = new Date().getFullYear();

    // 1. Fetch user categories for auto-categorization
    const { data: categories } = await supabase
      .from('bili_categories')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('kind', 'expense')
      .order('name', { ascending: true });

    const userCategories: Category[] = categories || [];

    // 2. Multimodal AI Vision Extraction (Primary)
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (apiKey) {
      const startTime = Date.now();
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const { recordGeminiUsage, GEMINI_CANDIDATE_MODELS } = await import('@/lib/ai/gemini');
        const ai = new GoogleGenAI({ apiKey });

        const base64Data = buffer.toString('base64');
        let mimeType = fileType;
        if (!mimeType || mimeType === 'application/octet-stream') {
          if (fileName.endsWith('.png')) mimeType = 'image/png';
          else if (fileName.endsWith('.webp')) mimeType = 'image/webp';
          else if (fileName.endsWith('.heic')) mimeType = 'image/heic';
          else if (fileName.endsWith('.pdf')) mimeType = 'application/pdf';
          else mimeType = 'image/jpeg';
        }

        const prompt = `You are an expert OCR receipt and financial invoice parser.
Extract the key financial transaction details from this receipt or bill image.

CRITICAL RULES:
1. "date": Return in "YYYY-MM-DD" format. If the year is not printed, default to ${currentYear}. If the date cannot be determined at all, return today's date in "YYYY-MM-DD".
2. "amount": The final total amount paid (positive float, e.g. 450.00). Do not pick the subtotal, change, or tax unless it equals the total.
3. "merchant": The official business or store name (e.g., "Jollibee", "Mercury Drug", "Shell", "SM Supermarket", "Starbucks").
4. "paymentMethod": One of "cash", "credit_card", "gcash", "maya", "bank_transfer", or null if not indicated.
5. "itemsSummary": A brief 1-line summary of top 1-3 purchased items (e.g. "2pc Chickenjoy, Burger Steak").
6. "suggestedCategory": Suggest the best matching category from:
   - Food & Groceries
   - Dining Out
   - Commute & Gas
   - Electric & Water Bills
   - Internet & Phone
   - Shopping & Clothes
   - Health & Medical
   - Entertainment & Subs
   - Other Expense

Return a single JSON object with exact keys:
{
  "merchant": string,
  "amount": number,
  "date": "YYYY-MM-DD",
  "paymentMethod": "cash" | "credit_card" | "gcash" | "maya" | "bank_transfer" | null,
  "itemsSummary": string | null,
  "suggestedCategory": string
}`;

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
            console.warn(`Gemini receipt model ${candidate} failed, trying next candidate...`);
          }
        }

        if (response && response.text) {
          const latencyMs = Date.now() - startTime;
          const replyText = response.text.trim();
          let parsed: any = null;

          try {
            const cleaned = replyText.replace(/```json/gi, '').replace(/```/g, '').trim();
            parsed = JSON.parse(cleaned);
          } catch {
            const firstBrace = replyText.indexOf('{');
            const lastBrace = replyText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
              parsed = JSON.parse(replyText.slice(firstBrace, lastBrace + 1));
            }
          }

          if (parsed && typeof parsed === 'object') {
            await recordGeminiUsage({
              userId: user.id,
              feature: 'statement_vision',
              model: activeModel,
              latencyMs,
              status: 'success',
            });

            const rawMerchant = String(parsed.merchant || 'Store Receipt').trim();
            const rawDate = String(parsed.date || '').trim();
            const { isoDate } = normalizeDate(rawDate, currentYear);
            const totalAmount = Math.abs(Number(parsed.amount || 0));

            // Auto-categorize
            const { categoryId, categoryName } = matchCategoryForMerchant(
              `${rawMerchant} ${parsed.suggestedCategory || ''} ${parsed.itemsSummary || ''}`,
              userCategories
            );

            return {
              success: true,
              result: {
                merchant: rawMerchant,
                amount: totalAmount,
                date: isoDate,
                paymentMethod: parsed.paymentMethod || null,
                itemsSummary: parsed.itemsSummary || null,
                categoryId,
                categoryName,
                source: 'gemini_vision',
                rawTextPreview: replyText.slice(0, 200),
              },
            };
          }
        }
      } catch (geminiErr: any) {
        console.warn('Gemini vision receipt parsing error, falling back to local OCR:', geminiErr);
      }
    }

    // 3. Fallback: Local Tesseract OCR
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
      const ocrText = ret.data.text || '';
      await worker.terminate();

      if (!ocrText.trim()) {
        return {
          success: false,
          error: 'No legible text could be detected from the receipt image. Please ensure good lighting and try again.',
        };
      }

      // Extract details using heuristics
      const lines = ocrText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      // Guess merchant name from the first 3 non-empty lines
      let merchantGuess = 'Receipt Purchase';
      for (let i = 0; i < Math.min(4, lines.length); i++) {
        const line = lines[i];
        if (line.length > 2 && !/total|tin|reg|vat|date|cash|or#|tel/i.test(line)) {
          merchantGuess = line;
          break;
        }
      }

      // Search for highest number or total pattern
      let parsedAmount = 0;
      const totalRegex = /(?:total|amount due|amount|bal|net|total due|cash)\s*[:=]?\s*(?:php|p|₱)?\s*([0-9,]+\.[0-9]{2})/i;
      const totalMatch = ocrText.match(totalRegex);
      if (totalMatch) {
        parsedAmount = parseFloat(totalMatch[1].replace(/,/g, ''));
      } else {
        // Find any price-like patterns (e.g. 120.50)
        const priceMatches = ocrText.match(/[0-9]+(?:\.[0-9]{2})/g);
        if (priceMatches && priceMatches.length > 0) {
          const numbers = priceMatches.map((n) => parseFloat(n)).filter((n) => !isNaN(n) && n > 0);
          if (numbers.length > 0) {
            parsedAmount = Math.max(...numbers);
          }
        }
      }

      // Search for dates (e.g. MM/DD/YYYY or DD-Mon-YYYY)
      const dateRegex = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b|\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/i;
      const dateMatch = ocrText.match(dateRegex);
      const { isoDate } = normalizeDate(dateMatch ? dateMatch[0] : '', currentYear);

      // Detect payment method
      let detectedPaymentMethod: 'cash' | 'credit_card' | 'gcash' | 'maya' | null = null;
      if (/gcash/i.test(ocrText)) detectedPaymentMethod = 'gcash';
      else if (/maya|paymaya/i.test(ocrText)) detectedPaymentMethod = 'maya';
      else if (/visa|mastercard|jcb|amex|credit|card/i.test(ocrText)) detectedPaymentMethod = 'credit_card';
      else if (/cash/i.test(ocrText)) detectedPaymentMethod = 'cash';

      const { categoryId, categoryName } = matchCategoryForMerchant(
        `${merchantGuess} ${ocrText.slice(0, 300)}`,
        userCategories
      );

      return {
        success: true,
        result: {
          merchant: merchantGuess,
          amount: parsedAmount,
          date: isoDate,
          paymentMethod: detectedPaymentMethod,
          itemsSummary: null,
          categoryId,
          categoryName,
          source: 'ocr_fallback',
          rawTextPreview: ocrText.slice(0, 150),
        },
      };
    } catch (ocrErr: any) {
      console.error('Tesseract fallback error on receipt:', ocrErr);
      return {
        success: false,
        error: 'Failed to extract text from the receipt. Please enter details manually.',
      };
    }
  } catch (err: any) {
    console.error('parseReceiptImageAction error:', err);
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred parsing the receipt.',
    };
  }
}
