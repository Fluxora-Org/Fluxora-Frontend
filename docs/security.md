# Security Model

## Admin Override Operations

The contract exposes three admin-only entrypoints that mirror the sender-facing
lifecycle operations: `admin_pause`, `admin_resume`, and `admin_cancel`.

### Authentication Guarantees

- Every admin entrypoint calls `admin.require_auth()` before any state mutation.
- Any caller that is not the initialized admin address will receive an
  `Unauthorized` / `NotAdmin` error. There is no fallback or bypass path.
- Spoofed or unrelated addresses are rejected identically to non-admin callers.

### Terminal State Protections

Once a stream reaches a terminal state it cannot be mutated by any caller,
including the admin.

| Terminal State | admin_pause | admin_resume | admin_cancel |
|----------------|-------------|--------------|--------------|
| Cancelled      | ❌ Fails (`StreamTerminated`) | ❌ Fails | ❌ Fails |
| Completed      | ❌ Fails (`StreamTerminated`) | ❌ Fails | ❌ Fails |
| Expired (time) | ❌ Fails    | ❌ Fails     | Matches sender path |

### Admin Override Limitations

| Stream State | admin_pause | admin_resume | admin_cancel |
|--------------|-------------|--------------|--------------|
| Active       | ✅ → Paused  | ❌ `StreamNotPaused` | ✅ → Cancelled |
| Paused       | ❌ `StreamAlreadyPaused` | ✅ → Active | ✅ → Cancelled |
| Terminal     | ❌ `StreamTerminated` | ❌ `StreamTerminated` | ❌ `StreamTerminated` |

### Semantic Consistency

Admin override entrypoints produce identical final states to their sender
counterparts:

- `admin_pause` ≡ `pause_stream` (resulting state: `Paused`)
- `admin_resume` ≡ `resume_stream` (resulting state: `Active`)
- `admin_cancel` ≡ `cancel_stream` (resulting state: `Cancelled`)

The only difference is the authentication check: admin overrides authenticate
against the admin address, while sender operations authenticate against the
stream's original sender.

### Missing Stream Handling

Calling any admin entrypoint with a non-existent `stream_id` returns
`StreamNotFound` without panicking. No storage is written on failure paths.
