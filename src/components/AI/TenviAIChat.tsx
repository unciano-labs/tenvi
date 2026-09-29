'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
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
  ShieldCheck,
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
    description: 'Checks upcoming statement cutoffs and payment deadlines',
    badge: 'Due Dates',
    badgeColor: 'bg-indigo-50 text-indigo-700',
    iconName: 'credit-card',
  },

  // 2. E-Wallets
  {
    id: 'p-ewallet-1',
    category: 'ewallets',
    categoryLabel: 'E-Wallets',
    title: 'Coffee via GCash',
    prompt: 'Paid 195 for coffee via GCash today',
    description: 'Instant food & beverage logging via mobile wallet',
    badge: 'GCash',
    badgeColor: 'bg-blue-50 text-blue-700',
    iconName: 'smartphone',
  },
  {
    id: 'p-ewallet-2',
    category: 'ewallets',
    categoryLabel: 'E-Wallets',
    title: 'Electric Bill via GCash',
    prompt: 'Paid 3,400 electric bill via GCash',
    description: 'Auto-categorizes as Utilities & Bills with GCash payment',
    badge: 'Utilities',
    badgeColor: 'bg-blue-50 text-blue-700',
    iconName: 'smartphone',
  },
  {
    id: 'p-ewallet-3',
    category: 'ewallets',
    categoryLabel: 'E-Wallets',
    title: 'Meralco Bill via Maya',
    prompt: 'Paid 4,200 Meralco bill using Maya',
    description: 'Logs utility expense with Maya transaction method',
    badge: 'Maya',
    badgeColor: 'bg-blue-50 text-blue-700',
    iconName: 'smartphone',
  },
  {
    id: 'p-ewallet-4',
    category: 'ewallets',
    categoryLabel: 'E-Wallets',
    title: 'Internet Broadband Bill',
    prompt: 'Paid 1,899 internet bill via GCash',
    description: 'Logs broadband/phone bill directly into ledger',
    badge: 'GCash',
    badgeColor: 'bg-blue-50 text-blue-700',
    iconName: 'smartphone',
  },

  // 3. Daily Cash
  {
    id: 'p-cash-1',
    category: 'cash',
    categoryLabel: 'Cash',
    title: 'Cash Groceries Yesterday',
    prompt: 'Bought food worth 1120, yesterday using cash',
    description: 'Multi-attribute entry: category, amount, past date, and cash',
    badge: 'Cash',
    badgeColor: 'bg-amber-50 text-amber-700',
    iconName: 'banknote',
  },
  {
    id: 'p-cash-2',
    category: 'cash',
    categoryLabel: 'Cash',
    title: 'Grab Ride (Taglish)',
    prompt: 'Paid 340 for Grab car kanina in cash',
    description: 'Recognizes Filipino slang "kanina" and logs commute',
    badge: 'Commute',
    badgeColor: 'bg-amber-50 text-amber-700',
    iconName: 'banknote',
  },
  {
    id: 'p-cash-3',
    category: 'cash',
    categoryLabel: 'Cash',
    title: 'Pharmacy & Medicine',
    prompt: 'Spent 850 at Mercury Drug using cash',
    description: 'Auto-maps to Health & Medical category',
    badge: 'Health',
    badgeColor: 'bg-amber-50 text-amber-700',
    iconName: 'banknote',
  },
  {
    id: 'p-cash-4',
    category: 'cash',
    categoryLabel: 'Cash',
    title: 'Parking Micro-Spend',
    prompt: 'Paid 150 parking fee cash',
    description: 'Quick micro-expense tracking for accurate daily budgeting',
    badge: 'Cash',
    badgeColor: 'bg-amber-50 text-amber-700',
    iconName: 'banknote',
  },

  // 4. Income & Vaults
  {
    id: 'p-inc-1',
    category: 'income',
    categoryLabel: 'Income',
    title: 'Monthly Salary Deposit',
    prompt: 'Received 35,000 monthly salary to BPI',
    description: 'Logs Money In (Income) and links directly to savings stash',
    badge: 'Salary',
    badgeColor: 'bg-emerald-50 text-emerald-700',
    iconName: 'trending-up',
  },
  {
    id: 'p-inc-2',
    category: 'income',
    categoryLabel: 'Income',
    title: 'Freelance Gig Payout',
    prompt: 'Received 8,500 freelance client payment via GCash',
    description: 'Records extra gig income directly into digital ledger',
    badge: 'Freelance',
    badgeColor: 'bg-emerald-50 text-emerald-700',
    iconName: 'trending-up',
  },
  {
    id: 'p-inc-3',
    category: 'income',
    categoryLabel: 'Income',
    title: 'Emergency Vault Deposit',
    prompt: 'Deposited 10,000 to Emergency Fund vault',
    description: 'Updates linked savings account balance automatically',
    badge: 'Savings',
    badgeColor: 'bg-emerald-50 text-emerald-700',
    iconName: 'trending-up',
  },
  {
    id: 'p-inc-4',
    category: 'income',
    categoryLabel: 'Income',
    title: 'Total Savings Inquiry',
    prompt: 'How much are my total savings across accounts?',
    description: 'Summarizes balances from all active savings vaults',
    badge: 'Vaults',
    badgeColor: 'bg-emerald-50 text-emerald-700',
    iconName: 'trending-up',
  },
  {
    id: 'p-inc-vios-1',
    category: 'income',
    categoryLabel: 'Income',
    title: 'Toyota Vios Boundary (Range)',
    prompt: 'log income of toyota vios, from lastweek until yesterday',
    description: 'Auto-logs daily boundary for Toyota Vios (₱1,000/day) across date range',
    badge: 'Multi-Log',
    badgeColor: 'bg-emerald-50 text-emerald-700',
    iconName: 'trending-up',
  },
  {
    id: 'p-inc-vios-2',
    category: 'income',
    categoryLabel: 'Income',
    title: 'Vios Boundary (Past 5 Days)',
    prompt: 'log income of toyota vios, last 5 days',
    description: 'Logs 5 daily boundary income entries linked directly to vehicle ledger',
    badge: 'Multi-Log',
    badgeColor: 'bg-emerald-50 text-emerald-700',
    iconName: 'trending-up',
  },

  // 5. Wealth & Runway
  {
    id: 'p-wlth-1',
    category: 'wealth',
    categoryLabel: 'Wealth',
    title: 'Monthly Spend Summary',
    prompt: 'How much did I spend this month?',
    description: 'Real-time overview of current month outflow and categories',
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
    description: 'Calculates how many months your liquid savings can sustain you',
    badge: 'Health',
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
  text: "👋 Hi! I'm your **Tenvi AI Wealth Assistant**.\n\nYou can enter your expenses or income in plain English, Tagalog, or Taglish, or ask questions about your cashflow and credit cards!",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  quickReplies: [
    'Which card is best to swipe today?',
    'Bought food worth 1120, yesterday using cash',
    'Paid 3,400 electric bill via GCash',
    'How much did I spend this month?',
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

  // Load persistent chat history from localStorage on initial render
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-tenvi-ai-chat', handleOpenChat);
    return () => window.removeEventListener('open-tenvi-ai-chat', handleOpenChat);
  }, []);

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
  }, [messages, isOpen, isProcessing, isPromptsDrawerOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    // Close prompts drawer if open
    setIsPromptsDrawerOpen(false);

    // Extract up to 10 previous conversation turns for multi-turn memory
    const history = messages
      .filter((m) => m.text && m.text.trim().length > 0 && m.id !== 'welcome')
      .slice(-10)
      .map((m) => ({
        sender: m.sender,
        text: m.text.trim(),
      }));

    // 1. Append user message and streaming assistant placeholder
    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantMsgId = `ai-${Date.now()}`;
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

    try {
      // 2. Fetch streaming chat response via SSE with multi-turn history
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, pendingState, history }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventStr of events) {
          if (!eventStr.trim()) continue;

          let eventType = 'message';
          let dataStr = '';
          const lines = eventStr.split('\n');

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataStr += line.slice(5).trim();
            }
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            if (eventType === 'delta') {
              if (data.text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, text: m.text + data.text } : m
                  )
                );
              }
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
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open Tenvi AI Chat"
            className="group flex items-center gap-3 bg-slate-900 text-white pl-4 pr-5 py-3.5 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
              <Sparkles className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold tracking-wide flex items-center gap-1.5">
                Tenvi AI
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <div className="text-[11px] text-slate-300 font-medium">Wealth OS & Ledger</div>
            </div>
          </button>
        )}
      </div>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-20 sm:bottom-6 right-2 sm:right-6 z-50 w-[calc(100vw-1rem)] sm:w-[440px] max-w-[440px] h-[580px] max-h-[calc(100vh-6rem)] sm:max-h-[86vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm font-bold tracking-tight">Tenvi AI Assistant</h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                    Live
                  </span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
                    10-Turn Memory
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">Natural Language Wealth Advisor</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsPromptsDrawerOpen((prev) => !prev)}
                title="Sample Prompts Library"
                className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  isPromptsDrawerOpen
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-300 group-hover:text-amber-200" />
                <span className="hidden xs:inline">Prompts</span>
              </button>

              <button
                onClick={handleResetChat}
                title="Reset conversation"
                className="w-8 h-8 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsPromptsDrawerOpen(false);
                }}
                title="Minimize chat"
                className="w-8 h-8 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive Sample Prompts Drawer (Slide Overlay) */}
          {isPromptsDrawerOpen ? (
            <div className="flex-1 bg-[#F8F9FA] flex flex-col overflow-hidden animate-in fade-in duration-150">
              {/* Category Pills Header */}
              <div className="p-3 bg-white shadow-sm shrink-0 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>Sample Prompt Library</span>
                  </div>
                  <button
                    onClick={() => setIsPromptsDrawerOpen(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                  >
                    Back to Chat
                  </button>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {SAMPLE_PROMPT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedPromptCategory(cat.id)}
                      className={`text-[11px] whitespace-nowrap px-3 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                        selectedPromptCategory === cat.id
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompts Cards List */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                {filteredPrompts.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{p.title}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.badgeColor}`}
                        >
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-900 font-semibold bg-slate-50 p-2 rounded-xl italic">
                        "{p.prompt}"
                      </p>
                      <p className="text-[11px] text-slate-500 leading-snug">{p.description}</p>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleSelectPrompt(p.prompt, false)}
                        className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copy to text box so you can adjust amount or merchant"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit First
                      </button>
                      <button
                        onClick={() => handleSelectPrompt(p.prompt, true)}
                        className="text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded-xl shadow-sm flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                      >
                        <Zap className="w-3 h-3 text-emerald-400" />
                        Send Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Standard Messages Body */
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F6F7F9]">
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
                        ? 'bg-slate-900 text-white rounded-tr-none shadow-sm'
                        : 'bg-white text-slate-800 shadow-sm rounded-tl-none'
                    }`}
                  >
                    {msg.sender === 'assistant' && !msg.text && msg.isStreaming ? (
                      <div className="flex items-center gap-2 py-1 text-xs text-slate-500 font-medium">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                        <span>Tenvi AI is thinking...</span>
                      </div>
                    ) : (
                      <div>
                        <MarkdownMessage content={msg.text} isUser={msg.sender === 'user'} />
                        {msg.isStreaming && (
                          <span className="inline-block w-1.5 h-3.5 ml-1 bg-emerald-500 animate-pulse rounded-full align-middle" />
                        )}
                      </div>
                    )}

                    {/* Rich Transaction Card */}
                    {msg.transaction && (
                      <div className="mt-3 p-3.5 rounded-2xl bg-[#F6F7F9] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
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

                          <span className="text-xs font-extrabold text-slate-900">
                            ₱
                            {msg.transaction.amount.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-800">
                              {msg.transaction.categoryName || 'General'}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">{msg.transaction.note}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-slate-400" />
                            <span className="capitalize">
                              {msg.transaction.paymentMethod.replace('_', ' ')}
                              {msg.transaction.creditCardName && ` • Card: ${msg.transaction.creditCardName}`}
                              {msg.transaction.savingsName && ` • Vault: ${msg.transaction.savingsName}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{msg.transaction.occurredOn}</span>
                          </div>
                        </div>

                        {/* Undo / Status Bar */}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-200/60">
                          {msg.isUndone ? (
                            <span className="text-[11px] font-bold text-slate-400 italic">
                              Transaction Undone & Removed
                            </span>
                          ) : (
                            <>
                              <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Saved to Digital Ledger
                              </span>
                              <button
                                onClick={() => handleUndo(msg.transaction!.id, msg.id)}
                                disabled={undoingTxId === msg.transaction.id}
                                className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 px-2.5 py-1 rounded-xl shadow-sm transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                {undoingTxId === msg.transaction.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Undo2 className="w-3 h-3" />
                                )}
                                Undo
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rich Multi-Log Batch Card */}
                    {msg.transactions && msg.transactions.length > 0 && (
                      <div className="mt-3 p-3.5 rounded-2xl bg-[#F6F7F9] space-y-2.5 border border-slate-200/70">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 bg-emerald-50 text-emerald-700">
                            <Layers className="w-3 h-3 text-emerald-600" />
                            Multi-Day Batch ({msg.transactions.length} entries)
                          </span>

                          <span className="text-xs font-extrabold text-slate-900">
                            ₱
                            {msg.transactions
                              .reduce((sum, t) => sum + Number(t.amount || 0), 0)
                              .toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Car className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-800">
                              {msg.transactions[0].propertyName || 'Registered Property'}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-emerald-700 font-medium">
                              ₱{Number(msg.transactions[0].amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} / day
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-slate-400" />
                            <span className="capitalize">
                              Payment: {msg.transactions[0].paymentMethod.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Date list pill badges */}
                          <div className="pt-1">
                            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 mb-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>Dates Logged ({msg.transactions.length} days):</span>
                            </div>
                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                              {msg.transactions.map((tx) => (
                                <span
                                  key={tx.id}
                                  className="text-[10px] font-medium bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700 shadow-2xs"
                                >
                                  {tx.occurredOn}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Undo / Status Bar */}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-200/60">
                          {msg.isUndone ? (
                            <span className="text-[11px] font-bold text-slate-400 italic">
                              All {msg.transactions.length} Entries Undone & Removed
                            </span>
                          ) : (
                            <>
                              <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Saved to Property Ledger
                              </span>
                              <button
                                onClick={() =>
                                  handleUndoMultiple(
                                    msg.transactions!.map((t) => t.id),
                                    msg.id
                                  )
                                }
                                disabled={undoingBatchMsgId === msg.id}
                                className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 px-2.5 py-1 rounded-xl shadow-sm transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                {undoingBatchMsgId === msg.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Undo2 className="w-3 h-3" />
                                )}
                                Undo All ({msg.transactions.length})
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div
                      className={`text-[10px] mt-1.5 text-right ${
                        msg.sender === 'user' ? 'text-slate-300' : 'text-slate-400'
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
                          onClick={() => handleQuickReply(reply)}
                          disabled={isProcessing}
                          className="text-xs font-semibold bg-white hover:bg-slate-900 hover:text-white text-slate-700 px-3 py-1.5 rounded-xl shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50 text-left"
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
          )}

          {/* Quick-Prompt Chips Bar (Above Input) */}
          {!isPromptsDrawerOpen && (
            <div className="px-3 pt-2 pb-1 bg-white border-t border-slate-100/80 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  onClick={() => setIsPromptsDrawerOpen(true)}
                  className="flex items-center gap-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer shrink-0"
                >
                  <Lightbulb className="w-3 h-3 text-amber-600" />
                  <span>Prompt Ideas</span>
                </button>
                {QUICK_STARTER_PILLS.map((pill, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(pill.prompt)}
                    disabled={isProcessing}
                    className="text-[11px] font-medium bg-[#F1F3F6] hover:bg-slate-900 hover:text-white text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Input */}
          <div className="p-3 bg-white shrink-0">
            <div className="bg-[#F1F3F6] rounded-2xl p-2 flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Tenvi AI or log spending (e.g. 'paid 450 for coffee via gcash')..."
                rows={1}
                disabled={isProcessing}
                className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 resize-none outline-none max-h-24 py-1.5 px-2 font-medium"
              />
              <button
                onClick={() => setIsPromptsDrawerOpen((prev) => !prev)}
                title="Browse sample prompts"
                className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <Lightbulb className="w-4 h-4 text-amber-600" />
              </button>
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isProcessing}
                aria-label="Send message"
                className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <div className="mt-1.5 px-2 flex items-center justify-between text-[10px] text-slate-400">
              <span>Press Enter to send</span>
              <span className="font-semibold text-slate-500">Tenvi Intelligence Engine</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
