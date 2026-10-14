'use server';

import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { ParsedFinancialIntent } from '@/lib/ai/financialParser';
import {
  fetchUserFinancialContext,
  buildGeminiChatPrompt,
  commitAITransaction,
  commitAIMultipleTransactions,
  executeFallbackLocalChat,
  ChatHistoryItem,
} from '@/lib/ai/financialContext';
import { retrieveRagFinancialContext } from '@/lib/ai/ragRetriever';
import { getGeminiApiKey, recordGeminiUsage, GEMINI_CANDIDATE_MODELS, withTimeout } from '@/lib/ai/gemini';
import { isClearlyOffTopic, hasFinancialOrTenviRelevance } from '@/lib/ai/guardrails';
import { revalidatePath } from 'next/cache';

import { ParsedPhotoItem } from '@/types';
import {
  parsePhotoFinancialItems,
  commitPhotoParsedItems,
  commitSinglePhotoParsedItem,
  updatePendingPhotoItemsWithUserInput,
} from '@/lib/ai/photoParser';

export interface AITransactionItem {
  id: string;
  kind: 'expense' | 'income';
  amount: number;
  paymentMethod: string;
  creditCardName?: string | null;
  savingsName?: string | null;
  propertyName?: string | null;
  categoryName?: string | null;
  occurredOn: string;
  note?: string | null;
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  imageUrl?: string;
  quickReplies?: string[];
  transaction?: AITransactionItem;
  transactions?: AITransactionItem[];
  pendingPhotoItems?: ParsedPhotoItem[];
  savedSummary?: {
    expenseCount: number;
    receivableCount: number;
    expenseTotal: number;
    receivableTotal: number;
  };
  isSaved?: boolean;
  isUndone?: boolean;
  isStreaming?: boolean;
}

export interface ChatResponse {
  reply: string;
  quickReplies?: string[];
  pendingState: ParsedFinancialIntent | null;
  transaction?: AITransactionItem;
  transactions?: AITransactionItem[];
  pendingPhotoItems?: ParsedPhotoItem[];
  savedSummary?: {
    expenseCount: number;
    receivableCount: number;
    expenseTotal: number;
    receivableTotal: number;
  };
  error?: string;
}

/**
 * Server action to process natural language financial chat messages (non-streaming fallback)
 */
export async function processAIChatMessageAction(
  message: string,
  pendingState: ParsedFinancialIntent | null,
  history?: ChatHistoryItem[],
  image?: { base64: string; mimeType: string } | null
): Promise<ChatResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      reply: 'Please sign in to your Tenvi account to chat and record transactions.',
      pendingState: null,
      error: 'Unauthorized',
    };
  }

  const trimmedMessage = (message || '').trim();
  const ctx = await fetchUserFinancialContext(supabase, user.id);

  // 1. If an image was submitted, parse items via Multimodal Vision
  if (image && image.base64) {
    const photoResult = await parsePhotoFinancialItems({
      image,
      userMessage: trimmedMessage,
      ctx,
      history,
    });

    return {
      reply: photoResult.reply,
      quickReplies: photoResult.quickReplies,
      pendingState: {
        ...(pendingState || { missingFields: [], confidence: 0.95 }),
        pendingPhotoItems: photoResult.items,
      },
      pendingPhotoItems: photoResult.items,
    };
  }

  // 2. If there are pending photo items waiting for confirmation or clarification
  if (pendingState?.pendingPhotoItems && pendingState.pendingPhotoItems.length > 0) {
    const updateRes = updatePendingPhotoItemsWithUserInput({
      items: pendingState.pendingPhotoItems,
      userMessage: trimmedMessage,
      ctx,
    });

    if (updateRes.action === 'commit') {
      const commitRes = await commitPhotoParsedItems({
        supabase,
        userId: user.id,
        items: updateRes.updatedItems,
      });

      revalidatePath('/dashboard');
      revalidatePath('/dashboard/transactions');
      revalidatePath('/dashboard/loans');
      revalidatePath('/dashboard/receivables');

      const parts: string[] = [];
      if (commitRes.summary.expenseCount > 0) {
        parts.push(`• **${commitRes.summary.expenseCount} Expenses** recorded (₱${commitRes.summary.expenseTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })})`);
      }
      if (commitRes.summary.receivableCount > 0) {
        parts.push(`• **${commitRes.summary.receivableCount} Receivables** recorded (₱${commitRes.summary.receivableTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })})`);
      }

      return {
        reply: `✅ Confirmed and saved **${updateRes.updatedItems.length} items** to your digital ledgers!\n\n${parts.join('\n')}`,
        quickReplies: ['View Transactions', 'View Receivables'],
        pendingState: null,
        savedSummary: commitRes.summary,
      };
    }

    if (updateRes.action === 'cancel') {
      return {
        reply: updateRes.reply,
        quickReplies: updateRes.quickReplies,
        pendingState: null,
      };
    }

    return {
      reply: updateRes.reply,
      quickReplies: updateRes.quickReplies,
      pendingState: {
        ...pendingState,
        pendingPhotoItems: updateRes.updatedItems,
      },
      pendingPhotoItems: updateRes.updatedItems,
    };
  }

  // Check off-topic guardrails first
  const isOffTopic =
    isClearlyOffTopic(trimmedMessage) ||
    (!pendingState && !hasFinancialOrTenviRelevance(trimmedMessage));

  if (isOffTopic) {
    return {
      reply:
        'I am **Tenvi AI**, your dedicated personal finance copilot. I am only able to assist with questions about **Tenvi**, your transactions, credit cards, billing cut-offs, loans, receivables, and personal financial management.\n\nHow can I help you manage your finances today?',
      quickReplies: [
        'Which card is best to swipe today?',
        'How much did I spend this month?',
        'What is my emergency living runway?',
        'Bought food worth 1120, yesterday using cash',
      ],
      pendingState: null,
    };
  }

  // Retrieve RAG Historical Context if appropriate
  const ragResult = await retrieveRagFinancialContext({
    supabase,
    userId: user.id,
    message: trimmedMessage,
    ctx,
    history,
  });

  // Try Google Gemini GenAI First
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    const startTime = Date.now();
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const fullPrompt = buildGeminiChatPrompt(
        ctx,
        trimmedMessage,
        pendingState,
        history,
        ragResult.ragContextText
      );

      let activeModel = GEMINI_CANDIDATE_MODELS[0];
      let geminiRespText = '';

      for (const candidate of GEMINI_CANDIDATE_MODELS) {
        try {
          activeModel = candidate;
          const resp = await withTimeout(
            ai.models.generateContent({
              model: candidate,
              contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
              config: {
                responseMimeType: 'application/json',
              },
            }),
            8000,
            `Model ${candidate} timed out after 8s`
          );
          geminiRespText = resp.text?.trim() || '';
          if (geminiRespText) break;
        } catch (mErr: any) {
          console.warn(`[Tenvi AI Action] Model ${candidate} failed:`, mErr?.message || mErr);
        }
      }

      if (geminiRespText) {
        const latencyMs = Date.now() - startTime;
        let parsedResult: any = null;
        try {
          const cleanedJson = geminiRespText
            .replace(/^```json\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
          parsedResult = JSON.parse(cleanedJson);
        } catch (jsonErr) {
          console.error('[Tenvi AI Action] Failed to parse Gemini JSON:', jsonErr, geminiRespText);
        }

        if (parsedResult && parsedResult.intent) {
          await recordGeminiUsage({
            userId: user.id,
            feature: 'ai_chat',
            model: activeModel,
            inputTokens: Math.round(fullPrompt.length / 4),
            outputTokens: Math.round(geminiRespText.length / 4),
            status: 'success',
            latencyMs,
          });

          if (parsedResult.intent === 'out_of_bounds') {
            return {
              reply:
                parsedResult.reply ||
                'I am **Tenvi AI**, your dedicated personal finance copilot. I am only able to assist with questions about **Tenvi**, your transactions, credit cards, billing cut-offs, loans, receivables, and personal financial management.\n\nHow can I help you manage your finances today?',
              quickReplies: parsedResult.quickReplies || [
                'Which card is best to swipe today?',
                'How much did I spend this month?',
                'What is my emergency living runway?',
              ],
              pendingState: null,
            };
          }

          if (parsedResult.intent === 'financial_query' || parsedResult.intent === 'greeting_or_help') {
            return {
              reply: parsedResult.reply,
              quickReplies: parsedResult.quickReplies || [
                'Which card is best to swipe today?',
                'How much did I spend this month?',
              ],
              pendingState: null,
            };
          }

          if (
            parsedResult.intent === 'log_multiple_transactions' ||
            (Array.isArray(parsedResult.transactions) && parsedResult.transactions.length > 0)
          ) {
            const txList = Array.isArray(parsedResult.transactions) ? parsedResult.transactions : [];
            if (txList.length > 0) {
              const itemsToCommit = txList.map((item: any) => ({
                kind: (item.kind || 'income') as 'expense' | 'income',
                amount: Number(item.amount || 0),
                categoryId: item.categoryId || null,
                paymentMethod: item.paymentMethod || 'cash',
                creditCardId: item.paymentMethod === 'credit_card' ? item.creditCardId || null : null,
                savingsId: item.savingsId || null,
                propertyId: item.propertyId || null,
                occurredOn: item.occurredOn || ctx.todayISO,
                note: item.note || 'Asset Daily Boundary',
                creditCardName: item.creditCardName || null,
                savingsName: item.savingsName || null,
                propertyName: item.propertyName || null,
                categoryName: item.categoryName || 'Asset Revenue',
              }));

              const savedTransactions = await commitAIMultipleTransactions({
                supabase,
                userId: user.id,
                transactions: itemsToCommit,
              });

              return {
                reply: parsedResult.reply,
                pendingState: null,
                quickReplies: parsedResult.quickReplies || [
                  'Which card is best to swipe today?',
                  'How much did I spend this month?',
                ],
                transactions: savedTransactions,
              };
            }
          }

          if (parsedResult.intent === 'log_transaction') {
            const tx = parsedResult.transaction || {};
            const missing = Array.isArray(parsedResult.missingFields) ? parsedResult.missingFields : [];

            if (missing.length > 0) {
              const updatedPending: ParsedFinancialIntent = {
                kind: tx.kind || pendingState?.kind || 'expense',
                amount: tx.amount != null ? Number(tx.amount) : pendingState?.amount,
                paymentMethod: tx.paymentMethod || pendingState?.paymentMethod,
                creditCardId: tx.creditCardId || pendingState?.creditCardId,
                creditCardName: tx.creditCardName || pendingState?.creditCardName,
                savingsId: tx.savingsId || pendingState?.savingsId,
                savingsName: tx.savingsName || pendingState?.savingsName,
                propertyId: tx.propertyId || pendingState?.propertyId,
                propertyName: tx.propertyName || pendingState?.propertyName,
                categoryId: tx.categoryId || pendingState?.categoryId,
                categoryName: tx.categoryName || pendingState?.categoryName,
                occurredOn: tx.occurredOn || pendingState?.occurredOn || ctx.todayISO,
                note: tx.note || pendingState?.note || 'Transaction',
                missingFields: missing,
                confidence: 0.95,
              };

              return {
                reply: parsedResult.reply,
                quickReplies: parsedResult.quickReplies || [],
                pendingState: updatedPending,
              };
            }

            const finalKind = tx.kind || 'expense';
            const finalAmount = Number(tx.amount || 0);
            const finalPaymentMethod = tx.paymentMethod || 'cash';
            const finalDate = tx.occurredOn || ctx.todayISO;
            const finalNote = tx.note || (finalKind === 'expense' ? 'Expense' : 'Income');
            const finalCardId = finalPaymentMethod === 'credit_card' ? tx.creditCardId || null : null;
            const finalSavingsId = tx.savingsId || null;
            const finalPropertyId = tx.propertyId || null;
            const finalCategoryId = tx.categoryId || null;

            const savedTransaction = await commitAITransaction({
              supabase,
              userId: user.id,
              kind: finalKind,
              amount: finalAmount,
              categoryId: finalCategoryId,
              paymentMethod: finalPaymentMethod,
              creditCardId: finalCardId,
              savingsId: finalSavingsId,
              propertyId: finalPropertyId,
              occurredOn: finalDate,
              note: finalNote,
              creditCardName: tx.creditCardName,
              savingsName: tx.savingsName,
              propertyName: tx.propertyName,
              categoryName: tx.categoryName,
            });

            return {
              reply: parsedResult.reply,
              pendingState: null,
              quickReplies: parsedResult.quickReplies || [
                'Which card is best to swipe today?',
                'How much did I spend this month?',
              ],
              transaction: savedTransaction,
            };
          }
        }
      }
    } catch (gemErr: any) {
      console.warn('[Tenvi AI Action] Gemini failed, falling back to local:', gemErr?.message || gemErr);
      await recordGeminiUsage({
        userId: user.id,
        feature: 'ai_chat',
        status: 'error',
        errorMessage: gemErr?.message || 'Gemini error',
      });
    }
  }

  // Fallback: Local rule-based parser
  const localResult = await executeFallbackLocalChat({
    message: trimmedMessage,
    ctx,
    pendingState,
    supabase,
    userId: user.id,
    ragResult,
  });

  return {
    reply: localResult.reply,
    quickReplies: localResult.quickReplies || [],
    pendingState: localResult.pendingState,
    transaction: (localResult as any).transaction || undefined,
    transactions: (localResult as any).transactions || undefined,
  };
}

/**
 * Undo / Delete an AI-created transaction
 */
export async function undoAITransactionAction(
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Revert savings balance if this transaction was connected to savings
  const { data: tx } = await supabase
    .from('bili_transactions')
    .select('id, kind, amount, savings_id')
    .eq('id', transactionId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .maybeSingle();

  if (tx && tx.savings_id) {
    const { data: account } = await supabase
      .from('bili_savings')
      .select('id, current_balance')
      .eq('id', tx.savings_id)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .maybeSingle();

    if (account) {
      const current = Number(account.current_balance || 0);
      const amt = Number(tx.amount || 0);
      const reverted = tx.kind === 'income' ? Math.max(0, current - amt) : current + amt;
      await supabase
        .from('bili_savings')
        .update({
          current_balance: reverted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tx.savings_id)
        .eq('website_id', WEBSITE_ID)
        .eq('user_id', user.id);
    }
  }

  const { error } = await supabase
    .from('bili_transactions')
    .delete()
    .eq('id', transactionId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error undoing AI transaction:', error);
    return { success: false, error: 'Failed to delete transaction' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/cards');
  revalidatePath('/dashboard/savings');
  revalidatePath('/dashboard/properties');

  return { success: true };
}

/**
 * Undo / Delete multiple AI-created transactions (e.g. multi-log batch)
 */
export async function undoAIMultipleTransactionsAction(
  transactionIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!transactionIds || transactionIds.length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from('bili_transactions')
    .delete()
    .in('id', transactionIds)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error undoing multiple AI transactions:', error);
    return { success: false, error: 'Failed to delete transactions' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/cards');
  revalidatePath('/dashboard/savings');
  revalidatePath('/dashboard/properties');

  return { success: true };
}

/**
 * Commits confirmed items parsed from a photo directly via 1-click button
 */
export async function commitPhotoParsedItemsAction(items: ParsedPhotoItem[]): Promise<{
  success: boolean;
  error?: string;
  savedSummary?: {
    expenseCount: number;
    receivableCount: number;
    expenseTotal: number;
    receivableTotal: number;
  };
  createdContacts?: Array<{ id: string; name: string }>;
  errors?: string[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!items || items.length === 0) {
    return { success: false, error: 'No items to save' };
  }

  try {
    const res = await commitPhotoParsedItems({
      supabase,
      userId: user.id,
      items,
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/transactions');
    revalidatePath('/dashboard/loans');
    revalidatePath('/dashboard/receivables');

    return {
      success: true,
      savedSummary: res.summary,
      createdContacts: res.createdContacts,
      errors: res.errors,
    };
  } catch (err: any) {
    console.error('Error committing photo parsed items:', err);
    return {
      success: false,
      error: err?.message || 'Failed to save items',
    };
  }
}

/**
 * Commits a single confirmed item parsed from a photo directly via 1-click button
 */
export async function commitSinglePhotoParsedItemAction(item: ParsedPhotoItem): Promise<{
  success: boolean;
  error?: string;
  savedRecord?: any;
  createdContact?: { id: string; name: string } | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!item) {
    return { success: false, error: 'No item provided to save' };
  }

  try {
    const res = await commitSinglePhotoParsedItem({
      supabase,
      userId: user.id,
      item,
    });

    if (res.success) {
      revalidatePath('/dashboard');
      revalidatePath('/dashboard/transactions');
      revalidatePath('/dashboard/loans');
      revalidatePath('/dashboard/receivables');
    }

    return res;
  } catch (err: any) {
    console.error('Error committing single photo parsed item:', err);
    return {
      success: false,
      error: err?.message || 'Failed to save item',
    };
  }
}
