import { canUseLocalDevBypass, validateRuntimeGuardrails } from '../runtime-guards.js';

// All tests use env parameter injection — no process.env mutation needed.

describe('canUseLocalDevBypass', () => {
  test('Test 1: returns true when NODE_ENV=development, LOCAL_DEV=true, no prod indicators', () => {
    const env = { NODE_ENV: 'development', LOCAL_DEV: 'true' };
    expect(canUseLocalDevBypass(env)).toBe(true);
  });

  test('Test 1b: returns false when NODE_ENV is not development', () => {
    const env = { NODE_ENV: 'production', LOCAL_DEV: 'true' };
    expect(canUseLocalDevBypass(env)).toBe(false);
  });

  test('Test 1c: returns false when GCS_BUCKET is set (production indicator)', () => {
    const env = { NODE_ENV: 'development', LOCAL_DEV: 'true', GCS_BUCKET: 'my-prod-bucket' };
    expect(canUseLocalDevBypass(env)).toBe(false);
  });

  test('Test 1d: returns false when GOOGLE_CLOUD_PROJECT is set (production indicator)', () => {
    const env = { NODE_ENV: 'development', LOCAL_DEV: 'true', GOOGLE_CLOUD_PROJECT: 'my-project' };
    expect(canUseLocalDevBypass(env)).toBe(false);
  });

  test('Test 1e: returns false when LOCAL_DEV is not set', () => {
    const env = { NODE_ENV: 'development' };
    expect(canUseLocalDevBypass(env)).toBe(false);
  });
});

describe('validateRuntimeGuardrails', () => {
  test('Test 2: returns startup-failure when LOCAL_DEV=true in non-development env', () => {
    const env = { NODE_ENV: 'production', LOCAL_DEV: 'true' };
    const result = validateRuntimeGuardrails(env);

    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
    expect(result.values).toBeDefined();
    expect(result.values.NODE_ENV).toBe('production');
  });

  test('Test 2b: returns startup-failure when LOCAL_DEV=true with GCS_BUCKET set', () => {
    const env = { NODE_ENV: 'development', LOCAL_DEV: 'true', GCS_BUCKET: 'some-bucket' };
    const result = validateRuntimeGuardrails(env);

    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  test('Test 3: exposes structured diagnostic values for startup warning logs', () => {
    const env = { NODE_ENV: 'development', LOCAL_DEV: 'true' };
    const result = validateRuntimeGuardrails(env);

    expect(result.ok).toBe(true);
    expect(result.bypass).toBe(true);
    expect(result.values).toHaveProperty('NODE_ENV', 'development');
    expect(result.values).toHaveProperty('LOCAL_DEV', 'true');
    expect(result.values).toHaveProperty('GCS_BUCKET');
  });

  test('Test 3b: ok=true with bypass=false when no LOCAL_DEV flag in production', () => {
    const env = { NODE_ENV: 'production', GCS_BUCKET: 'prod-bucket' };
    const result = validateRuntimeGuardrails(env);

    expect(result.ok).toBe(true);
    expect(result.bypass).toBe(false);
    expect(result.values).toBeDefined();
  });

  test('Test 3c: ok=true bypass=false for standard production config', () => {
    const env = { NODE_ENV: 'production' };
    const result = validateRuntimeGuardrails(env);

    expect(result.ok).toBe(true);
    expect(result.bypass).toBe(false);
  });
});
