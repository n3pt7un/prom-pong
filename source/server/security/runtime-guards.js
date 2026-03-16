/**
 * Centralized runtime guardrail contract for local-dev bypass.
 *
 * Functions accept an optional `env` parameter (defaults to process.env) so
 * they can be tested without module cache manipulation or ESM re-imports.
 */

/**
 * Returns true only when all three conditions are met:
 *   1. NODE_ENV === 'development'
 *   2. LOCAL_DEV === 'true'
 *   3. No production indicators present (GCS_BUCKET, GOOGLE_CLOUD_PROJECT,
 *      NODE_ENV === 'production')
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {boolean}
 */
export function canUseLocalDevBypass(env = process.env) {
  const isDev = env.NODE_ENV === 'development';
  const isLocalDev = env.LOCAL_DEV === 'true';
  const hasProdIndicators =
    !!env.GCS_BUCKET ||
    env.NODE_ENV === 'production' ||
    !!env.GOOGLE_CLOUD_PROJECT;
  return isDev && isLocalDev && !hasProdIndicators;
}

/**
 * Evaluates startup safety and returns a structured result.
 *
 * Returns { ok: false, reason, values } when an unsafe combination is detected.
 * Returns { ok: true, bypass, values } otherwise.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ ok: boolean, reason?: string, bypass?: boolean, values: object }}
 */
export function validateRuntimeGuardrails(env = process.env) {
  const isDev = env.NODE_ENV === 'development';
  const isLocalDev = env.LOCAL_DEV === 'true';
  const hasProdIndicators =
    !!env.GCS_BUCKET ||
    env.NODE_ENV === 'production' ||
    !!env.GOOGLE_CLOUD_PROJECT;

  const values = {
    NODE_ENV: env.NODE_ENV,
    LOCAL_DEV: env.LOCAL_DEV,
    GCS_BUCKET: env.GCS_BUCKET,
  };

  if (isLocalDev && !isDev) {
    return {
      ok: false,
      reason:
        'LOCAL_DEV=true is only allowed in NODE_ENV=development. Current NODE_ENV: ' +
        (env.NODE_ENV || 'undefined'),
      values,
    };
  }

  if (isLocalDev && hasProdIndicators) {
    return {
      ok: false,
      reason:
        'LOCAL_DEV=true cannot be combined with production indicators (GCS_BUCKET or GOOGLE_CLOUD_PROJECT).',
      values,
    };
  }

  return {
    ok: true,
    bypass: canUseLocalDevBypass(env),
    values,
  };
}
