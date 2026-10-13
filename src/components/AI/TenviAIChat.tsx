'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Minus,
  Send,
  Loader2,
  RotateCcw,
  CheckCircle2,
  Undo2,
  Calendar,
  CreditCard,
  Tag,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Lightbulb,
  Zap,
  TrendingUp,
  Banknote,
  Smartphone,
  PieChart,
  Edit3,
  Car,
  Layers,
} from 'lucide-react';
import {
  processAIChatMessageAction,
  undoAITransactionAction,
  undoAIMultipleTransactionsAction,
  AIChatMessage,
} from '@/app/actions/ai';
import { ParsedFinancialIntent } from '@/lib/ai/financialParser';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { MarkdownMessage } from './MarkdownMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface SamplePromptItem {
  id: string;
  category: 'cards' | 'ewallets' | 'cash' | 'income' | 'wealth';
  categoryLabel: string;
  title: string;
  prompt: string;
  description: string;
  badge: string;
  badgeColor: string;
  iconName: 'credit-card' | 'smartphone' | 'banknote' | 'trending-up' | 'pie-chart';
}

export const SAMPLE_PROMPT_CATEGORIES = [
  { id: 'all', label: '🌟 All Prompts' },
  { id: 'cards', label: '💳 Cards & Float' },
  { id: 'ewallets', label: '📱 GCash & Maya' },
  { id: 'cash', label: '💵 Daily Cash' },
  { id: 'income', label: '💰 Income & Vaults' },
  { id: 'wealth', label: '📊 Wealth & Advice' },
] as const;

export const SAMPLE_PROMPTS_DATA: SamplePromptItem[] = [
  // 1. Cards
  {
    id: 'p-card-1',
    category: 'cards',
    categoryLabel: 'Credit Cards',
    title: 'Best Card to Swipe Today',
    prompt: 'Which card is best to swipe today?',
    description: 'Calculates maximum interest-free float days across all your cards',
    badge: 'Smart Float',
    badgeColor: 'bg-indigo-50 text-indigo-700',
    iconName: 'credit-card',
  },
  {
    id: 'p-card-2',
    category: 'cards',
    categoryLabel: 'Credit Cards',
    title: 'Dining Swipe with Card',
    prompt: 'Bought dinner 1,850 using BDO card',
    description: 'Auto-logs restaurant expense linked to your specific credit card',
    badge: 'Card Expense',
    badgeColor: 'bg-indigo-50 text-indigo-700',
    iconName: 'credit-card',
  },
  {
    id: 'p-card-3',
    category: 'cards',
    categoryLabel: 'Credit Cards',
    title: 'Shopping Purchase',
    prompt: 'Swiped 4,500 at Uniqlo with credit card',
    description: 'Logs shopping expense and prompts for card selection if multiple',
    badge: 'Card Expense',
    badgeColor: 'bg-indigo-50 text-indigo-700',
    iconName: 'credit-card',
  },
  {
    id: 'p-card-4',
    category: 'cards',
    categoryLabel: 'Credit Cards',
    title: 'Next Payment Due Check',
    prompt: 'When is my next credit card due date?',
    description: 'Checks upcoming cutoff deadlines and payment due days',
    badge: 'Due Dates',
    badgeColor: 'bg-amber-50 text-amber-700',
    iconName: 'credit-card',
  },

  // 2. E-Wallets
  {
    id: 'p-ewallet-1',
    category: 'ewallets',
    categoryLabel: 'E-Wallets',
    title: 'Electric Bill via GCash',
    prompt: 'Paid Meralco 3,450 through GCash',
    description: 'Logs utility bill payment with GCash payment method',
    badge: 'Utilities',
    badgeColor: 'bg-blue-50 text-blue-700',
    iconName: 'smartphone',
  },
  {
    id: 'p-ewallet-2',
    category: 'ewallets',
    categoryLabel: 'E-Wallets',
    title: 'Food Delivery via Maya',
    prompt: 'Ordered GrabFood 650 via Maya',
    description: 'Records food delivery expense charged to Maya wallet',
    badge: 'Food Delivery',
    badgeColor: 'bg-blue-50 text-blue-700',
    iconName: 'smartphone',
  },
  {
    id: 'p-ewallet-3',
    category: 'ewallets',
    categoryLabel: 'E-Wallets',
    title: 'Internet Bill via GCash',
    prompt: 'Paid PLDT internet bill 1,899 via GCash',
    description: 'Tracks monthly internet subscription payment',
    badge: 'Subscriptions',
    badgeColor: 'bg-blue-50 text-blue-700',
    iconName: 'smartphone',
  },

  // 3. Cash
  {
    id: 'p-cash-1',
    category: 'cash',
    categoryLabel: 'Cash',
    title: 'Coffee in Cash',
    prompt: 'Bought coffee 185 in cash',
    description: 'Fast single-tap daily expense recording',
    badge: 'Daily Spending',
    badgeColor: 'bg-emerald-50 text-emerald-700',
    iconName: 'banknote',
  },
  {
    id: 'p-cash-2',
    category: 'cash',
    categoryLabel: 'Cash',
    title: 'Supermarket Groceries',
    prompt: 'Groceries worth 2,400 paid in cash yesterday',
    description: 'Supports retroactive dates like "yesterday" or "last Friday"',
    badge: 'Groceries',
    badgeColor: 'bg-emerald-50 text-emerald-700',
    iconName: 'banknote',
  },
  {
    id: 'p-cash-3',
    category: 'cash',
    categoryLabel: 'Cash',
    title: 'Transport Fare',
    prompt: 'Taxi fare 320 in cash',
    description: 'Categorizes commute or transportation expenses',
    badge: 'Transport',
    badgeColor: 'bg-emerald-50 text-emerald-700',
    iconName: 'banknote',
  },
  {
    id: 'p-cash-4',
    category: 'cash',
    categoryLabel: 'Cash',
    title: 'Pharmacy Medicine',
    prompt: 'Bought vitamins and medicine 850 in cash',
    description: 'Tracks healthcare and prescription costs',
    badge: 'Healthcare',
    badgeColor: 'bg-emerald-50 text-emerald-700',
    iconName: 'banknote',
  },

  // 4. Income & Vaults
  {
    id: 'p-inc-1',
    category: 'income',
    categoryLabel: 'Income',
    title: 'Monthly Salary',
    prompt: 'Received salary 45,000 in BPI account',
    description: 'Logs income directly into your primary bank account',
    badge: 'Salary',
    badgeColor: 'bg-emerald-50 text-emerald-700',
    iconName: 'trending-up',
  },
  {
    id: 'p-inc-2',
    category: 'income',
    categoryLabel: 'Income',
    title: 'Freelance Side Income',
    prompt: 'Received 12,000 freelance design project payment via bank transfer',
    description: 'Categorizes side-hustle revenue to keep business income separate',
    badge: 'Side Hustle',
    badgeColor: 'bg-emerald-50 text-emerald-700',
    iconName: 'trending-up',
  },
  {
    id: 'p-inc-3',
    category: 'income',
    categoryLabel: 'Income',
    title: 'Deposit to Emergency Fund',
    prompt: 'Deposited 5,000 to Emergency Fund',
    description: 'Increases balance in your designated savings vault',
    badge: 'Vault Deposit',
    badgeColor: 'bg-emerald-50 text-emerald-700',
    iconName: 'trending-up',
  },

  // 5. Wealth & Analytics
  {
    id: 'p-wlth-1',
    category: 'wealth',
    categoryLabel: 'Wealth',
    title: 'Monthly Spending Breakdown',
    prompt: 'How much have I spent this month?',
    description: 'Summarizes expenses by category and payment methods',
    badge: 'Analytics',
    badgeColor: 'bg-purple-50 text-purple-700',
    iconName: 'pie-chart',
  },
  {
    id: 'p-wlth-2',
    category: 'wealth',
    categoryLabel: 'Wealth',
    title: 'Emergency Living Runway',
    prompt: 'What is my emergency living runway in months?',
    description: 'Compares total liquid cash against average monthly burn rate',
    badge: 'Runway',
    badgeColor: 'bg-purple-50 text-purple-700',
    iconName: 'pie-chart',
  },
  {
    id: 'p-wlth-3',
    category: 'wealth',
    categoryLabel: 'Wealth',
    title: 'Outstanding Receivables',
    prompt: 'Who owes me money right now?',
    description: 'Lists active loans and money lent to friends or colleagues',
    badge: 'Receivables',
    badgeColor: 'bg-purple-50 text-purple-700',
    iconName: 'pie-chart',
  },
  {
    id: 'p-wlth-4',
    category: 'wealth',
    categoryLabel: 'Wealth',
    title: 'AI Financial Advice',
    prompt: 'Give me financial advice based on my spending and savings',
    description: 'Tailored recommendations to optimize cash retention and card float',
    badge: 'Advisory',
    badgeColor: 'bg-purple-50 text-purple-700',
    iconName: 'pie-chart',
  },
];

const QUICK_STARTER_PILLS = [
  { label: '💳 Best card to swipe', prompt: 'Which card is best to swipe today?' },
  { label: '☕ Bought coffee 195 BDO', prompt: 'Bought coffee 195 with BDO card' },
  { label: '⚡ Paid 3,400 bill GCash', prompt: 'Paid 3,400 electric bill via GCash' },
  { label: '🛒 Food 1,120 cash', prompt: 'Bought food worth 1120, yesterday using cash' },
  { label: '💼 Received 35,000 salary', prompt: 'Received 35,000 monthly salary to BPI' },
  { label: '📊 Spend this month', prompt: 'How much did I spend this month?' },
  { label: '🛡️ Emergency runway', prompt: 'What is my emergency living runway in months?' },
];

const INITIAL_WELCOME_MESSAGE: AIChatMessage = {
  id: 'welcome-msg',
  sender: 'assistant',
  text: "👋 Hello! I'm your **Tenvi Assistant**.\n\nI can help you easily record everyday spending, check upcoming bills, or see how much savings you have.\n\nYou can talk to me in simple English, Tagalog, or Taglish!",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  quickReplies: [
    'How much did I spend this week?',
    'What bills are due soon?',
    'Paid 150 for lunch in cash',
    'How much savings do I have?',
  ],
};

export function TenviAIChat() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingState, setPendingState] = useState<ParsedFinancialIntent | null>(null);
  const [undoingTxId, setUndoingTxId] = useState<string | null>(null);
  const [undoingBatchMsgId, setUndoingBatchMsgId] = useState<string | null>(null);
  const [isPromptsDrawerOpen, setIsPromptsDrawerOpen] = useState(false);
  const [selectedPromptCategory, setSelectedPromptCategory] = useState<string>('all');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleOpenChat = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsOpen(true);
      });
    });
  };

  const handleCloseChat = () => {
    setIsOpen(false);
    setIsPromptsDrawerOpen(false);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsMounted(false);
      closeTimeoutRef.current = null;
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Focus management: move focus into chat on open, return to trigger on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    } else {
      triggerButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Listen for global open event and keyboard escape
  useEffect(() => {
    window.addEventListener('open-tenvi-ai-chat', handleOpenChat);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCloseChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('open-tenvi-ai-chat', handleOpenChat);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Close when clicking outside the floating chat window
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        chatWindowRef.current &&
        !chatWindowRef.current.contains(target) &&
        triggerButtonRef.current &&
        !triggerButtonRef.current.contains(target)
      ) {
        handleCloseChat();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tenvi_ai_chat_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load saved chat history:', e);
    }
  }, []);

  // Save persistent chat history to localStorage whenever messages change (not while streaming)
  useEffect(() => {
    try {
      const hasStreaming = messages.some((m) => m.isStreaming);
      if (!hasStreaming && messages.length > 0) {
        localStorage.setItem('tenvi_ai_chat_session', JSON.stringify(messages.slice(-20)));
      }
    } catch (e) {
      console.warn('Failed to save chat history:', e);
    }
  }, [messages]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen && !isPromptsDrawerOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isPromptsDrawerOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    if (isPromptsDrawerOpen) {
      setIsPromptsDrawerOpen(false);
    }

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
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
        const fallbackRes = await processAIChatMessageAction(text, pendingState, history);
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
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsgId ? { ...m, isStreaming: false } : m))
      );
    }
  };

  const handleQuickReply = (reply: string) => {
    // Strip leading emojis like "💵 Cash" -> "Cash"
    const cleaned = reply.replace(/^[\p{Emoji}\s]+/u, '').trim();
    handleSendMessage(cleaned || reply);
  };

  const handleSelectPrompt = (promptText: string, autoSend: boolean = true) => {
    if (autoSend) {
      handleSendMessage(promptText);
    } else {
      setInputText(promptText);
      setIsPromptsDrawerOpen(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleUndo = async (transactionId: string, messageId: string) => {
    setUndoingTxId(transactionId);
    try {
      const res = await undoAITransactionAction(transactionId);
      if (res.success) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, isUndone: true } : msg
          )
        );
        toast.success('Transaction reversed & removed from ledger');
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
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, isUndone: true } : msg
          )
        );
        toast.success(`${transactionIds.length} transactions reversed & removed from ledger`);
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

  const handleResetChat = () => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setPendingState(null);
    setInputText('');
    setIsPromptsDrawerOpen(false);
    try {
      localStorage.removeItem('tenvi_ai_chat_session');
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredPrompts =
    selectedPromptCategory === 'all'
      ? SAMPLE_PROMPTS_DATA
      : SAMPLE_PROMPTS_DATA.filter((p) => p.category === selectedPromptCategory);

  return (
    <>
      {/* Floating Trigger Button */}
      <div
        className={`fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 transition-all duration-300 ease-out origin-bottom-right ${
          isOpen
            ? 'opacity-0 scale-75 pointer-events-none'
            : 'opacity-100 scale-100 pointer-events-auto'
        }`}
      >
        <button
          ref={triggerButtonRef}
          data-tour="ai-button"
          onClick={handleOpenChat}
          tabIndex={isOpen ? -1 : 0}
          aria-label="Open Tenvi Assistant - Tap to ask questions"
          title="Open Tenvi Assistant"
          className="group flex items-center justify-center sm:justify-start gap-3 bg-slate-800 text-white w-12 h-12 sm:w-auto sm:h-auto p-0 sm:pl-4 sm:pr-5 sm:py-3.5 rounded-full shadow-lg hover:shadow-xl hover:bg-slate-700 active:scale-95 cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0 group-hover:bg-white/25 transition-colors relative">
            <Sparkles className="w-5 h-5 sm:w-4 sm:h-4 text-emerald-300 group-hover:rotate-12 transition-transform duration-300" />
            <span className="sm:hidden absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold tracking-wide flex items-center gap-1.5">
              Tenvi Assistant
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-xs text-slate-300 font-medium">Help & Questions</div>
          </div>
        </button>
      </div>

      {/* Floating Chat Window (Floating Card Dialog) */}
      {isMounted && (
        <div
          ref={chatWindowRef}
          role="dialog"
          aria-label="Tenvi Assistant"
          className={`fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-50 w-auto sm:w-[420px] md:w-[440px] h-[580px] max-h-[calc(100dvh-6rem)] sm:max-h-[min(640px,calc(100dvh-3rem))] bg-card rounded-3xl shadow-2xl flex flex-col overflow-hidden origin-bottom-right transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isOpen
              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
          }`}
        >
          {/* Header */}
          <div className="px-5 py-4 bg-slate-800 text-white flex flex-row items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-sm font-bold tracking-tight text-white">Tenvi Assistant</h2>
                  <Badge variant="success" className="h-5 px-1.5 text-[10px]">
                    Ready to Help
                  </Badge>
                </div>
                <p className="text-xs text-slate-300">
                  Ask any question or record money easily
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setIsPromptsDrawerOpen((prev) => !prev)}
                title="Common Questions & Examples"
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer ${
                  isPromptsDrawerOpen
                    ? 'bg-amber-300 text-slate-900 font-bold shadow-xs'
                    : 'bg-white/15 hover:bg-white/25 text-slate-200'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden xs:inline">Examples</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handleResetChat}
                title="Start a new chat"
                className="rounded-xl hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handleCloseChat}
                title="Minimize chat"
                aria-label="Minimize chat"
                className="rounded-xl hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handleCloseChat}
                title="Close Assistant"
                aria-label="Close Assistant"
                className="rounded-xl hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Interactive Sample Prompts Drawer (Slide Overlay) */}
          {isPromptsDrawerOpen ? (
            <div className="flex-1 bg-muted/40 flex flex-col overflow-hidden animate-in fade-in duration-150">
              {/* Category Pills Header */}
              <div className="p-3 bg-card shadow-xs shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>Sample Prompt Library</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setIsPromptsDrawerOpen(false)}
                    className="text-xs text-muted-foreground hover:text-foreground font-semibold"
                  >
                    Back to Chat
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {SAMPLE_PROMPT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedPromptCategory(cat.id)}
                      className={`text-xs whitespace-nowrap px-3 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                        selectedPromptCategory === cat.id
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompts Cards List */}
              <ScrollArea className="flex-1 p-3.5 space-y-2.5">
                <div className="space-y-2.5">
                  {filteredPrompts.map((p) => (
                    <div
                      key={p.id}
                      className="bg-card rounded-2xl p-3.5 shadow-card hover:shadow-lift transition-shadow flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{p.title}</span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.badgeColor}`}
                          >
                            {p.badge}
                          </span>
                        </div>
                        <p className="text-xs text-foreground font-semibold bg-muted/60 p-2 rounded-xl italic">
                          &quot;{p.prompt}&quot;
                        </p>
                        <p className="text-xs text-muted-foreground leading-snug">{p.description}</p>
                      </div>

                      <div className="flex items-center justify-end gap-2 mt-3 pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => handleSelectPrompt(p.prompt, false)}
                          className="text-xs font-semibold text-muted-foreground hover:text-foreground rounded-lg gap-1"
                          title="Copy to text box so you can adjust amount or merchant"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit First
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          onClick={() => handleSelectPrompt(p.prompt, true)}
                          className="text-xs font-bold rounded-xl shadow-sm gap-1 active:scale-95"
                        >
                          <Zap className="w-3 h-3 text-emerald-400" />
                          Send Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            /* Standard Messages Body */
            <ScrollArea className="flex-1 min-h-0 p-4 bg-muted/30">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    {/* Bubble */}
                    <div
                      className={`max-w-[88%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-slate-800 text-white rounded-tr-none shadow-xs'
                          : 'bg-card text-foreground shadow-card rounded-tl-none'
                      }`}
                    >
                      {msg.sender === 'assistant' && !msg.text && msg.isStreaming ? (
                        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          <span>Tenvi is thinking...</span>
                        </div>
                      ) : (
                        <div>
                          <MarkdownMessage content={msg.text} isUser={msg.sender === 'user'} />
                          {msg.isStreaming && (
                            <span className="inline-block w-1.5 h-3.5 ml-1 bg-emerald-600 animate-pulse rounded-full align-middle" />
                          )}
                        </div>
                      )}

                      {/* Rich Transaction Card */}
                      {msg.transaction && (
                        <div className="mt-3 p-3.5 rounded-2xl bg-muted/60 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                msg.transaction.kind === 'expense'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {msg.transaction.kind === 'expense' ? (
                                <>
                                  <ArrowDownLeft className="w-3 h-3" />
                                  Money Out (Expense)
                                </>
                              ) : (
                                <>
                                  <ArrowUpRight className="w-3 h-3" />
                                  Money In (Income)
                                </>
                              )}
                            </span>

                            <span className="text-xs font-extrabold text-foreground">
                              ₱
                              {msg.transaction.amount.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>

                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="font-semibold text-foreground">
                                {msg.transaction.categoryName || 'General'}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">{msg.transaction.note}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="capitalize">
                                {msg.transaction.paymentMethod.replace('_', ' ')}
                                {msg.transaction.creditCardName && ` • Card: ${msg.transaction.creditCardName}`}
                                {msg.transaction.savingsName && ` • Vault: ${msg.transaction.savingsName}`}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>{msg.transaction.occurredOn}</span>
                            </div>
                          </div>

                          {/* Undo / Status Bar */}
                          <div className="pt-2 flex items-center justify-between">
                            {msg.isUndone ? (
                              <span className="text-xs font-bold text-muted-foreground italic">
                                Transaction Undone & Removed
                              </span>
                            ) : (
                              <>
                                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Saved to Digital Ledger
                              </span>
                              <Button
                                type="button"
                                variant="secondary"
                                size="xs"
                                onClick={() => handleUndo(msg.transaction!.id, msg.id)}
                                disabled={undoingTxId === msg.transaction.id}
                                className="rounded-xl shadow-xs gap-1"
                              >
                                {undoingTxId === msg.transaction.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Undo2 className="w-3 h-3" />
                                )}
                                Undo
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rich Multi-Log Batch Card */}
                    {msg.transactions && msg.transactions.length > 0 && (
                      <div className="mt-3 p-3.5 rounded-2xl bg-muted/60 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 bg-emerald-50 text-emerald-700">
                            <Layers className="w-3 h-3 text-emerald-600" />
                            Multi-Day Batch ({msg.transactions.length} entries)
                          </span>

                          <span className="text-xs font-extrabold text-foreground">
                            ₱
                            {msg.transactions
                              .reduce((sum, t) => sum + Number(t.amount || 0), 0)
                              .toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Car className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-semibold text-foreground">
                              {msg.transactions[0].propertyName || 'Registered Property'}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-emerald-700 font-medium">
                              ₱{Number(msg.transactions[0].amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} / day
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="capitalize">
                              Payment: {msg.transactions[0].paymentMethod.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Date list pill badges */}
                          <div className="pt-1">
                            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>Dates Logged ({msg.transactions.length} days):</span>
                            </div>
                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                              {msg.transactions.map((tx) => (
                                <span
                                  key={tx.id}
                                  className="text-xs font-medium bg-card px-2 py-0.5 rounded-md text-foreground shadow-2xs"
                                >
                                  {tx.occurredOn}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Undo / Status Bar */}
                        <div className="pt-2 flex items-center justify-between">
                          {msg.isUndone ? (
                            <span className="text-xs font-bold text-muted-foreground italic">
                              All {msg.transactions.length} Entries Undone & Removed
                            </span>
                          ) : (
                            <>
                              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Saved to Property Ledger
                              </span>
                              <Button
                                type="button"
                                variant="secondary"
                                size="xs"
                                onClick={() =>
                                  handleUndoMultiple(
                                    msg.transactions!.map((t) => t.id),
                                    msg.id
                                  )
                                }
                                disabled={undoingBatchMsgId === msg.id}
                                className="rounded-xl shadow-xs gap-1"
                              >
                                {undoingBatchMsgId === msg.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Undo2 className="w-3 h-3" />
                                )}
                                Undo All ({msg.transactions.length})
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div
                      className={`text-xs mt-1.5 text-right ${
                        msg.sender === 'user' ? 'text-slate-300' : 'text-muted-foreground'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {/* Quick Reply Chips */}
                  {msg.quickReplies &&
                    msg.quickReplies.length > 0 &&
                    !msg.transaction &&
                    (!msg.transactions || msg.transactions.length === 0) && (
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-[92%]">
                      {msg.quickReplies.map((reply, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleQuickReply(reply)}
                          disabled={isProcessing}
                          className="text-xs font-semibold bg-card hover:bg-primary hover:text-primary-foreground text-foreground px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}

        {/* Quick-Prompt Chips Bar (Above Input) */}
        {!isPromptsDrawerOpen && (
          <div className="px-3 pt-2 pb-1 bg-card shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setIsPromptsDrawerOpen(true)}
                className="flex items-center gap-1 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Lightbulb className="w-3 h-3 text-amber-600" />
                <span>Prompt Ideas</span>
              </button>
              {QUICK_STARTER_PILLS.map((pill, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(pill.prompt)}
                  disabled={isProcessing}
                  className="text-xs font-medium bg-muted/60 hover:bg-primary hover:text-primary-foreground text-foreground px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer shrink-0 disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Input */}
        <div className="p-3 bg-card shrink-0">
          <div className="bg-muted/60 rounded-2xl p-2 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a question or expense (e.g. 'paid 350 for groceries in cash')..."
              rows={1}
              disabled={isProcessing}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none max-h-24 py-1.5 px-2 font-medium border-0"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setIsPromptsDrawerOpen((prev) => !prev)}
              title="Common question examples"
              className="rounded-xl text-muted-foreground hover:text-foreground"
            >
              <Lightbulb className="w-4 h-4 text-amber-600" />
            </Button>
            <Button
              type="button"
              size="icon-xs"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isProcessing}
              aria-label="Send message"
              className="rounded-xl shadow-xs"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
          <div className="mt-1.5 px-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Press Enter or tap Send</span>
            <span className="font-medium">Safe & Private</span>
          </div>
        </div>
      </div>
    )}
  </>
);
}
