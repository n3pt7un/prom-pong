/**
 * Staged CSP directives builder for compatibility-first hardening.
 *
 * Default profile: compatibility-first baseline that preserves Firebase popup
 * login flow (signInWithPopup requires postMessage between app and firebaseapp.com
 * popup, plus googleapis.com for auth SDK).
 *
 * Staged hardening: set `hardenedProfile: true` to remove unsafe-eval without
 * breaking other Firebase popup requirements. Intended for gradual rollout —
 * test in dev/staging before enabling in production.
 *
 * @param {{ hardenedProfile?: boolean }} [options]
 * @returns {import('helmet').ContentSecurityPolicyOptions['directives']}
 */
export function buildCspDirectives({ hardenedProfile = false } = {}) {
  // Core script-src: always include required Firebase/Google auth origins
  const scriptSrcBase = [
    "'self'",
    "'unsafe-inline'",
    'https://apis.google.com',
    'https://*.firebaseapp.com',
  ];

  // unsafe-eval: required by some Firebase SDK internals in the compatibility baseline.
  // Removed in hardened profile once SDK version compatibility is confirmed.
  const scriptSrc = hardenedProfile
    ? scriptSrcBase
    : [...scriptSrcBase, "'unsafe-eval'"];

  return {
    defaultSrc: ["'self'"],
    scriptSrc,
    // frame-src: required for Firebase signInWithPopup flow
    frameSrc: [
      "'self'",
      'https://accounts.google.com',
      'https://*.firebaseapp.com',
    ],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https:'],
  };
}
