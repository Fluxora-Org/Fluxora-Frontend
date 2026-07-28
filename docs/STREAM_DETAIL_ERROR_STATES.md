# Stream Detail Error States

This document spells out the expected behavior and regression surface around the Stream Detail page (`src/pages/StreamDetail.tsx`) when data fetches fail or partial data is returned.

## Current Behavior & Data Flow

When a user visits `/app/streams/:streamId`, the component attempts to fetch the corresponding stream record via the upstream API. The lifecycle of this fetch is subject to three primary edge-case scenarios:

1. **Network or Server Errors (Fetch Failures)**
   - The UI enters the **error** state.
   - An error banner is displayed showing either the specific error message propagated from the service layer or a fallback "Failed to load stream.".
   - A **"Try again"** button is rendered alongside a link back to the stream list.
   - **Retry behavior:** Clicking "Try again" bypasses a full page refresh. The component resets to the `loading` state, issues a new `AbortController` signal, and re-invokes the fetch. This guarantees deterministic `loading -> error -> loading -> success/error` transitions.

2. **Stream Not Found (404 / Null)**
   - If the API returns a 404, the service layer converts this to a `null` payload.
   - The UI displays a friendly **"Stream not found"** state containing the requested `streamId` inline, formatted clearly, and offers a link to return to the streams directory.

3. **Partial Data / Malformed Payloads**
   - The `StreamDetail` UI strictly expects a fully-formed `StreamRecord`.
   - The upstream API might return partial, missing, or malformed data. Instead of defensive conditional rendering in the UI (e.g. `stream.name || 'Unknown'`), the service layer leverages the `normalizeStreamRecord` mapper located in `src/data/streamRecords.ts`.
   - **Defaulting:** `normalizeStreamRecord` replaces missing scalar fields with sensible defaults (`"Untitled stream"` for name, `0` for numeric values, empty strings for identifiers, and an empty array for `timeline`).
   - **Safety:** Stellar addresses (`recipientAddress` and `treasuryAddress`) are strictly sanitized via `sanitizeStellarAddress`. If they are invalid, they are wiped to an empty string.
   - **Validation:** In production, any records that fail strict validation criteria are filtered/warned, ensuring the UI won't crash when rendering the page layout.

## Expected Regression Surface

When modifying `StreamDetail.tsx` or its corresponding data services, ensure that:
- The **"Try again"** button remains fully accessible (keyboard navigable) and issues a *new* request instead of relying on external location reloads.
- The **Not Found** state gracefully falls back to showing the `streamId` parameter from the URL in the breadcrumb, since the stream data is absent.
- The `StreamDetail` page does **not** assume all properties are populated perfectly without the `normalizeStreamRecord` layer mediating partial payloads.
- Transitions between valid `streamId` parameters while a request is in-flight properly trigger an `AbortController` to cancel the stale request, avoiding race conditions.
