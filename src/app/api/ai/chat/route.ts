import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  fetchUserFinancialContext,
  buildGeminiChatPrompt,
  commitAITransaction,
  commitAIMultipleTransactions,
  executeFallbackLocalChat,
} from '@/lib/ai/financialContext';
import { retrieveRagFinancialContext } from '@/lib/ai/ragRetriever';
import { getGeminiApiKey, recordGeminiUsage, GEMINI_CANDIDATE_MODELS } from '@/lib/ai/gemini';
import {
  createJsonReplyStreamExtractor,
  simulateStreamText,
} from '@/lib/ai/streamExtractor';
import { isClearlyOffTopic, hasFinancialOrTenviRelevance } from '@/lib/ai/guardrails';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message = '', pendingState = null, history = [] } = body;
  const trimmedMessage = String(message || '').trim();

  if (!trimmedMessage) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  // 2. Set up SSE stream
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (event: string, data: any) => {
    try {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(payload));
    } catch (err) {
      console.warn('[Tenvi AI Stream] Write error:', err);
    }
  };

  // 3. Process chat message asynchronously and write to SSE stream
  (async () => {
    try {
      // Fetch live financial context
      const ctx = await fetchUserFinancialContext(supabase, user.id);

      // Check off-topic guardrails first
      const isOffTopic =
        isClearlyOffTopic(trimmedMessage) ||
        (!pendingState && !hasFinancialOrTenviRelevance(trimmedMessage));

      if (isOffTopic) {
        const deflectionReply =
          'I am **Tenvi AI**, your dedicated personal finance copilot. I am only able to assist with questions about **Tenvi**, your transactions, credit cards, billing cut-offs, loans, receivables, and personal financial management.\n\nHow can I help you manage your finances today?';

        await simulateStreamText(deflectionReply, (delta) => {
          sendEvent('delta', { text: delta });
        }, 15);

        await sendEvent('done', {
          reply: deflectionReply,
          quickReplies: [
            'Which card is best to swipe today?',
            'How much did I spend this month?',
            'What is my emergency living runway?',
            'Bought food worth 1120, yesterday using cash',
          ],
          pendingState: null,
          transaction: null,
        });

        await writer.close();
        return;
      }

      // Retrieve RAG Historical Context if appropriate
      const ragResult = await retrieveRagFinancialContext({
        supabase,
        userId: user.id,
        message: trimmedMessage,
        ctx,
        history,
      });

      // Try Google Gemini Streaming First
      const apiKey = getGeminiApiKey();
      let geminiSuccess = false;

      if (apiKey) {
        const startTime = Date.now();
        const fullPrompt = buildGeminiChatPrompt(
          ctx,
          trimmedMessage,
          pendingState,
          history,
          ragResult.ragContextText
        );

        try {
          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey });

          for (const candidate of GEMINI_CANDIDATE_MODELS) {
            try {
              const stream = await ai.models.generateContentStream({
                model: candidate,
                contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
                config: {
                  responseMimeType: 'application/json',
                },
              });

              let fullRawText = '';
              const extractor = createJsonReplyStreamExtractor((delta) => {
                sendEvent('delta', { text: delta });
              });

              for await (const chunk of stream) {
                const chunkText = chunk.text || '';
                fullRawText += chunkText;
                extractor.push(chunkText);
              }

              if (fullRawText) {
                const latencyMs = Date.now() - startTime;
                let parsedResult: any = null;

                try {
                  const cleanedJson = fullRawText
                    .replace(/^```json\s*/i, '')
                    .replace(/\s*```$/i, '')
                    .trim();
                  parsedResult = JSON.parse(cleanedJson);
                } catch (jsonErr) {
                  console.error('[Tenvi AI Stream] Failed to parse JSON:', jsonErr, fullRawText);
                }

                if (parsedResult && parsedResult.intent) {
                  await recordGeminiUsage({
                    userId: user.id,
                    feature: 'ai_chat',
                    model: candidate,
                    inputTokens: Math.round(fullPrompt.length / 4),
                    outputTokens: Math.round(fullRawText.length / 4),
                    status: 'success',
                    latencyMs,
                  });

                  // If user didn't get streamed reply tokens (e.g. key was named differently), stream it now
                  const finalReply = parsedResult.reply || extractor.getReply();
                  if (!extractor.isDone() && finalReply && extractor.getReply().length < finalReply.length) {
                    const remaining = finalReply.slice(extractor.getReply().length);
                    await simulateStreamText(remaining, (delta) => {
                      sendEvent('delta', { text: delta });
                    }, 10);
                  }

                  // Handle Transaction Insertion if complete
                  let savedTransaction: any = null;
                  let savedTransactions: any[] | null = null;
                  let updatedPending: any = null;

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

                      savedTransactions = await commitAIMultipleTransactions({
                        supabase,
                        userId: user.id,
                        transactions: itemsToCommit,
                      });
                    }
                  } else if (parsedResult.intent === 'log_transaction') {
                    const tx = parsedResult.transaction || {};
                    const missing = Array.isArray(parsedResult.missingFields)
                      ? parsedResult.missingFields
                      : [];

                    if (missing.length > 0) {
                      updatedPending = {
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
                    } else {
                      // All essential fields satisfied: Commit to DB!
                      const finalKind = tx.kind || 'expense';
                      const finalAmount = Number(tx.amount || 0);
                      const finalPaymentMethod = tx.paymentMethod || 'cash';
                      const finalDate = tx.occurredOn || ctx.todayISO;
                      const finalNote = tx.note || (finalKind === 'expense' ? 'Expense' : 'Income');
                      const finalCardId = finalPaymentMethod === 'credit_card' ? tx.creditCardId || null : null;
                      const finalSavingsId = tx.savingsId || null;
                      const finalPropertyId = tx.propertyId || null;
                      const finalCategoryId = tx.categoryId || null;

                      savedTransaction = await commitAITransaction({
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
                    }
                  }

                  await sendEvent('done', {
                    reply: finalReply,
                    quickReplies: parsedResult.quickReplies || [],
                    pendingState: updatedPending,
                    transaction: savedTransaction,
                    transactions: savedTransactions,
                  });

                  geminiSuccess = true;
                  break;
                }
              }
            } catch (candErr: any) {
              console.warn(`[Tenvi AI Stream] Candidate ${candidate} failed:`, candErr?.message || candErr);
            }
          }
        } catch (gemErr: any) {
          console.warn('[Tenvi AI Stream] Gemini init error:', gemErr?.message || gemErr);
          await recordGeminiUsage({
            userId: user.id,
            feature: 'ai_chat',
            status: 'error',
            errorMessage: gemErr?.message || 'Gemini stream error',
          });
        }
      }

      // Fallback: Local rule-based parser with simulated word streaming
      if (!geminiSuccess) {
        const localResult = await executeFallbackLocalChat({
          message: trimmedMessage,
          ctx,
          pendingState,
          supabase,
          userId: user.id,
          ragResult,
        });

        await simulateStreamText(localResult.reply, (delta) => {
          sendEvent('delta', { text: delta });
        }, 15);

        await sendEvent('done', {
          reply: localResult.reply,
          quickReplies: localResult.quickReplies || [],
          pendingState: localResult.pendingState,
          transaction: (localResult as any).transaction || null,
          transactions: (localResult as any).transactions || null,
        });
      }
    } catch (unhandledErr: any) {
      console.error('[Tenvi AI Stream] Unhandled stream error:', unhandledErr);
      await sendEvent('error', {
        message: 'Sorry, I encountered an issue processing your request. Please try again.',
      });
    } finally {
      try {
        await writer.close();
      } catch {}
    }
  })();

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
