/**
 * TDD tests for import/reset mutation boundary validation.
 *
 * Test 1: /api/import rejects malformed payloads and unknown keys with 4xx.
 * Test 2: /api/reset enforces expected mode values and payload constraints.
 * Test 3: Valid import/reset payloads preserve current success behavior (next() called).
 */

import { validateRequest } from '../middleware/validate-request.js';
import { schemas } from '../validation/schemas.js';

function mockRPC(body = {}) {
  const req = { body };
  const res = {
    _status: null,
    _body: null,
    status(code) { this._status = code; return this; },
    json(data) { this._body = data; return this; },
  };
  let nextCalled = false;
  return { req, res, next: () => { nextCalled = true; }, isNextCalled: () => nextCalled };
}

// ─── Test 1: /api/import — malformed/unknown keys rejected ───────────────────

describe('/api/import validation — malformed payloads rejected', () => {
  test('Test 1a: missing players array returns 400', () => {
    const { req, res, next, isNextCalled } = mockRPC({ matches: [] });
    validateRequest(schemas.importData)(req, res, next);
    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({ error: expect.any(String), code: expect.any(String), details: expect.any(Array) });
    expect(isNextCalled()).toBe(false);
  });

  test('Test 1b: missing matches array returns 400', () => {
    const { req, res, next, isNextCalled } = mockRPC({ players: [] });
    validateRequest(schemas.importData)(req, res, next);
    expect(res._status).toBe(400);
    expect(isNextCalled()).toBe(false);
  });

  test('Test 1c: players as object (not array) returns 400', () => {
    const { req, res, next, isNextCalled } = mockRPC({ players: {}, matches: [] });
    validateRequest(schemas.importData)(req, res, next);
    expect(res._status).toBe(400);
    expect(isNextCalled()).toBe(false);
  });

  test('Test 1d: unknown key in import payload returns 400', () => {
    const { req, res, next, isNextCalled } = mockRPC({
      players: [], matches: [], __adminOverride: true,
    });
    validateRequest(schemas.importData)(req, res, next);
    expect(res._status).toBe(400);
    expect(isNextCalled()).toBe(false);
  });
});

// ─── Test 2: /api/reset — mode value constraints ─────────────────────────────

describe('/api/reset validation — mode constraints', () => {
  test('Test 2a: invalid mode string returns 422', () => {
    const { req, res, next, isNextCalled } = mockRPC({ mode: 'wipe-everything' });
    validateRequest(schemas.reset)(req, res, next);
    expect(res._status).toBe(422);
    expect(res._body).toMatchObject({ error: expect.any(String), code: expect.any(String), details: expect.any(Array) });
    expect(isNextCalled()).toBe(false);
  });

  test('Test 2b: mode as number (wrong type) returns 400', () => {
    const { req, res, next, isNextCalled } = mockRPC({ mode: 42 });
    validateRequest(schemas.reset)(req, res, next);
    expect(res._status).toBe(400);
    expect(isNextCalled()).toBe(false);
  });

  test('Test 2c: unknown key in reset payload returns 400', () => {
    const { req, res, next, isNextCalled } = mockRPC({ mode: 'season', confirm: true });
    validateRequest(schemas.reset)(req, res, next);
    expect(res._status).toBe(400);
    expect(isNextCalled()).toBe(false);
  });

  test('Test 2d: empty body (no mode) is valid (mode is optional) — calls next()', () => {
    const { req, res, next, isNextCalled } = mockRPC({});
    validateRequest(schemas.reset)(req, res, next);
    expect(isNextCalled()).toBe(true);
  });
});

// ─── Test 3: Valid payloads call next() ──────────────────────────────────────

describe('Import/reset validation — valid payloads pass through', () => {
  test('Test 3a: valid import payload (players+matches) calls next()', () => {
    const { req, res, next, isNextCalled } = mockRPC({ players: [], matches: [] });
    validateRequest(schemas.importData)(req, res, next);
    expect(isNextCalled()).toBe(true);
  });

  test('Test 3b: valid import with history and rackets calls next()', () => {
    const { req, res, next, isNextCalled } = mockRPC({ players: [], matches: [], history: [], rackets: [] });
    validateRequest(schemas.importData)(req, res, next);
    expect(isNextCalled()).toBe(true);
  });

  test('Test 3c: reset with mode=season calls next()', () => {
    const { req, res, next, isNextCalled } = mockRPC({ mode: 'season' });
    validateRequest(schemas.reset)(req, res, next);
    expect(isNextCalled()).toBe(true);
  });

  test('Test 3d: reset with mode=fresh calls next()', () => {
    const { req, res, next, isNextCalled } = mockRPC({ mode: 'fresh' });
    validateRequest(schemas.reset)(req, res, next);
    expect(isNextCalled()).toBe(true);
  });

  test('Test 3e: reset with mode=seed calls next()', () => {
    const { req, res, next, isNextCalled } = mockRPC({ mode: 'seed' });
    validateRequest(schemas.reset)(req, res, next);
    expect(isNextCalled()).toBe(true);
  });
});
