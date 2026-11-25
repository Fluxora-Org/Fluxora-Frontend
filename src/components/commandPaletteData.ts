/**
 * Command Palette & Help Search Data Dictionary
 * ─────────────────────────────────────────────────────────
 * Grouped items for Actions, Keyboard Shortcuts, and Help Articles.
 */

export type PaletteCategory = "Actions" | "Shortcuts" | "Help";

export interface PaletteItem {
  id: string;
  title: string;
  description: string;
  category: PaletteCategory;
  shortcutKeys?: string[];
  keywords: string[];
  actionId?: string;
  targetPath?: string;
}

export const PALETTE_ITEMS: PaletteItem[] = [
  // --- ACTIONS ---
  {
    id: "act-create-stream",
    title: "Create New Stream",
    description: "Initialize a continuous capital streaming contract on Stellar",
    category: "Actions",
    shortcutKeys: ["C"],
    keywords: ["create", "stream", "new", "send", "treasury", "drip", "pay"],
    targetPath: "/app/streams?action=create",
  },
  {
    id: "act-nav-dashboard",
    title: "Jump to Dashboard",
    description: "View main capital metrics, active flows, and treasury overview",
    category: "Actions",
    keywords: ["dashboard", "overview", "home", "metrics", "analytics"],
    targetPath: "/app",
  },
  {
    id: "act-nav-streams",
    title: "Jump to Streams",
    description: "Manage active, paused, and completed streaming contracts",
    category: "Actions",
    keywords: ["streams", "list", "active", "paused", "history", "contracts"],
    targetPath: "/app/streams",
  },
  {
    id: "act-nav-recipient",
    title: "Jump to Recipient",
    description: "View incoming streams, accrued balance, and claim capital",
    category: "Actions",
    keywords: ["recipient", "claims", "incoming", "withdraw", "balance"],
    targetPath: "/app/recipient",
  },
  {
    id: "act-withdraw",
    title: "Withdraw Capital",
    description: "Claim available accrued tokens directly to your Stellar wallet",
    category: "Actions",
    keywords: ["withdraw", "claim", "tokens", "payout", "funds"],
    targetPath: "/app/recipient?action=withdraw",
  },
  {
    id: "act-toggle-theme",
    title: "Toggle Light / Dark Mode",
    description: "Switch visual theme for low-light or high-contrast preference",
    category: "Actions",
    keywords: ["theme", "dark", "light", "mode", "color", "appearance"],
    actionId: "toggle-theme",
  },

  // --- SHORTCUTS ---
  {
    id: "sc-cmd-k",
    title: "Open Command Palette & Help",
    description: "Quick search for actions, shortcuts, and documentation",
    category: "Shortcuts",
    shortcutKeys: ["⌘", "K"],
    keywords: ["command", "palette", "search", "cmd+k", "ctrl+k"],
  },
  {
    id: "sc-shortcuts-help",
    title: "Open Keyboard Reference",
    description: "Display global keyboard shortcuts list",
    category: "Shortcuts",
    shortcutKeys: ["?"],
    keywords: ["shortcuts", "keys", "keyboard", "help", "question"],
  },
  {
    id: "sc-escape",
    title: "Close Modal / Dismiss Overlay",
    description: "Exit active dialogs, popovers, or search overlays",
    category: "Shortcuts",
    shortcutKeys: ["Esc"],
    keywords: ["escape", "close", "dismiss", "exit", "cancel"],
  },
  {
    id: "sc-arrows",
    title: "Navigate Results & Menus",
    description: "Move focus up and down through list options",
    category: "Shortcuts",
    shortcutKeys: ["↑", "↓"],
    keywords: ["arrows", "up", "down", "navigate", "select"],
  },
  {
    id: "sc-enter",
    title: "Execute Selected Action",
    description: "Trigger the currently highlighted command or option",
    category: "Shortcuts",
    shortcutKeys: ["↵"],
    keywords: ["enter", "select", "execute", "run", "confirm"],
  },

  // --- HELP ARTICLES ---
  {
    id: "help-streaming-how-it-works",
    title: "How Continuous Capital Streaming Works",
    description: "Learn how tokens accrue per second without discrete transaction fees",
    category: "Help",
    keywords: ["how", "works", "streaming", "accrual", "second", "soroban"],
    targetPath: "/#features",
  },
  {
    id: "help-wallet-setup",
    title: "Stellar Wallet & Freighter Setup Guide",
    description: "Instructions for connecting Freighter, Albedo, or xBull wallets",
    category: "Help",
    keywords: ["wallet", "freighter", "albedo", "connect", "stellar", "keys"],
    targetPath: "/connect-wallet",
  },
  {
    id: "help-withdrawal-rules",
    title: "Recipient Claim & Withdrawal Rules",
    description: "Understanding gas-free accrual and immediate withdrawal availability",
    category: "Help",
    keywords: ["withdrawal", "claim", "rules", "gas", "fees", "recipient"],
    targetPath: "/app/recipient",
  },
  {
    id: "help-yield-accrual",
    title: "Treasury Accrual & Cliff Periods",
    description: "How cliff dates impact token release schedules and vesting",
    category: "Help",
    keywords: ["cliff", "vesting", "accrual", "schedule", "yield", "release"],
    targetPath: "/app/streams",
  },
];

/**
 * Calculates a fuzzy match score for a single word against a query.
 * Returns 0 if query is not a subsequence of word.
 */
function scoreWordSubsequence(word: string, query: string): number {
  const w = word.toLowerCase();
  const q = query.toLowerCase();
  if (w === q) return 1000;
  if (w.startsWith(q)) return 700 + Math.round((q.length / w.length) * 200);

  let qIdx = 0;
  let consecutive = 0;
  let score = 0;
  let firstMatch = -1;
  let lastMatch = -1;

  for (let i = 0; i < w.length; i++) {
    if (qIdx < q.length && w[i] === q[qIdx]) {
      if (firstMatch === -1) firstMatch = i;
      lastMatch = i;
      score += 20;
      if (i === 0) score += 60; // word-start hit bonus
      if (consecutive > 0) score += 30 * consecutive; // consecutive hits bonus
      consecutive++;
      qIdx++;
    } else {
      consecutive = 0;
    }
  }

  if (qIdx < q.length) return 0; // Not a subsequence of this word

  const span = lastMatch - firstMatch + 1;
  score += Math.max(0, 50 - (span - q.length) * 10);
  return score;
}

/**
 * Calculates a fuzzy match score for text against a query.
 * Handles single-word queries, multi-word queries, and substring/subsequence hits.
 */
export function scoreText(text: string, query: string): number {
  const t = text.toLowerCase().trim();
  const q = query.toLowerCase().trim();

  if (!t || !q) return 0;
  if (t === q) return 10000;
  if (t.startsWith(q)) return 5000 + Math.round((q.length / t.length) * 1000);
  if (t.includes(q)) return 3000 + Math.round((q.length / t.length) * 500);

  const queryWords = q.split(/\s+/).filter(Boolean);
  const textWords = t.split(/[\s\-_/.]+/).filter(Boolean);

  if (queryWords.length === 1) {
    const singleQuery = queryWords[0];
    let maxWordScore = 0;
    for (const word of textWords) {
      const s = scoreWordSubsequence(word, singleQuery);
      if (s > maxWordScore) {
        maxWordScore = s;
      }
    }
    if (maxWordScore > 0) return maxWordScore;

    // Check full-string subsequence fallback
    let qIdx = 0;
    let consecutive = 0;
    let score = 0;
    for (let i = 0; i < t.length; i++) {
      if (qIdx < singleQuery.length && t[i] === singleQuery[qIdx]) {
        score += 15;
        if (i === 0 || /[\s\-_/.]/.test(t[i - 1])) score += 40;
        if (consecutive > 0) score += 20 * consecutive;
        consecutive++;
        qIdx++;
      } else {
        consecutive = 0;
      }
    }
    return qIdx === singleQuery.length ? score : 0;
  }

  // Multi-word query: all query words must match in textWords
  let totalScore = 0;
  for (const qWord of queryWords) {
    let matchedScore = 0;
    for (const tWord of textWords) {
      const s = scoreWordSubsequence(tWord, qWord);
      if (s > matchedScore) {
        matchedScore = s;
      }
    }
    if (matchedScore === 0) {
      return 0; // all words in multi-word query must match
    }
    totalScore += matchedScore;
  }
  return totalScore;
}

/**
 * Pure function to score a PaletteItem against a query.
 * Exact title match is guaranteed to produce an overwhelming score (>1,000,000)
 * so that it always ranks first.
 */
export function scorePaletteItem(item: PaletteItem, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const titleLower = item.title.toLowerCase().trim();
  if (titleLower === q) {
    return 1_000_000;
  }

  const titleScore = scoreText(item.title, q);

  let bestKeywordScore = 0;
  for (const kw of item.keywords) {
    const s = scoreText(kw, q);
    if (s > bestKeywordScore) {
      bestKeywordScore = s;
    }
  }

  const descScore = scoreText(item.description, q);

  if (titleScore === 0 && bestKeywordScore === 0 && descScore === 0) {
    return 0;
  }

  return (titleScore * 10) + (bestKeywordScore * 5) + descScore;
}

export const CATEGORY_ORDER: Record<PaletteCategory, number> = {
  Actions: 0,
  Shortcuts: 1,
  Help: 2,
};

/**
 * Deterministic comparison function:
 * 1. Score descending
 * 2. Category ascending (Actions -> Shortcuts -> Help)
 * 3. Title ascending
 */
export function comparePaletteItems(
  a: PaletteItem,
  b: PaletteItem,
  query: string,
): number {
  const scoreA = scorePaletteItem(a, query);
  const scoreB = scorePaletteItem(b, query);
  if (scoreB !== scoreA) {
    return scoreB - scoreA;
  }
  const catA = CATEGORY_ORDER[a.category] ?? 99;
  const catB = CATEGORY_ORDER[b.category] ?? 99;
  if (catA !== catB) {
    return catA - catB;
  }
  return a.title.localeCompare(b.title);
}
