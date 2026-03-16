/**
 * TDD tests for validation middleware on admin mutation routes.
 *
 * Test 1: Invalid admin mutation payloads fail before dbOps mutation calls.
 * Test 2: Invalid match payloads fail with consistent 4xx contract.
 * Test 3: Valid payloads continue existing success behavior.
 *
 * Strategy: test the validateRequest middleware directly with admin/match schemas
 * (the actual wiring is verified by syntax check and integration).
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

// ─── Test 1: Invalid admin payloads fail before handler ──────────────────────

describe('Admin route validation — invalid payloads rejected before handler', () => {
  test('Test 1a: POST /admin/admins — missing firebaseUid returns 400', () => {
    const { req, res, next, isNextCalled } = mockRPC({});
    validateRequest(schemas.addAdmin)(req, res, next);
    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({ error: expect.any(String), code: expect.any(String), details: expect.any(Array) });
    expect(isNextCalled()).toBe(false);
  });

  test('Test 1b: PUT /admin/users — unknown field injected is rejected', () => {
    const { req, res, next, isNextCalled } = mockRPC({ name: 'Alice', dangerousField: 'hack' });
    validateRequest(schemas.updateUser)(req, res, next);
    expect(res._status).toBe(400);
    expect(isNextCalled()).toBe(false);
  });

  test('Test 1c: POST /admin/leagues — empty name returns 422 semantic error', () => {
    const { req, res, next, isNextCalled } = mockRPC({ name: '   ' });
    validateRequest(schemas.createLeague)(req, res, next);
    expect(res._status).toBe(422);
    expect(res._body.details.some(d => d.field === 'name')).toBe(true);
    expect(isNextCalled()).toBe(false);
  });

  test('Test 1d: POST /admin/leagues — unknown key on strict schema returns 400', () => {
    const { req, res, next, isNextCalled } = mockRPC({ name: 'League X', adminBypass: true });
    validateRequest(schemas.createLeague)(req, res, next);
    expect(res._status).toBe(400);
    expect(isNextCalled()).toBe(false);
  });
});

// ─── Test 2: Invalid match payloads fail with consistent 4xx ─────────────────

describe('Matches route validation — consistent 4xx contract', () => {
  test('Test 2a: POST /matches — missing required type returns 400', () => {
    const { req, res, next, isNextCalled } = mockRPC({
      winners: ['p1'], losers: ['p2'], scoreWinner: 21, scoreLoser: 15,
    });
    validateRequest(schemas.postMatch)(req, res, next);
    expect(res._status).toBe(400);
    expect(isNextCalled()).toBe(false);
  });

  test('Test 2b: POST /matches — invalid enum for type returns 422', () => {
    const { req, res, next, isNextCalled } = mockRPC({
      type: 'triples',
      winners: ['p1'], losers: ['p2'], scoreWinner: 21, scoreLoser: 15,
    });
    validateRequest(schemas.postMatch)(req, res, next);
    expect(res._status).toBe(422);
    expect(isNextCalled()).toBe(false);
  });

  test('Test 2c: PUT /matches — unknown field in update returns 400', () => {
    const { req, res, next, isNextCalled } = mockRPC({
      winners: ['p1'], losers: ['p2'], scoreWinner: 21, scoreLoser: 15,
      eloOverride: 9999,
    });
    validateRequest(schemas.putMatch)(req, res, next);
    expect(res._status).toBe(400);
    expect(isNextCalled()).toBe(false);
  });

  test('Test 2d: POST /matches — scoreWinner as string (wrong type) returns 400', () => {
    const { req, res, next, isNextCalled } = mockRPC({
      type: 'singles',
      winners: ['p1'], losers: ['p2'],
      scoreWinner: '21', scoreLoser: 15,
    });
    validateRequest(schemas.postMatch)(req, res, next);
    expect(res._status).toBe(400);
    expect(isNextCalled()).toBe(false);
  });
});

// ─── Test 3: Valid payloads call next() ──────────────────────────────────────

describe('Validation — valid payloads pass through', () => {
  test('Test 3a: valid addAdmin payload calls next()', () => {
    const { req, res, next, isNextCalled } = mockRPC({ firebaseUid: 'uid_abc123' });
    validateRequest(schemas.addAdmin)(req, res, next);
    expect(isNextCalled()).toBe(true);
    expect(res._status).toBeNull();
  });

  test('Test 3b: valid postMatch payload calls next()', () => {
    const { req, res, next, isNextCalled } = mockRPC({
      type: 'singles',
      winners: ['p1'], losers: ['p2'],
      scoreWinner: 21, scoreLoser: 15,
    });
    validateRequest(schemas.postMatch)(req, res, next);
    expect(isNextCalled()).toBe(true);
  });

  test('Test 3c: valid putMatch payload calls next()', () => {
    const { req, res, next, isNextCalled } = mockRPC({
      winners: ['p1'], losers: ['p2'],
      scoreWinner: 21, scoreLoser: 15,
    });
    validateRequest(schemas.putMatch)(req, res, next);
    expect(isNextCalled()).toBe(true);
  });

  test('Test 3d: valid createLeague payload calls next()', () => {
    const { req, res, next, isNextCalled } = mockRPC({ name: 'Summer League', description: 'Hot games' });
    validateRequest(schemas.createLeague)(req, res, next);
    expect(isNextCalled()).toBe(true);
  });

  test('Test 3e: updateUser with only allowed fields calls next()', () => {
    const { req, res, next, isNextCalled } = mockRPC({ name: 'Bob', eloSingles: 1350 });
    validateRequest(schemas.updateUser)(req, res, next);
    expect(isNextCalled()).toBe(true);
  });
});
