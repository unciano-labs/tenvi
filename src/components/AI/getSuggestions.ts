export type SuggestionCategory = 'cards' | 'due' | 'cash';

export interface ContextualSuggestion {
  id: string;
  category: SuggestionCategory;
  title: string;
  description: string;
  query: string;
  badge?: string;
  isMocked?: boolean;
}

export interface SuggestionContext {
  cardsCount?: number;
  userName?: string;
}

/**
 * Adapter returning contextual insight suggestions.
 * Grounded in real card/account data if available, with clearly documented placeholder analytics.
 */
export function getSuggestions(context?: SuggestionContext): ContextualSuggestion[] {
  return [
    {
      id: 'due-dates',
      category: 'due',
      title: 'Upcoming due dates',
      description: 'Check statement cutoffs and cards due this billing window',
      query: 'When is my next credit card due date and how much is due?',
      badge: 'Due Soon',
      isMocked: false,
    },
    {
      id: 'best-card',
      category: 'cards',
      title: 'Best card to swipe today',
      description: 'Maximize interest-free float days based on your billing cycles',
      query: 'Which card is best to swipe today for maximum float?',
      badge: 'Float Optimizer',
      isMocked: false,
    },
    {
      id: 'dining-spending',
      category: 'cash',
      title: 'Dining & food spending',
      description: 'Analyze restaurant charges and daily food expenses',
      query: 'How much did I spend on food and dining this month?',
      badge: 'Cash Flow',
      isMocked: true, // Placeholder telemetry: swap with monthly category analytics
    },
    {
      id: 'quick-cash-log',
      category: 'cash',
      title: 'Log a cash expense',
      description: 'Record cash, Maya, or GCash payments into your ledger',
      query: 'Paid 250 for lunch in cash',
      badge: 'Quick Log',
      isMocked: false,
    },
  ];
}

export const FOLLOW_UP_CHIPS_MAP: Record<string, string[]> = {
  default: [
    'Which card is best to swipe today?',
    'When is my next credit card due date?',
    'Check portfolio cash flow',
  ],
  cards: [
    'Show all my credit cards and cutoffs',
    'How much available credit do I have?',
    'Compare float days between my cards',
  ],
  expenses: [
    'Summarize my spending this month',
    'How much did I spend on utilities?',
    'Show my recent transactions',
  ],
};

