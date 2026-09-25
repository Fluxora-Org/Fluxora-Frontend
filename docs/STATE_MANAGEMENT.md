# State Management Approach

This document outlines how state is managed across the Fluxora Frontend, assigning clear ownership to each domain to avoid duplication and inconsistencies.

## State Mechanisms and Ownership

The application avoids a single monolithic state store (like Redux) in favor of localized, purpose-built state mechanisms.

1.  **Wallet Context (`WalletContext`)**
    *   **What it owns:** Current connected wallet address, network, and connection health (`connected`, `reconnecting`, `dropped`, `disconnected`).
    *   **Where it lives:** `src/components/wallet-connect/Walletcontext.tsx` and synchronized across tabs via `src/lib/accountContextSync.ts`.
    *   **Rules:** Do not duplicate wallet connection status in local component state. Always consume from `useContext(WalletContext)`.

2.  **URL-Bound Filters (`useStreamRouteFilters`)**
    *   **What it owns:** Filter parameters (status, search query, sort, pagination) that define the current view of a list.
    *   **Where it lives:** The URL search parameters (querystring). Interacted with via `src/hooks/useStreamRouteFilters.ts`.
    *   **Rules:** The URL is the single source of truth for these filters. Components must not maintain duplicate React state (`useState`) for these values; instead, read and write directly through the hook to ensure deep-linkability.

3.  **Session Recovery (`streamsSessionRecovery`)**
    *   **What it owns:** Unsubmitted form drafts (e.g., creating a stream) and last-used filters for a specific account.
    *   **Where it lives:** Browser Local Storage, managed by `src/lib/streamsSessionRecovery.ts`.
    *   **Rules:** This state is transient and scoped by wallet address. It is used to pre-fill forms and URLs on mount. It must be explicitly cleared upon successful transaction submission or manual cancellation.

4.  **Optimistic Transactions (`useOptimisticStreams`)**
    *   **What it owns:** Temporary representations of streams that have been submitted to the network but are awaiting final ledger confirmation.
    *   **Where it lives:** In-memory React state (often tied to contexts or high-level hooks), `src/hooks/useOptimisticStreams.ts`.
    *   **Rules:** Optimistic state is automatically discarded or reconciled once the backend polling (`useTransactionStatus`) confirms the real on-chain data.

5.  **Offline Queues (`offlineActionQueue`)**
    *   **What it owns:** User intents (actions) that were attempted while the device was disconnected.
    *   **Where it lives:** Persistent storage (Local Storage/IndexedDB) managed by `src/lib/offlineActionQueue.ts`.
    *   **Rules:** Actions are replayed when `useOnlineStatus` detects a restored connection.

6.  **Presence (`usePresenceViewers`)**
    *   **What it owns:** Real-time data about other users currently viewing or editing the same resource (e.g., a specific stream).
    *   **Where it lives:** Transient, remote-synchronized state managed by `src/hooks/usePresenceViewers.ts` (often backed by WebSockets or SSE).
    *   **Rules:** This is strictly ephemeral. It does not persist across reloads or affect core business logic.

7.  **Toasts (`ToastProvider`)**
    *   **What it owns:** Ephemeral UI notifications (success, error, info messages).
    *   **Where it lives:** In-memory React state in `src/components/toast/ToastProvider.tsx`.
    *   **Rules:** Fire-and-forget. Do not rely on toast state for application logic.

8.  **Theme (`ThemeProvider`)**
    *   **What it owns:** The user's preferred visual theme (light, dark, system) and accessibility overrides (e.g., reduced motion).
    *   **Where it lives:** `src/theme/ThemeProvider.tsx` and persisted in Local Storage.
    *   **Rules:** Consumed globally via Context.

## Guidance for New State

When introducing new state, follow this decision tree to place it in the correct mechanism:

1.  **Is it critical for deep-linking or sharing?** -> **URL Search Params** (e.g., `useStreamRouteFilters`).
2.  **Does it represent incomplete user input that shouldn't be lost on refresh?** -> **Session Recovery** (Local Storage).
3.  **Is it a pending on-chain action?** -> **Optimistic Transactions** (until confirmed) or **Offline Queue** (if no connection).
4.  **Is it related to the user's identity/connection?** -> **Wallet Context**.
5.  **Is it ephemeral UI feedback?** -> **Toasts**.
6.  **Does it affect the visual presentation globally?** -> **Theme Provider**.
7.  **Is it truly isolated to a single UI component's interaction?** -> **Local Component State** (`useState`).

## Consolidated State

*   **Filter Duplication:** Ensure that components relying on view filters (like tables or lists) do not maintain an internal `useState` for things like `searchQuery` or `currentPage`. They must read directly from the URL via `useStreamRouteFilters`. The Session Recovery mechanism restores these to the URL on initial load, meaning the URL remains the undisputed owner during the session.
