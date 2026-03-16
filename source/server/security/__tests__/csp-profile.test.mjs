/**
 * Tests for csp-profile.js
 *
 * Behavior:
 * - Test 1: Generated directives include required Firebase popup/auth origins for
 *   script-src and frame-src.
 * - Test 2: Profile supports staged hardening toggle to remove unsafe-eval when enabled.
 * - Test 3: Existing auth popup flow compatibility directives remain present in default profile.
 */
import { buildCspDirectives } from '../csp-profile.js';

describe('buildCspDirectives — Firebase popup compatibility', () => {
  test('Test 1a: script-src includes apis.google.com', () => {
    const directives = buildCspDirectives();
    expect(directives.scriptSrc).toContain('https://apis.google.com');
  });

  test('Test 1b: script-src includes firebaseapp.com wildcard', () => {
    const directives = buildCspDirectives();
    const hasFirebase = directives.scriptSrc.some((s) => s.includes('firebaseapp.com'));
    expect(hasFirebase).toBe(true);
  });

  test('Test 1c: frame-src includes accounts.google.com', () => {
    const directives = buildCspDirectives();
    expect(directives.frameSrc).toContain('https://accounts.google.com');
  });

  test('Test 1d: frame-src includes firebaseapp.com for auth popup', () => {
    const directives = buildCspDirectives();
    const hasFirebase = directives.frameSrc.some((s) => s.includes('firebaseapp.com'));
    expect(hasFirebase).toBe(true);
  });
});

describe('buildCspDirectives — staged hardening toggle', () => {
  test('Test 2a: default profile includes unsafe-eval in script-src (compatibility baseline)', () => {
    const directives = buildCspDirectives({ hardenedProfile: false });
    expect(directives.scriptSrc).toContain("'unsafe-eval'");
  });

  test('Test 2b: hardened profile removes unsafe-eval from script-src', () => {
    const directives = buildCspDirectives({ hardenedProfile: true });
    expect(directives.scriptSrc).not.toContain("'unsafe-eval'");
  });

  test('Test 2c: hardened profile still includes required Firebase origins', () => {
    const directives = buildCspDirectives({ hardenedProfile: true });
    expect(directives.scriptSrc).toContain('https://apis.google.com');
    const hasFirebase = directives.frameSrc.some((s) => s.includes('firebaseapp.com'));
    expect(hasFirebase).toBe(true);
  });
});

describe('buildCspDirectives — default profile compatibility', () => {
  test('Test 3a: default-src is self', () => {
    const directives = buildCspDirectives();
    expect(directives.defaultSrc).toContain("'self'");
  });

  test('Test 3b: script-src includes unsafe-inline for auth popup compatibility', () => {
    const directives = buildCspDirectives();
    expect(directives.scriptSrc).toContain("'unsafe-inline'");
  });

  test('Test 3c: style-src includes Google Fonts', () => {
    const directives = buildCspDirectives();
    const hasGoogleFonts = directives.styleSrc.some((s) => s.includes('fonts.googleapis.com'));
    expect(hasGoogleFonts).toBe(true);
  });

  test('Test 3d: font-src includes Google Fonts static', () => {
    const directives = buildCspDirectives();
    const hasGstaticFonts = directives.fontSrc.some((s) => s.includes('fonts.gstatic.com'));
    expect(hasGstaticFonts).toBe(true);
  });

  test('Test 3e: returns an object (not null/undefined)', () => {
    const directives = buildCspDirectives();
    expect(directives).toBeTruthy();
    expect(typeof directives).toBe('object');
  });
});
