'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  ImagePlus,
  Receipt,
  User,
  AlertTriangle,
  Trash2,
  Check,
} from 'lucide-react';
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
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { MarkdownMessage } from './MarkdownMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TenviIcon } from '@/components/ui/TenviIcon';
import { getPropertyIcon } from '@/lib/constants';

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
  text: "Hello! I'm **Tenvi AI**, your personal financial assistant.\n\nAsk questions about your credit cards, cash flow, or record expenses in plain English or Taglish.",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  quickReplies: [
    'Summarize my credit card usage',
    'Upcoming due dates',
    'Check portfolio cash flow',
    'Paid 250 for lunch in cash',
  ],
};

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
}

export function TenviAIChat({
  initialContacts = [],
  initialProperties = [],
}: TenviAIChatProps = {}) {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactOption[]>(initialContacts);
  const [properties, setProperties] = useState<PropertyOption[]>(initialProperties);
  const [customBorrowers, setCustomBorrowers] = useState<string[]>([]);
  const [enteringCustomBorrower, setEnteringCustomBorrower] = useState<Record<string, boolean>>({});
  const [savingSingleItemId, setSavingSingleItemId] = useState<string | null>(null);

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

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([INITIAL_WELCOME_MESSAGE]);

  // Aggregate all available borrowers: official contacts + properties & assets + custom borrower names
  const allAvailableBorrowers = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      isCustom: boolean;
      isProperty?: boolean;
      icon?: string;
    }> = [];
    const seen = new Set<string>();

    // 1. Official user contacts
    for (const c of contacts) {
      const lower = c.name.trim().toLowerCase();
      if (lower && !seen.has(lower)) {
        seen.add(lower);
        list.push({ id: c.id, name: c.name.trim(), isCustom: false, icon: '👤' });
      }
    }

    // 2. Properties & Assets
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

    // 3. Custom borrowers entered or detected in pending photo items (min length 2)
    const allCustoms = new Set<string>();
    for (const name of customBorrowers) {
      if (name && name.trim().length >= 2) {
        allCustoms.add(name.trim());
      }
    }
    for (const m of messages) {
      if (m.pendingPhotoItems) {
        for (const it of m.pendingPhotoItems) {
          const b = it.borrowerName?.trim();
          if (b && b.length >= 2) {
            allCustoms.add(b);
          }
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

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingState, setPendingState] = useState<ParsedFinancialIntent | null>(null);
  const [undoingTxId, setUndoingTxId] = useState<string | null>(null);
  const [undoingBatchMsgId, setUndoingBatchMsgId] = useState<string | null>(null);
  const [isPromptsDrawerOpen, setIsPromptsDrawerOpen] = useState(false);
  const [selectedPromptCategory, setSelectedPromptCategory] = useState<string>('all');
  const [attachedImage, setAttachedImage] = useState<{
    file: File;
    previewUrl: string;
    base64: string;
    mimeType: string;
  } | null>(null);
  const [savingPhotoMsgId, setSavingPhotoMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
            scrollTicking.current = false;
            return;
          }

          if (Math.abs(delta) > 10) {
            if (delta > 0 && currentY > 50) {
              setIsScrolledDown(true);
            } else if (delta < 0) {
              setIsScrolledDown(false);
            }
            lastScrollY.current = currentY;
          }
          scrollTicking.current = false;
        });
        scrollTicking.current = true;
      }
    };

    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPEG, PNG, WebP).');
      return;
    }

    try {
      const optimized = await optimizeImageForUpload(file);
      const previewUrl = URL.createObjectURL(optimized);

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes('base64,') ? result.split('base64,')[1] : result;
        setAttachedImage({
          file: optimized,
          previewUrl,
          base64,
          mimeType: optimized.type || 'image/jpeg',
        });
      };
      reader.readAsDataURL(optimized);
    } catch (err) {
      console.error('Failed to process image:', err);
      toast.error('Could not process the selected image.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    if (attachedImage?.previewUrl) {
      URL.revokeObjectURL(attachedImage.previewUrl);
    }
    setAttachedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTogglePhotoItemType = (msgId: string, itemId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.pendingPhotoItems) return m;
        const updated: ParsedPhotoItem[] = m.pendingPhotoItems.map((it) => {
          if (it.id !== itemId) return it;
          const nextType: 'expense' | 'receivable' = it.type === 'expense' ? 'receivable' : 'expense';
          let bName = nextType === 'expense' ? null : it.borrowerName;
          let cId = nextType === 'expense' ? null : it.contactId;

          // If switching to receivable and borrower is missing, check if title matches any contact
          if (nextType === 'receivable' && !bName) {
            const foundContact = contacts.find((c) =>
              it.title.toLowerCase().includes(c.name.toLowerCase())
            );
            if (foundContact) {
              bName = foundContact.name;
              cId = foundContact.id;
            }
          }

          return {
            ...it,
            type: nextType,
            borrowerName: bName,
            contactId: cId,
            missingFields:
              nextType === 'receivable' && !bName?.trim()
                ? Array.from(new Set([...(it.missingFields || []), 'borrower' as const]))
                : it.missingFields?.filter((f) => f !== 'borrower') || [],
          };
        });
        return { ...m, pendingPhotoItems: updated };
      })
    );
  };

  const handleSetAllPhotoItemTypes = (msgId: string, type: 'expense' | 'receivable') => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.pendingPhotoItems) return m;
        const updated = m.pendingPhotoItems.map((it) => {
          let bName = type === 'expense' ? null : it.borrowerName;
          let cId = type === 'expense' ? null : it.contactId;

          if (type === 'receivable' && !bName) {
            const foundContact = contacts.find((c) =>
              it.title.toLowerCase().includes(c.name.toLowerCase())
            );
            if (foundContact) {
              bName = foundContact.name;
              cId = foundContact.id;
            }
          }

          return {
            ...it,
            type,
            borrowerName: bName,
            contactId: cId,
            missingFields:
              type === 'receivable' && !bName?.trim()
                ? Array.from(new Set([...(it.missingFields || []), 'borrower' as const]))
                : it.missingFields?.filter((f) => f !== 'borrower') || [],
          };
        });
        return { ...m, pendingPhotoItems: updated };
      })
    );
  };

  const handleSetPhotoItemBorrower = (
    msgId: string,
    itemId: string,
    borrowerName: string,
    contactId?: string | null
  ) => {
    const trimmed = borrowerName.trim();

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.pendingPhotoItems) return m;
        const updated = m.pendingPhotoItems.map((it) => {
          if (it.id !== itemId) return it;
          let finalContactId = contactId;
          if (finalContactId === undefined) {
            const matched = contacts.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
            finalContactId = matched?.id || null;
          }
          return {
            ...it,
            borrowerName: trimmed || null,
            contactId: finalContactId,
            missingFields: trimmed
              ? it.missingFields?.filter((f) => f !== 'borrower') || []
              : Array.from(new Set([...(it.missingFields || []), 'borrower' as const])),
          };
        });
        return { ...m, pendingPhotoItems: updated };
      })
    );
  };

  const handleDiscardPhotoItem = (msgId: string, itemId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.pendingPhotoItems) return m;
        const remaining = m.pendingPhotoItems.filter((it) => it.id !== itemId);
        return {
          ...m,
          pendingPhotoItems: remaining,
          isSaved: remaining.length === 0 ? true : m.isSaved,
        };
      })
    );
    toast.info('Item discarded.');
  };

  const handleSaveSinglePhotoItem = async (msgId: string, item: ParsedPhotoItem) => {
    if (item.type === 'receivable' && !item.borrowerName?.trim()) {
      toast.error('Please assign or enter a borrower name before saving.');
      return;
    }

    setSavingSingleItemId(item.id);
    try {
      const res = await commitSinglePhotoParsedItemAction(item);
      if (!res.success) {
        toast.error(res.error || 'Failed to save item.');
        return;
      }

      // If a new contact was created, register it immediately in contacts and customBorrowers
      if (res.createdContact) {
        setContacts((prev) => {
          if (prev.some((c) => c.id === res.createdContact!.id)) return prev;
          return [...prev, res.createdContact!];
        });
        setCustomBorrowers((prev) => Array.from(new Set([...prev, res.createdContact!.name])));
      }

      // Remove the saved item from the pending list AND link remaining items with same borrower
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msgId || !m.pendingPhotoItems) return m;
          const remaining = m.pendingPhotoItems
            .filter((it) => it.id !== item.id)
            .map((it) => {
              if (
                res.createdContact &&
                it.borrowerName &&
                it.borrowerName.trim().toLowerCase() === res.createdContact.name.toLowerCase()
              ) {
                return {
                  ...it,
                  contactId: res.createdContact.id,
                };
              }
              return it;
            });
          return {
            ...m,
            pendingPhotoItems: remaining,
            isSaved: remaining.length === 0 ? true : m.isSaved,
          };
        })
      );

      toast.success(
        `Saved "${item.title}" (₱${Number(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })})`
      );
      router.refresh();
    } catch (err) {
      console.error('Error saving single photo item:', err);
      toast.error('An error occurred while saving the item.');
    } finally {
      setSavingSingleItemId(null);
    }
  };

  const handleConfirmSavePhotoItems = async (msgId: string, items: ParsedPhotoItem[]) => {
    setSavingPhotoMsgId(msgId);
    try {
      const res = await commitPhotoParsedItemsAction(items);
      if (!res.success) {
        toast.error(res.error || 'Failed to save items.');
        return;
      }

      if (res.createdContacts && res.createdContacts.length > 0) {
        setContacts((prev) => {
          const newOnes = res.createdContacts!.filter((nc) => !prev.some((p) => p.id === nc.id));
          return [...prev, ...newOnes];
        });
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                isSaved: true,
                savedSummary: res.savedSummary,
              }
            : m
        )
      );

      setPendingState(null);

      const parts: string[] = [];
      if (res.savedSummary?.expenseCount) {
        parts.push(
          `${res.savedSummary.expenseCount} Expenses (₱${res.savedSummary.expenseTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })})`
        );
      }
      if (res.savedSummary?.receivableCount) {
        parts.push(
          `${res.savedSummary.receivableCount} Receivables (₱${res.savedSummary.receivableTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })})`
        );
      }

      toast.success(`Saved to Ledgers: ${parts.join(', ')}`);
      router.refresh();
    } catch (err) {
      console.error('Error saving photo items:', err);
      toast.error('An error occurred while saving.');
    } finally {
      setSavingPhotoMsgId(null);
    }
  };

  const handleCancelPhotoItems = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              pendingPhotoItems: undefined,
            }
          : m
      )
    );
    setPendingState(null);
    toast.info('Cancelled saving photo items.');
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if ((!text && !attachedImage) || isProcessing) return;

    if (isPromptsDrawerOpen) {
      setIsPromptsDrawerOpen(false);
    }

    const imageToSend = attachedImage;
    setAttachedImage(null);

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text || (imageToSend ? '📸 [Uploaded Photo]' : ''),
      imageUrl: imageToSend?.previewUrl,
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

  const isInitialState = messages.length === 1 && messages[0].id === 'welcome-msg';

  return (
    <>
      {/* Floating Trigger Button (Tenvi AI FAB) */}
      <div
        className={`fixed z-40 transition-all duration-300 ease-out origin-bottom-right top-auto bottom-24 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] bottom-ai-fab right-4 md:bottom-6 md:right-6 ${
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
          className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-xs md:hidden transition-opacity duration-300 ${
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
          className={`fixed z-50 flex flex-col overflow-hidden bg-background md:bg-card/95 md:backdrop-blur-xl border-border/60 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
            inset-x-0 bottom-0 h-[88dvh] max-h-[88dvh] rounded-t-3xl border-t pb-[max(0.75rem,env(safe-area-inset-bottom))]
            md:inset-auto md:bottom-20 md:right-6 md:w-[410px] md:h-[600px] md:max-h-[calc(100vh-7rem)] md:rounded-2xl md:border md:pb-0 md:origin-bottom-right ${
            isOpen
              ? 'opacity-100 translate-y-0 md:scale-100 pointer-events-auto'
              : 'opacity-0 translate-y-full md:translate-y-4 md:scale-95 pointer-events-none'
          }`}
        >
          {/* Mobile Drag Handle */}
          <div className="flex md:hidden items-center justify-center pt-2.5 pb-1 shrink-0 select-none">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Minimalist Header */}
          <div className="px-4 py-3 bg-card/80 backdrop-blur-md border-b border-border/50 text-foreground flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <TenviIcon variant="solid" className="w-8 h-8 rounded-xl shadow-2xs" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs border border-background">
                  <Sparkles className="w-2 h-2 text-white" />
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-semibold tracking-tight text-foreground truncate">Tenvi AI</h2>
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium truncate">
                  Financial Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setIsPromptsDrawerOpen((prev) => !prev)}
                title="Common Questions & Examples"
                aria-label="Examples"
                className={`rounded-xl transition-colors ${
                  isPromptsDrawerOpen
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Lightbulb className="w-4 h-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handleResetChat}
                title="Start a new chat"
                aria-label="Reset chat"
                className="rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
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
                className="hidden md:inline-flex rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
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
                className="rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
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
            <ScrollArea className="flex-1 min-h-0 p-4 bg-muted/20">
              {isInitialState ? (
                /* Empty State Hero */
                <div className="py-6 px-3 flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-3xl bg-muted/60 border border-border/70 flex items-center justify-center shadow-xs">
                      <TenviIcon variant="solid" className="w-10 h-10 rounded-2xl shadow-xs" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs border-2 border-background">
                      <Sparkles className="w-3 h-3 text-white" />
                    </span>
                  </div>

                  <div className="space-y-1 max-w-xs">
                    <h3 className="text-base font-bold text-foreground tracking-tight">
                      Welcome to Tenvi AI
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Your intelligent financial companion. Ask questions about your cards, analyze cash flow, or log spending instantly.
                    </p>
                  </div>

                  {/* Suggestion Starter Chips */}
                  <div className="w-full pt-1 flex flex-col gap-2 max-w-sm">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-left pl-1">
                      Suggested Prompts
                    </div>
                    {[
                      { label: 'Summarize my credit card usage', icon: CreditCard, prompt: 'Summarize my credit card usage' },
                      { label: 'Upcoming due dates', icon: Calendar, prompt: 'When is my next credit card due date?' },
                      { label: 'Check portfolio cash flow', icon: TrendingUp, prompt: 'Check portfolio cash flow and monthly spending' },
                      { label: 'Paid 250 for lunch in cash', icon: Banknote, prompt: 'Paid 250 for lunch in cash' },
                    ].map((chip, idx) => {
                      const Icon = chip.icon;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(chip.prompt)}
                          disabled={isProcessing}
                          className="w-full text-left px-3.5 py-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/70 hover:border-border transition-all text-xs font-medium text-foreground flex items-center justify-between group shadow-2xs cursor-pointer active:scale-[0.99]"
                        >
                          <span className="flex items-center gap-2.5 truncate">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                            <span className="truncate">{chip.label}</span>
                          </span>
                          <Zap className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-emerald-500 transition-colors shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
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
                        className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-primary text-primary-foreground rounded-tr-xs shadow-xs ml-auto'
                            : 'bg-muted/50 dark:bg-muted/30 border border-border/40 text-foreground rounded-tl-xs shadow-xs'
                        }`}
                      >
                      {/* User Image Attachment */}
                      {msg.imageUrl && (
                        <div className="mb-2 max-w-xs overflow-hidden rounded-xl bg-black/20">
                          <img
                            src={msg.imageUrl}
                            alt="Uploaded photo"
                            className="max-h-52 w-auto rounded-xl object-contain shadow-xs"
                          />
                        </div>
                      )}

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

                    {/* Photo Parsed Items Confirmation & Review Card */}
                    {msg.pendingPhotoItems && (msg.pendingPhotoItems.length > 0 || msg.isSaved) && (
                      <div className="mt-4 p-4 sm:p-6 rounded-2xl bg-muted/50 space-y-4 shadow-xs">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-1">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                              <Receipt className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-sm font-bold text-foreground block">
                                Photo Review ({msg.pendingPhotoItems.length} {msg.pendingPhotoItems.length === 1 ? 'item' : 'items'})
                              </span>
                              <span className="text-xs text-muted-foreground block">
                                {msg.isSaved || msg.pendingPhotoItems.length === 0
                                  ? 'All parsed items have been processed'
                                  : 'Review items, select borrowers, or save individually'}
                              </span>
                            </div>
                          </div>
                          {msg.pendingPhotoItems.length > 0 && (
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                                Total
                              </span>
                              <span className="text-base font-extrabold text-foreground block">
                                ₱{msg.pendingPhotoItems.reduce((sum, it) => sum + Number(it.amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Batch Type Switcher */}
                        {!msg.isSaved && msg.pendingPhotoItems.length > 1 && (
                          <div className="flex items-center justify-between gap-2 bg-card p-2.5 rounded-xl shadow-2xs">
                            <span className="text-xs text-muted-foreground font-semibold pl-1">Batch apply:</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSetAllPhotoItemTypes(msg.id, 'expense')}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                              >
                                All Expenses 🏷️
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetAllPhotoItemTypes(msg.id, 'receivable')}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                              >
                                All Receivables 👤
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Itemized List */}
                        <div className="space-y-3.5 max-h-[34rem] overflow-y-auto pr-1">
                          {msg.pendingPhotoItems.map((item, idx) => (
                            <div key={item.id || idx} className="bg-card rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
                              {/* Title, Date & Amount */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1 space-y-1">
                                  <span className="text-sm sm:text-base font-bold text-foreground block leading-snug truncate">
                                    {item.title}
                                  </span>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <span>{item.date}</span>
                                    {item.categoryName && (
                                      <>
                                        <span>•</span>
                                        <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <span className="truncate">{item.categoryName}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-base sm:text-lg font-extrabold text-foreground block">
                                    ₱{Number(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>

                              {/* Duplicate Warning Banner */}
                              {item.duplicateWarning?.isDuplicate && !msg.isSaved && (
                                <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/10 text-amber-900 dark:text-amber-200 space-y-2">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2 text-xs font-semibold">
                                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                      <div>
                                        <span className="block font-bold">Possible duplicate entry detected</span>
                                        <span className="block text-[11px] font-medium opacity-90 mt-0.5">
                                          Existing record: ₱{item.duplicateWarning.matchedAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} on {item.duplicateWarning.matchedDate} ({item.duplicateWarning.matchedDescription})
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDiscardPhotoItem(msg.id, item.id)}
                                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-amber-200/80 hover:bg-amber-300/80 dark:bg-amber-900/60 dark:hover:bg-amber-800/60 text-amber-950 dark:text-amber-100 shrink-0 cursor-pointer transition-colors"
                                    >
                                      Discard
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Type Toggle & Details */}
                              <div className="space-y-2.5 pt-1">
                                <div className="flex items-center justify-between gap-2">
                                  {/* Toggle Expense vs Receivable */}
                                  {!msg.isSaved ? (
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePhotoItemType(msg.id, item.id)}
                                      className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                                        item.type === 'expense'
                                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                      }`}
                                    >
                                      {item.type === 'expense' ? (
                                        <>
                                          <ArrowDownLeft className="w-3.5 h-3.5" />
                                          Expense (Money Out)
                                        </>
                                      ) : (
                                        <>
                                          <ArrowUpRight className="w-3.5 h-3.5" />
                                          Receivable (Lent)
                                        </>
                                      )}
                                    </button>
                                  ) : (
                                    <span
                                      className={`text-xs font-bold px-3.5 py-1 rounded-full ${
                                        item.type === 'expense' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'
                                      }`}
                                    >
                                      {item.type === 'expense' ? 'Expense' : 'Receivable'}
                                    </span>
                                  )}

                                  {item.type === 'receivable' && msg.isSaved && (
                                    <span className="text-xs text-muted-foreground font-semibold">
                                      {item.borrowerName ? `for ${item.borrowerName}` : 'Unassigned'}
                                    </span>
                                  )}
                                </div>

                                {/* Receivable Borrower Selector Row */}
                                {item.type === 'receivable' && !msg.isSaved && (() => {
                                  const isCustomMode = Boolean(enteringCustomBorrower[item.id]);
                                  const borrowerMatch = item.borrowerName
                                    ? allAvailableBorrowers.find(
                                        (b) => b.name.toLowerCase() === item.borrowerName?.toLowerCase()
                                      )
                                    : null;
                                  const selectValue = isCustomMode
                                    ? '__new__'
                                    : borrowerMatch
                                    ? borrowerMatch.id
                                    : item.borrowerName
                                    ? '__new__'
                                    : '';

                                  return (
                                    <div className="p-3.5 sm:p-4 bg-muted/40 rounded-xl space-y-2.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                          <User className="w-3.5 h-3.5 text-blue-600" />
                                          Borrower:
                                        </span>
                                        {!item.borrowerName?.trim() && (
                                          <span className="text-xs font-bold text-amber-600">
                                            ⚠️ Needs borrower
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                        <select
                                          value={selectValue}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val) {
                                              setEnteringCustomBorrower((prev) => ({ ...prev, [item.id]: false }));
                                              handleSetPhotoItemBorrower(msg.id, item.id, '', null);
                                            } else if (val === '__new__') {
                                              setEnteringCustomBorrower((prev) => ({ ...prev, [item.id]: true }));
                                            } else if (val.startsWith('prop:')) {
                                              setEnteringCustomBorrower((prev) => ({ ...prev, [item.id]: false }));
                                              const propName = val.replace('prop:', '');
                                              const matched = contacts.find((c) => c.name.toLowerCase() === propName.toLowerCase());
                                              handleSetPhotoItemBorrower(msg.id, item.id, propName, matched?.id || null);
                                            } else if (val.startsWith('custom:')) {
                                              setEnteringCustomBorrower((prev) => ({ ...prev, [item.id]: false }));
                                              const customName = val.replace('custom:', '');
                                              handleSetPhotoItemBorrower(msg.id, item.id, customName, null);
                                            } else {
                                              setEnteringCustomBorrower((prev) => ({ ...prev, [item.id]: false }));
                                              const matched = contacts.find((c) => c.id === val);
                                              if (matched) {
                                                handleSetPhotoItemBorrower(msg.id, item.id, matched.name, matched.id);
                                              }
                                            }
                                          }}
                                          className="text-xs bg-card text-foreground font-semibold py-2 px-3 rounded-xl outline-none flex-1 border-0 cursor-pointer shadow-2xs"
                                        >
                                          <option value="">-- Choose Borrower / Asset --</option>
                                          {contacts.length > 0 && (
                                            <optgroup label="People & Contacts">
                                              {contacts.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                  👤 {c.name}
                                                </option>
                                              ))}
                                            </optgroup>
                                          )}
                                          {properties.length > 0 && (
                                            <optgroup label="Properties & Assets">
                                              {properties.map((p) => {
                                                const label = `${p.name}${p.identifier ? ` (${p.identifier})` : ''}`;
                                                return (
                                                  <option key={`prop:${p.id}`} value={`prop:${p.name}`}>
                                                    {getPropertyIcon(p.property_type)} {label}
                                                  </option>
                                                );
                                              })}
                                            </optgroup>
                                          )}
                                          {allAvailableBorrowers.some((b) => b.isCustom) && (
                                            <optgroup label="Recently Added">
                                              {allAvailableBorrowers
                                                .filter((b) => b.isCustom)
                                                .map((b) => (
                                                  <option key={b.id} value={b.id}>
                                                    ✨ {b.name}
                                                  </option>
                                                ))}
                                            </optgroup>
                                          )}
                                          <option value="__new__">✏️ + Enter New Borrower Name</option>
                                        </select>

                                        {/* Custom Borrower Text Input when __new__ is selected or custom mode is active */}
                                        {(isCustomMode || (item.borrowerName && !borrowerMatch && !contacts.some((c) => c.id === item.contactId))) && (
                                          <input
                                            type="text"
                                            placeholder="Type borrower name (e.g. H100)..."
                                            value={item.borrowerName || ''}
                                            autoFocus={isCustomMode}
                                            onChange={(e) =>
                                              handleSetPhotoItemBorrower(msg.id, item.id, e.target.value, null)
                                            }
                                            onBlur={(e) => {
                                              const val = e.target.value.trim();
                                              if (val.length >= 2) {
                                                setCustomBorrowers((prev) => {
                                                  if (prev.some((b) => b.toLowerCase() === val.toLowerCase())) return prev;
                                                  return [...prev, val];
                                                });
                                              }
                                            }}
                                            className="text-xs bg-card text-foreground font-semibold py-2 px-3 rounded-xl outline-none sm:w-52 border-0 placeholder:text-muted-foreground shadow-2xs"
                                          />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Individual Item Action Footer */}
                              {!msg.isSaved && (
                                <div className="pt-2 flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleDiscardPhotoItem(msg.id, item.id)}
                                    disabled={savingSingleItemId === item.id || savingPhotoMsgId === msg.id}
                                    className="text-xs font-semibold text-muted-foreground hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Discard
                                  </button>

                                  <Button
                                    type="button"
                                    size="xs"
                                    onClick={() => handleSaveSinglePhotoItem(msg.id, item)}
                                    disabled={
                                      savingSingleItemId === item.id ||
                                      savingPhotoMsgId === msg.id ||
                                      (item.type === 'receivable' && !item.borrowerName?.trim())
                                    }
                                    className="rounded-xl shadow-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer px-3 py-1.5"
                                  >
                                    {savingSingleItemId === item.id ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Saving...
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        Save Item
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Confirmation Action Footer */}
                        <div className="pt-2 flex items-center justify-between gap-2">
                          {msg.isSaved || msg.pendingPhotoItems.length === 0 ? (
                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              All Items Confirmed & Saved to Ledgers ✅
                            </span>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                onClick={() => handleCancelPhotoItems(msg.id)}
                                disabled={savingPhotoMsgId === msg.id || Boolean(savingSingleItemId)}
                                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                Discard All ({msg.pendingPhotoItems.length})
                              </Button>

                              {msg.pendingPhotoItems.length > 1 && (
                                <Button
                                  type="button"
                                  size="xs"
                                  onClick={() => handleConfirmSavePhotoItems(msg.id, msg.pendingPhotoItems!)}
                                  disabled={
                                    savingPhotoMsgId === msg.id ||
                                    Boolean(savingSingleItemId) ||
                                    msg.pendingPhotoItems.some(
                                      (it) => it.type === 'receivable' && !it.borrowerName?.trim()
                                    )
                                  }
                                  className="rounded-xl shadow-xs gap-1 font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                                >
                                  {savingPhotoMsgId === msg.id ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      Saving All...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Save All Remaining ({msg.pendingPhotoItems.length})
                                    </>
                                  )}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div
                      className={`text-[10px] mt-1 text-muted-foreground select-none ${
                        msg.sender === 'user' ? 'text-right mr-1' : 'text-left ml-1'
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
                    <div className="flex flex-wrap gap-1.5 mt-2.5 max-w-[95%]">
                      {msg.quickReplies.map((reply, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleQuickReply(reply)}
                          disabled={isProcessing}
                          className="text-xs font-semibold bg-card border border-border/60 hover:bg-primary hover:text-primary-foreground hover:border-primary text-foreground px-3 py-1.5 rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            )}

            <div ref={messagesEndRef} />
          </ScrollArea>
        )}

        {/* Quick-Prompt Chips Bar (Above Input) */}
        {!isPromptsDrawerOpen && (
          <div className="px-3 pt-2 pb-1 bg-card/80 backdrop-blur-md border-t border-border/40 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setIsPromptsDrawerOpen(true)}
                className="flex items-center gap-1 text-[11px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Lightbulb className="w-3 h-3 text-amber-500" />
                <span>Prompt Ideas</span>
              </button>
              {QUICK_STARTER_PILLS.map((pill, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(pill.prompt)}
                  disabled={isProcessing}
                  className="text-[11px] font-medium bg-muted/60 hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer shrink-0 disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Input Bar */}
        <div className="p-3 bg-card/90 backdrop-blur-md border-t border-border/40 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-3">
          {/* Image attachment preview if selected */}
          {attachedImage && (
            <div className="mb-2 p-2 rounded-xl bg-muted/70 border border-border/50 shadow-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={attachedImage.previewUrl}
                  alt="Preview"
                  className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border/60"
                />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-foreground truncate block">
                    Photo Attached
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate block">
                    {attachedImage.file.name || 'Receipt or document'}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handleRemoveImage}
                className="rounded-lg text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Floating Input Container */}
          <div className="relative rounded-2xl bg-muted/40 border border-border/60 p-1.5 pl-3 flex items-end gap-1.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                attachedImage
                  ? "Add note (e.g. 'Expenses' or 'Receivables for John')..."
                  : "Ask a question or log spending (e.g. 'paid 250 for lunch')..."
              }
              rows={1}
              disabled={isProcessing}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none py-1.5 font-medium border-0 max-h-24 leading-relaxed"
            />
            
            <div className="flex items-center gap-1 shrink-0 pb-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => fileInputRef.current?.click()}
                title="Upload receipt / photo"
                disabled={isProcessing}
                className="rounded-xl text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-muted/80 cursor-pointer"
              >
                <ImagePlus className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setIsPromptsDrawerOpen((prev) => !prev)}
                title="Common prompt ideas"
                className="rounded-xl text-muted-foreground hover:text-amber-500 hover:bg-muted/80"
              >
                <Lightbulb className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="icon-xs"
                onClick={() => handleSendMessage()}
                disabled={(!inputText.trim() && !attachedImage) || isProcessing}
                aria-label="Send message"
                className={`rounded-xl transition-all cursor-pointer ${
                  inputText.trim() || attachedImage
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs active:scale-95'
                    : 'bg-muted text-muted-foreground/50 cursor-not-allowed opacity-60'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          </div>
          <div className="mt-1.5 px-1.5 flex items-center justify-between text-[11px] text-muted-foreground select-none">
            <span>Press Enter to send</span>
            <span className="font-medium text-muted-foreground/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
              Private & Encrypted
            </span>
          </div>
        </div>
      </div>
    )}
  </>
);
}
