/**
 * Flag indicating whether the application is running in local development mode.
 * Evaluates to `true` in local development / test environments and `false` in production builds.
 */
export const IS_DEV = !!import.meta.env.DEV;
