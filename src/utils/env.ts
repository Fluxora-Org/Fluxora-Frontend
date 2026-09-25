/**
 * Flag indicating whether the application is running in local development mode.
 * Evaluates to `true` in local development / test environments and `false` in production builds.
 *
 * Re-exported from the config module so this file never reads
 * `import.meta.env` directly (see issue #1722).
 */
export { IS_DEV } from "../lib/config";
