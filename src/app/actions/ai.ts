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
import { getGeminiApiKey, recordGeminiUsage, GEMINI_CANDIDATE_MODELS } from '@/lib/ai/gemini';
import { isClearlyOffTopic, hasFinancialOrTenviRelevance } from '@/lib/ai/guardrails';
import { revalidatePath } from 'next/cache';

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
  quickReplies?: string[];
  transaction?: AITransactionItem;
  transactions?: AITransactionItem[];
  isUndone?: boolean;
  isStreaming?: boolean;
}

export interface ChatResponse {
  reply: string;
  quickReplies?: string[];
  pendingState: ParsedFinancialIntent | null;
  transaction?: AITransactionItem;
  transactions?: AITransactionItem[];
  error?: string;
}

/**
 * Server action to process natural language financial chat messages (non-streaming fallback)
 */
export async function processAIChatMessageAction(
  message: string,
  pendingState: ParsedFinancialIntent | null,
  history?: ChatHistoryItem[]
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
          const resp = await ai.models.generateContent({
            model: candidate,
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            config: {
              responseMimeType: 'application/json',
            },
          });
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
