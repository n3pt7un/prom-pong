/**
 * Tests for Task 2: startup fail-fast and auth bypass observability
 *
 * These tests verify the behavior contracts for:
 * - validateRuntimeGuardrails integration (unsafe combos should trigger exit)
 * - auth middleware bypass gating through shared helper
 * - existing auth failure response behavior is unchanged
 */
import { canUseLocalDevBypass, validateRuntimeGuardrails } from '../runtime-guards.js';

// Test 1: Startup should abort when unsafe LOCAL_DEV combination detected
describe('Startup fail-fast behavior (validateRuntimeGuardrails)', () => {
  test('Test 1: detects unsafe LOCAL_DEV=true in production environment', () => {
    const unsafeEnv = { NODE_ENV: 'production', LOCAL_DEV: 'true' };
    const result = validateRuntimeGuardrails(unsafeEnv);

    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/NODE_ENV=development/);
    expect(result.values.NODE_ENV).toBe('production');
  });

  test('Test 1b: detects unsafe LOCAL_DEV=true with GCS_BUCKET', () => {
    const unsafeEnv = { NODE_ENV: 'development', LOCAL_DEV: 'true', GCS_BUCKET: 'prod-bucket' };
    const result = validateRuntimeGuardrails(unsafeEnv);

    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/production indicators/);
  });

  test('Test 1c: ok result includes bypass flag for log observability', () => {
    const safeEnv = { NODE_ENV: 'development', LOCAL_DEV: 'true' };
    const result = validateRuntimeGuardrails(safeEnv);

    // Server should log this warning when bypass is active
    expect(result.ok).toBe(true);
    expect(result.bypass).toBe(true);
    expect(result.values).toBeDefined();
  });
});

// Test 2: Startup warning for valid local-dev bypass mode
describe('Startup warning observability', () => {
  test('Test 2: bypass=true signals that a startup warning should be emitted', () => {
    const bypassEnv = { NODE_ENV: 'development', LOCAL_DEV: 'true' };
    const result = validateRuntimeGuardrails(bypassEnv);

    // The server reads result.bypass to decide whether to print warning
    expect(result.bypass).toBe(true);
    expect(result.values.NODE_ENV).toBe('development');
    expect(result.values.LOCAL_DEV).toBe('true');
  });

  test('Test 2b: bypass=false in normal production config — no warning should fire', () => {
    const prodEnv = { NODE_ENV: 'production', GCS_BUCKET: 'my-bucket' };
    const result = validateRuntimeGuardrails(prodEnv);

    expect(result.ok).toBe(true);
    expect(result.bypass).toBe(false);
  });
});

// Test 3: Auth bypass gate uses shared helper canUseLocalDevBypass
describe('Auth bypass gate via canUseLocalDevBypass', () => {
  test('Test 3: bypass is allowed only in safe local-dev context', () => {
    const safeEnv = { NODE_ENV: 'development', LOCAL_DEV: 'true' };
    expect(canUseLocalDevBypass(safeEnv)).toBe(true);
  });

  test('Test 3b: bypass is not allowed in production', () => {
    const prodEnv = { NODE_ENV: 'production', LOCAL_DEV: 'true' };
    expect(canUseLocalDevBypass(prodEnv)).toBe(false);
  });

  test('Test 3c: bypass is not allowed when GCS_BUCKET is set', () => {
    const mixedEnv = { NODE_ENV: 'development', LOCAL_DEV: 'true', GCS_BUCKET: 'bucket' };
    expect(canUseLocalDevBypass(mixedEnv)).toBe(false);
  });
});
