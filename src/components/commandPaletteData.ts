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
