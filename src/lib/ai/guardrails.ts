/**
 * Guardrail helpers for Tenvi AI.
 * Keeps Tenvi AI strictly bounded to personal finance and Tenvi platform operations.
 */

/**
 * Checks if a user message is explicitly asking about non-financial, non-Tenvi topics
 * (e.g. general coding, creative writing, trivia, recipes, science, etc.).
 */
export function isClearlyOffTopic(message: string): boolean {
  const lower = message.toLowerCase().trim();
  if (!lower) return false;

  const offTopicPatterns = [
    /\b(write|create|generate|draft|compose)\b.*\b(script|code|program|python|javascript|typescript|react|html|css|sql|regex|function|algorithm|class|api|app|bot|crawler|scraper)\b/i,
    /\b(write|create|generate|tell|recite)\b.*\b(poem|poetry|story|joke|essay|article|song|lyrics|rap|haiku|speech|novel|fiction)\b/i,
    /\b(how to code|how to program|learn python|debug this|fix this code|syntax error)\b/i,
    /\b(what is the capital of|who is the president of|who won the|history of|explain quantum|theory of relativity|chemical formula|photosynthesis)\b/i,
    /\b(recipe for|how to cook|bake a cake|ingredients for)\b/i,
    /\b(horoscope|zodiac|astrology|tarot)\b/i,
    /\b(translate to french|translate to spanish|translate to german|translate to japanese)\b/i,
    /\bwho is (taylor swift|elon musk|messi|ronaldo|lebron|beyonce|donald trump|kamala harris|biden)\b/i,
    /\b(weather today|weather forecast|will it rain)\b/i,
  ];

  return offTopicPatterns.some((pattern) => pattern.test(lower));
}

/**
 * Validates if an input has legitimate connection to Tenvi, Philippine money management,
 * banking, credit cards, or transactions.
 */
export function hasFinancialOrTenviRelevance(message: string): boolean {
  const lower = message.toLowerCase().trim();
  if (!lower) return false;

  // Greetings or general help
  if (
    /^(hi|hello|hey|yo|good morning|good afternoon|good evening|kamusta|musta|help|what can you do|features|\?)$/i.test(
      lower
    ) ||
    lower.startsWith('what can you do') ||
    lower.startsWith('how do i use tenvi') ||
    lower.startsWith('help')
  ) {
    return true;
  }

  // Tenvi domain terms
  if (
    /\b(tenvi|dashboard|ledger|statement|statements|cutoff|cut-off|unbilled|receivable|receivables|pautang|utang|payable|payables|split|splits|savings|vault|vaults|stash|runway|emergency|float|swipe|card|cards)\b/i.test(
      lower
    )
  ) {
    return true;
  }

  // Currency or numeric amounts
  if (
    /[₱$€£]/.test(lower) ||
    /\b(php|pesos?|centavos?|bucks)\b/i.test(lower) ||
    /\b\d+(\.\d{1,2})?\b/.test(lower)
  ) {
    return true;
  }

  // Financial verbs and transactional nouns
  if (
    /\b(spent|spend|bought|buy|paid|pay|purchase|ordered|cost|worth|bill|bills|rent|tuition|salary|sweldo|sahod|income|deposit|withdraw|allowance|loan|debt|borrow|lent|lend|transfer|remit|remittance|cashback|refund|expense|expenses|inflow|outflow|cash|gcash|maya|grabpay|bdo|bpi|metrobank|security bank|unionbank|rcbc|gotyme|seabank|cimb|maribank|tonik|credit card|debit card|visa|mastercard|amex|jcb|groceries|grocery|supermarket|gas|gasoline|fuel|meralco|maynilad|kuryente|tubig|wifi|internet|load)\b/i.test(
      lower
    )
  ) {
    return true;
  }

  return false;
}
