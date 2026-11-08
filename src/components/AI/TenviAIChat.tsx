'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { TenviIcon } from '@/components/ui/TenviIcon';
import { ChatHeader } from './ChatHeader';
import { WelcomeState } from './WelcomeState';
import { SuggestionChips } from './SuggestionChips';
import { ChatMessageList } from './ChatMessageList';
import { ChatComposer, AttachedFileItem } from './ChatComposer';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import {
  processAIChatMessageAction,
  undoAITransactionAction,
  undoAIMultipleTransactionsAction,
  commitPhotoParsedItemsAction,
  commitSinglePhotoParsedItemAction,
  AIChatMessage,
} from '@/app/actions/ai';
import { ParsedFinancialIntent } from '@/lib/ai/financialParser';
import { ParsedPhotoItem } from '@/types';
import { optimizeImageForUpload } from '@/lib/ai/imageOptimizer';
import { getPropertyIcon } from '@/lib/constants';
import { CardOption, RecentTransactionOption } from './RichCards';

export type { CardOption, RecentTransactionOption };

export interface ContactOption {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface PropertyOption {
  id: string;
  name: string;
  property_type?: string;
  identifier?: string | null;
}

export interface TenviAIChatProps {
  initialContacts?: ContactOption[];
  initialProperties?: PropertyOption[];
  initialCards?: CardOption[];
  initialRecentTransactions?: RecentTransactionOption[];
  userName?: string;
}

const INITIAL_WELCOME_MESSAGE: AIChatMessage = {
  id: 'welcome-msg',
  sender: 'assistant',
  text: "Hello! I'm **Tenvi AI**, your personal financial assistant.\n\nAsk questions about your credit cards, cash flow, or record expenses in plain English or Taglish.",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  quickReplies: [
    'Which card is best to swipe today?',
    'When is my next credit card due date?',
    'Paid 250 for lunch in cash',
  ],
};

export function TenviAIChat({
  initialContacts = [],
  initialProperties = [],
  initialCards = [],
  initialRecentTransactions = [],
  userName,
}: TenviAIChatProps = {}) {
  const router = useRouter();

  // Dialog & Window Viewport State
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Entities and Borrowers
  const [contacts, setContacts] = useState<ContactOption[]>(initialContacts);
  const [properties, setProperties] = useState<PropertyOption[]>(initialProperties);
  const [cards, setCards] = useState<CardOption[]>(initialCards);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransactionOption[]>(initialRecentTransactions);
  const [customBorrowers] = useState<string[]>([]);

  useEffect(() => {
    if (initialContacts && initialContacts.length > 0) {
      setContacts(initialContacts);
    }
  }, [initialContacts]);

  useEffect(() => {
    if (initialProperties && initialProperties.length > 0) {
      setProperties(initialProperties);
    }
  }, [initialProperties]);

  useEffect(() => {
    if (initialCards && initialCards.length > 0) {
      setCards(initialCards);
    }
  }, [initialCards]);

  useEffect(() => {
    if (initialRecentTransactions && initialRecentTransactions.length > 0) {
      setRecentTransactions(initialRecentTransactions);
    }
  }, [initialRecentTransactions]);

  // Messages & Conversation State
  const [messages, setMessages] = useState<AIChatMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingState, setPendingState] = useState<ParsedFinancialIntent | null>(null);
  const [undoingTxId, setUndoingTxId] = useState<string | null>(null);
  const [undoingBatchMsgId, setUndoingBatchMsgId] = useState<string | null>(null);
  const [savingPhotoMsgId, setSavingPhotoMsgId] = useState<string | null>(null);
  const [savingSingleItemId, setSavingSingleItemId] = useState<string | null>(null);

  // Attached Image, PDF, or HEIC File
  const [attachedImage, setAttachedImage] = useState<AttachedFileItem | null>(null);

  // Element Refs for Focus & Scroll
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // Scroll tracking to tuck or scale down FAB slightly when scrolling down
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const lastScrollY = useRef(0);
  const scrollTicking = useRef(false);

  useEffect(() => {
    const handleScroll = (e?: Event) => {
      if (!scrollTicking.current) {
        window.requestAnimationFrame(() => {
          let currentY = 0;
          const target = e?.target as HTMLElement | null;
          if (
            target &&
            typeof target.scrollTop === 'number' &&
            target !== document.documentElement &&
            target !== (document as unknown)
          ) {
            currentY = target.scrollTop;
          } else {
            const mainEl = document.getElementById('dashboard-main') || document.querySelector('main');
            if (mainEl && mainEl.scrollTop > 0) {
              currentY = mainEl.scrollTop;
            } else {
              currentY = window.scrollY || document.documentElement.scrollTop || 0;
            }
          }

          const delta = currentY - lastScrollY.current;
          if (currentY <= 30) {
            setIsScrolledDown(false);
            lastScrollY.current = Math.max(0, currentY);
          } else if (delta > 8 && currentY > 80) {
            setIsScrolledDown(true);
            lastScrollY.current = currentY;
          } else if (delta < -8) {
            setIsScrolledDown(false);
            lastScrollY.current = currentY;
          }

          scrollTicking.current = false;
        });
        scrollTicking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    const mainEl = document.getElementById('dashboard-main');
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Voice Speech Recognition Hook
  const baseVoiceTextRef = useRef('');
  const {
    isListening,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    lang: 'en-PH', // Philippine English & Taglish
    continuous: true,
    interimResults: true,
    onResult: (resultTranscript) => {
      const base = baseVoiceTextRef.current;
      const separator = base && !base.endsWith(' ') ? ' ' : '';
      const newText = base ? `${base}${separator}${resultTranscript}` : resultTranscript;
      setInputText(newText);
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
      }
    },
    onError: (errMessage) => {
      toast.error(errMessage);
    },
    onEnd: () => {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    },
  });

  const handleToggleVoiceInput = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      if (!isSpeechSupported) {
        toast.info(
          'Voice input is not supported in this browser. Please try Google Chrome, Microsoft Edge, or Safari.'
        );
        return;
      }
      baseVoiceTextRef.current = inputText;
      startListening();
    }
  }, [isListening, isSpeechSupported, inputText, startListening, stopListening]);

  // Aggregate all available borrowers (contacts + properties + customs)
  const allAvailableBorrowers = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      isCustom: boolean;
      isProperty?: boolean;
      icon?: string;
    }> = [];
    const seen = new Set<string>();

    for (const c of contacts) {
      const lower = c.name.trim().toLowerCase();
      if (lower && !seen.has(lower)) {
        seen.add(lower);
        list.push({ id: c.id, name: c.name.trim(), isCustom: false, icon: '👤' });
      }
    }

    for (const p of properties) {
      const lower = p.name.trim().toLowerCase();
      if (lower && !seen.has(lower)) {
        seen.add(lower);
        list.push({
          id: `prop:${p.name.trim()}`,
          name: p.name.trim(),
          isCustom: false,
          isProperty: true,
          icon: getPropertyIcon(p.property_type),
        });
      }
    }

    const allCustoms = new Set<string>();
    for (const name of customBorrowers) {
      if (name && name.trim().length >= 2) allCustoms.add(name.trim());
    }
    for (const m of messages) {
      if (m.pendingPhotoItems) {
        for (const it of m.pendingPhotoItems) {
          const b = it.borrowerName?.trim();
          if (b && b.length >= 2) allCustoms.add(b);
        }
      }
    }

    for (const name of allCustoms) {
      const lower = name.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push({ id: `custom:${name}`, name, isCustom: true, icon: '✨' });
      }
    }

    return list;
  }, [contacts, properties, customBorrowers, messages]);

  // Open & Close Dialog Handlers
  const handleOpenChat = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsOpen(true);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 150);
      });
    });
  };

  const handleCloseChat = useCallback(() => {
    if (isListening) {
      stopListening();
    }
    setIsOpen(false);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsMounted(false);
      closeTimeoutRef.current = null;
      triggerButtonRef.current?.focus();
    }, 250);
  }, [isListening, stopListening]);

  // Keyboard accessibility: Escape closes, focus trap handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCloseChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleCloseChat]);

  // Stop listening when chat closes
  useEffect(() => {
    if (!isOpen && isListening) {
      stopListening();
    }
  }, [isOpen, isListening, stopListening]);

  // Reset chat session
  const handleResetChat = () => {
    if (isListening) stopListening();
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setPendingState(null);
    setInputText('');
    setAttachedImage(null);
    try {
      localStorage.removeItem('tenvi_ai_chat_session');
    } catch {}
    toast.success('Started a fresh chat session');
  };

  const handleToggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  // Image / PDF Receipt Selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isHeic =
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif');
    const isImage = file.type.startsWith('image/') || isHeic;

    if (!isImage && !isPdf) {
      toast.error('Please upload an image receipt (JPEG, PNG, HEIC, WebP) or PDF document.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File exceeds 15MB limit. Please choose a smaller photo or PDF.');
      return;
    }

    try {
      // Skip canvas downscaling for HEIC (browsers do not support native HEIC canvas decoding) and PDFs
      const targetFile = isPdf || isHeic ? file : await optimizeImageForUpload(file);
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes('base64,') ? result.split('base64,')[1] : result;
        const mimeType = isPdf
          ? 'application/pdf'
          : isHeic
          ? (file.type || 'image/heic')
          : (targetFile.type || 'image/jpeg');

        setAttachedImage({
          file: targetFile,
          previewUrl: result, // Self-contained data URL
          base64,
          mimeType,
          isPdf,
          isHeic,
        });

        toast.success(
          isPdf
            ? 'PDF receipt ready for AI analysis'
            : isHeic
            ? 'HEIC receipt photo ready for AI analysis'
            : 'Receipt photo ready for AI analysis'
        );
        inputRef.current?.focus();
      };

      reader.onerror = (err) => {
        console.error('FileReader error:', err);
        toast.error('Could not read the selected file.');
      };

      reader.readAsDataURL(targetFile);
    } catch (err: any) {
      console.error('Error processing file upload:', err);
      toast.error('Failed to process file. Please try again.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setAttachedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Send Message Handler (Streaming & Action Dispatch)
  const handleSendMessage = async (textToSend?: string) => {
    if (isListening) {
      stopListening();
    }
    const text = (textToSend || inputText).trim();
    if ((!text && !attachedImage) || isProcessing) return;

    const imageToSend = attachedImage;
    setAttachedImage(null);

    const isPdf =
      imageToSend?.isPdf ||
      imageToSend?.mimeType === 'application/pdf' ||
      imageToSend?.file.name.toLowerCase().endsWith('.pdf');

    const isHeic =
      imageToSend?.isHeic ||
      imageToSend?.mimeType === 'image/heic' ||
      imageToSend?.mimeType === 'image/heif' ||
      imageToSend?.file.name.toLowerCase().endsWith('.heic') ||
      imageToSend?.file.name.toLowerCase().endsWith('.heif');

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text:
        text ||
        (isPdf
          ? '📄 [Uploaded PDF Document]'
          : isHeic
          ? '📸 [Uploaded HEIC Photo]'
          : imageToSend
          ? '📸 [Uploaded Photo]'
          : ''),
      imageUrl: imageToSend?.previewUrl,
      fileName: imageToSend?.file.name,
      fileType: isPdf ? 'pdf' : imageToSend ? 'image' : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantMsgId = `assistant-${Date.now()}`;
    const initialAssistantMsg: AIChatMessage = {
      id: assistantMsgId,
      sender: 'assistant',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setInputText('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setIsProcessing(true);

    const history = messages
      .slice(-6)
      .map((m) => ({ sender: m.sender, text: m.text }));

    try {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          image: imageToSend ? { base64: imageToSend.base64, mimeType: imageToSend.mimeType } : null,
          pendingState,
          history,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Streaming not supported or failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const evt of events) {
          const lines = evt.split('\n');
          let eventType = 'message';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.replace('event: ', '').trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.replace('data: ', '').trim();
            }
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            if (eventType === 'delta' || eventType === 'chunk') {
              const deltaText = data.text !== undefined ? data.text : (data.chunk || '');
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        text: (m.text || '') + deltaText,
                      }
                    : m
                )
              );
            } else if (eventType === 'done') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        text: data.reply || m.text,
                        quickReplies: data.quickReplies,
                        transaction: data.transaction,
                        transactions: data.transactions,
                        pendingPhotoItems: data.pendingPhotoItems,
                        savedSummary: data.savedSummary,
                        isSaved: data.savedSummary ? true : m.isSaved,
                        isStreaming: false,
                      }
                    : m
                )
              );

              setPendingState(data.pendingState);

              if (Array.isArray(data.transactions) && data.transactions.length > 0) {
                const total = data.transactions.reduce(
                  (sum: number, tx: any) => sum + Number(tx.amount || 0),
                  0
                );
                toast.success(
                  `Recorded ${data.transactions.length} daily entries (₱${total.toLocaleString('en-US', { minimumFractionDigits: 2 })})!`
                );
                router.refresh();
              } else if (data.transaction) {
                toast.success(
                  data.transaction.kind === 'expense'
                    ? `Recorded ₱${Number(data.transaction.amount).toLocaleString()} Expense!`
                    : `Recorded ₱${Number(data.transaction.amount).toLocaleString()} Income!`
                );
                router.refresh();
              }
            } else if (eventType === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        text: data.message || 'Sorry, an error occurred.',
                        isStreaming: false,
                      }
                    : m
                )
              );
            }
          } catch (pErr) {
            console.error('Failed to parse SSE event data:', pErr, dataStr);
          }
        }
      }
    } catch (err) {
      console.warn('Streaming fetch failed, falling back to Server Action:', err);
      try {
        const fallbackRes = await processAIChatMessageAction(
          text,
          pendingState,
          history,
          imageToSend ? { base64: imageToSend.base64, mimeType: imageToSend.mimeType } : null
        );
        setPendingState(fallbackRes.pendingState);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  text: fallbackRes.reply,
                  quickReplies: fallbackRes.quickReplies,
                  transaction: fallbackRes.transaction,
                  transactions: fallbackRes.transactions,
                  pendingPhotoItems: fallbackRes.pendingPhotoItems,
                  savedSummary: fallbackRes.savedSummary,
                  isSaved: fallbackRes.savedSummary ? true : m.isSaved,
                  isStreaming: false,
                }
              : m
          )
        );

        if (Array.isArray(fallbackRes.transactions) && fallbackRes.transactions.length > 0) {
          const total = fallbackRes.transactions.reduce(
            (sum: number, tx: any) => sum + Number(tx.amount || 0),
            0
          );
          toast.success(
            `Recorded ${fallbackRes.transactions.length} daily entries (₱${total.toLocaleString('en-US', { minimumFractionDigits: 2 })})!`
          );
          router.refresh();
        } else if (fallbackRes.transaction) {
          toast.success(
            fallbackRes.transaction.kind === 'expense'
              ? `Recorded ₱${Number(fallbackRes.transaction.amount).toLocaleString()} Expense!`
              : `Recorded ₱${Number(fallbackRes.transaction.amount).toLocaleString()} Income!`
          );
          router.refresh();
        }
      } catch (fallbackErr) {
        console.error('AI chat failed completely:', fallbackErr);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  text: 'Sorry, I encountered an issue processing your request. Please try again.',
                  isStreaming: false,
                }
              : m
          )
        );
      }
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // Undo Handlers
  const handleUndo = async (transactionId: string, messageId: string) => {
    setUndoingTxId(transactionId);
    try {
      const res = await undoAITransactionAction(transactionId);
      if (res.success) {
        toast.success('Transaction undone and removed from your ledger');
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isUndone: true } : m))
        );
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to undo transaction');
      }
    } catch (err) {
      console.error('Error undoing transaction:', err);
      toast.error('Failed to undo transaction');
    } finally {
      setUndoingTxId(null);
    }
  };

  const handleUndoMultiple = async (transactionIds: string[], messageId: string) => {
    setUndoingBatchMsgId(messageId);
    try {
      const res = await undoAIMultipleTransactionsAction(transactionIds);
      if (res.success) {
        toast.success(`All ${transactionIds.length} batch transactions undone and removed`);
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isUndone: true } : m))
        );
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to undo transactions');
      }
    } catch (err) {
      console.error('Error undoing multiple transactions:', err);
      toast.error('Failed to undo transactions');
    } finally {
      setUndoingBatchMsgId(null);
    }
  };

  // Photo Parsed Item Handlers
  const handleUpdatePhotoItem = (msgId: string, itemId: string, updates: Partial<ParsedPhotoItem>) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== msgId || !msg.pendingPhotoItems) return msg;
        return {
          ...msg,
          pendingPhotoItems: msg.pendingPhotoItems.map((it) =>
            it.id === itemId ? { ...it, ...updates } : it
          ),
        };
      })
    );
    setPendingState((prev) => {
      if (!prev || !prev.pendingPhotoItems) return prev;
      return {
        ...prev,
        pendingPhotoItems: prev.pendingPhotoItems.map((it) =>
          it.id === itemId ? { ...it, ...updates } : it
        ),
      };
    });
  };

  const handleUpdateAllPhotoItems = (msgId: string, updates: Partial<ParsedPhotoItem>) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== msgId || !msg.pendingPhotoItems) return msg;
        return {
          ...msg,
          pendingPhotoItems: msg.pendingPhotoItems.map((it) => ({
            ...it,
            ...updates,
          })),
        };
      })
    );
    setPendingState((prev) => {
      if (!prev || !prev.pendingPhotoItems) return prev;
      return {
        ...prev,
        pendingPhotoItems: prev.pendingPhotoItems.map((it) => ({
          ...it,
          ...updates,
        })),
      };
    });
  };

  const handleSaveSinglePhotoItem = async (msgId: string, item: ParsedPhotoItem) => {
    setSavingSingleItemId(item.id);
    try {
      const res = await commitSinglePhotoParsedItemAction(item);
      if (res.success) {
        toast.success(`Saved "${item.title}" to ledger`);
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== msgId || !msg.pendingPhotoItems) return msg;
            const remaining = msg.pendingPhotoItems.filter((it) => it.id !== item.id);
            return {
              ...msg,
              pendingPhotoItems: remaining,
              isSaved: remaining.length === 0 ? true : msg.isSaved,
            };
          })
        );
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to save item');
      }
    } catch (err) {
      console.error('Error saving single photo item:', err);
      toast.error('Failed to save item');
    } finally {
      setSavingSingleItemId(null);
    }
  };

  const handleDiscardPhotoItem = (msgId: string, itemId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== msgId || !msg.pendingPhotoItems) return msg;
        const remaining = msg.pendingPhotoItems.filter((it) => it.id !== itemId);
        return {
          ...msg,
          pendingPhotoItems: remaining,
          isSaved: remaining.length === 0 ? true : msg.isSaved,
        };
      })
    );
    toast.info('Item discarded');
  };

  const handleConfirmSavePhotoItems = async (msgId: string, items: ParsedPhotoItem[]) => {
    setSavingPhotoMsgId(msgId);
    try {
      const res = await commitPhotoParsedItemsAction(items);
      if (res.success) {
        toast.success(`All ${items.length} items recorded to your digital ledger`);
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== msgId) return msg;
            return {
              ...msg,
              pendingPhotoItems: [],
              isSaved: true,
            };
          })
        );
        setPendingState(null);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to save parsed items');
      }
    } catch (err) {
      console.error('Error confirming photo parsed items:', err);
      toast.error('Failed to save parsed items');
    } finally {
      setSavingPhotoMsgId(null);
    }
  };

  const handleCancelPhotoItems = (msgId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== msgId) return msg;
        return {
          ...msg,
          pendingPhotoItems: [],
          isSaved: true,
        };
      })
    );
    setPendingState(null);
    toast.info('Cancelled saving photo items.');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isInitialState = messages.length === 1 && messages[0].id === 'welcome-msg';

  return (
    <>
      {/* Floating Trigger Button (Tenvi AI FAB) */}
      <div
        className={`fixed z-40 transition-[opacity,transform] duration-(--motion-base) ease-(--ease-spring-pop) origin-bottom-right top-auto bottom-24 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] right-4 lg:bottom-6 lg:right-6 ${
          isOpen
            ? 'opacity-0 scale-75 pointer-events-none'
            : isScrolledDown
            ? 'opacity-85 scale-90 translate-y-2 pointer-events-auto'
            : 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
        }`}
      >
        <button
          ref={triggerButtonRef}
          data-tour="ai-button"
          onClick={handleOpenChat}
          tabIndex={isOpen ? -1 : 0}
          aria-label="Open Tenvi AI Financial Assistant"
          title="Open Tenvi AI Financial Assistant"
          className="group relative flex items-center justify-center md:justify-start gap-2.5 bg-background/90 dark:bg-card/90 backdrop-blur-xl border border-border/70 text-foreground w-12 h-12 md:w-auto md:h-12 md:px-3.5 md:py-2 rounded-2xl shadow-lg hover:shadow-xl hover:border-border hover:scale-105 active:scale-95 cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-200"
        >
          {/* Icon Container with Corner Sparkle AI Badge */}
          <div className="relative shrink-0 flex items-center justify-center">
            <TenviIcon variant="solid" className="w-7 h-7 rounded-xl shadow-2xs group-hover:rotate-3 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs border border-background">
              <Sparkles className="w-2.5 h-2.5 text-white animate-pulse" />
            </span>
          </div>

          {/* Desktop Text Label */}
          <div className="hidden md:flex flex-col text-left pr-1 leading-tight select-none">
            <div className="text-xs font-bold tracking-tight flex items-center gap-1.5 text-foreground">
              <span>Tenvi AI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">Financial Assistant</span>
          </div>
        </button>
      </div>

      {/* Mobile Dimmed Backdrop */}
      {isMounted && (
        <div
          className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-xs md:hidden transition-opacity duration-[var(--dur-base)] ease-[var(--ease-standard)] ${
            isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={handleCloseChat}
          aria-hidden="true"
        />
      )}

      {/* Floating Chat Window (Desktop Popover Card / Mobile Bottom Sheet) */}
      {isMounted && (
        <div
          ref={chatWindowRef}
          role="dialog"
          aria-label="Tenvi AI Financial Assistant"
          aria-modal="true"
          className={`fixed z-50 flex flex-col overflow-hidden bg-background md:bg-card/95 md:backdrop-blur-xl border-border/60 shadow-2xl transition-[transform,opacity,width,height] duration-[var(--dur-slow)] ease-[var(--ease-spring)]
            inset-x-0 bottom-0 h-[90dvh] max-h-[90dvh] rounded-t-3xl border-t pb-[max(0.75rem,env(safe-area-inset-bottom))]
            md:inset-auto md:bottom-20 md:right-6 md:rounded-3xl md:border md:pb-0 md:origin-bottom-right ${
            isExpanded
              ? 'md:w-[620px] lg:w-[680px] md:h-[calc(100vh-4rem)] md:max-h-[820px]'
              : 'md:w-[420px] md:h-[620px] md:max-h-[calc(100vh-6rem)]'
          } ${
            isOpen
              ? 'opacity-100 translate-y-0 md:scale-100 pointer-events-auto'
              : 'opacity-0 translate-y-full md:translate-y-2 md:scale-[0.96] pointer-events-none duration-[var(--dur-fast)] ease-[var(--ease-standard)]'
          }`}
        >
          {/* Mobile Drag Handle */}
          <div className="flex md:hidden items-center justify-center pt-2.5 pb-1 shrink-0 select-none">
            <div className="w-12 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Minimalist Glass Header */}
          <ChatHeader
            isExpanded={isExpanded}
            onToggleExpand={handleToggleExpand}
            onNewChat={handleResetChat}
            onMinimize={handleCloseChat}
            onClose={handleCloseChat}
          />

          {/* Chat Body: Welcome State Hero OR Message List */}
          {isInitialState ? (
            <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
              <WelcomeState
                userName={userName}
                onSelectSuggestion={(query) => handleSendMessage(query)}
                disabled={isProcessing}
              />
            </div>
          ) : (
            <ChatMessageList
              messages={messages}
              undoingTxId={undoingTxId}
              undoingBatchMsgId={undoingBatchMsgId}
              savingSingleItemId={savingSingleItemId}
              savingPhotoMsgId={savingPhotoMsgId}
              allAvailableBorrowers={allAvailableBorrowers}
              availableCards={cards}
              recentTransactions={recentTransactions}
              onUndoTransaction={handleUndo}
              onUndoMultipleTransactions={handleUndoMultiple}
              onUpdatePhotoItem={handleUpdatePhotoItem}
              onUpdateAllPhotoItems={handleUpdateAllPhotoItems}
              onSaveSinglePhotoItem={handleSaveSinglePhotoItem}
              onDiscardPhotoItem={handleDiscardPhotoItem}
              onConfirmSavePhotoItems={handleConfirmSavePhotoItems}
              onCancelPhotoItems={handleCancelPhotoItems}
              onSelectQuickReply={(reply) => handleSendMessage(reply)}
              onEditTransaction={(prompt) => {
                setInputText(prompt);
                inputRef.current?.focus();
              }}
            />
          )}

          {/* Collapsed Suggestion Chips (when in active conversation) */}
          {!isInitialState && (
            <SuggestionChips
              onSelectChip={(prompt) => handleSendMessage(prompt)}
              disabled={isProcessing}
            />
          )}

          {/* Composer with auto-growing textarea, mic, photo upload & send */}
          <ChatComposer
            inputText={inputText}
            isProcessing={isProcessing}
            isListening={isListening}
            attachedImage={attachedImage}
            inputRef={inputRef}
            fileInputRef={fileInputRef}
            onInputChange={setInputText}
            onKeyDown={handleKeyDown}
            onSendMessage={() => handleSendMessage()}
            onImageSelect={handleImageSelect}
            onRemoveImage={handleRemoveImage}
            onToggleVoiceInput={handleToggleVoiceInput}
            onStopVoiceInput={stopListening}
          />
        </div>
      )}
    </>
  );
}
