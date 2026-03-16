/**
 * TDD tests for centralized validation contract.
 *
 * Test 1: Malformed payload shape returns 400 with { error, code, details } format.
 * Test 2: Semantically invalid-but-well-formed payload returns 422 with same error shape.
 * Test 3: Unknown body keys are rejected on admin/mutating schemas.
 */

import { validateRequest } from '../../middleware/validate-request.js';
import { schemas } from '../schemas.js';

// Helper to create a minimal mock request/response/next triple.
function mockRPC(body = {}) {
  const req = { body };
  const res = {
    _status: null,
    _body: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(data) {
      this._body = data;
      return this;
    },
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };
  return { req, res, next: () => { nextCalled = true; }, isNextCalled: () => nextCalled };
}

// ─── Test 1: Malformed payload → 400 { error, code, details } ────────────────

describe('validateRequest — malformed payload shape (400)', () => {
  test('Test 1a: null body field where object expected returns 400 with standard error shape', () => {
    const middleware = validateRequest(schemas.addAdmin);
    const { req, res, next, isNextCalled } = mockRPC({ firebaseUid: null });

    middleware(req, res, next);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: expect.any(String),
      code: expect.any(String),
      details: expect.any(Array),
    });
    expect(isNextCalled()).toBe(false);
  });

  test('Test 1b: completely empty body on required-fields schema returns 400', () => {
    const middleware = validateRequest(schemas.addAdmin);
    const { req, res, next, isNextCalled } = mockRPC({});

    middleware(req, res, next);

    expect(res._status).toBe(400);
    expect(res._body.code).toBeDefined();
    expect(res._body.details).toBeInstanceOf(Array);
    expect(isNextCalled()).toBe(false);
  });

  test('Test 1c: wrong type for required field returns 400', () => {
    const middleware = validateRequest(schemas.postMatch);
    // type must be 'singles' | 'doubles', passing a number is wrong shape
    const { req, res, next, isNextCalled } = mockRPC({
      type: 99,
      winners: ['p1'],
      losers: ['p2'],
      scoreWinner: 21,
      scoreLoser: 15,
    });

    middleware(req, res, next);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({ error: expect.any(String), code: expect.any(String), details: expect.any(Array) });
    expect(isNextCalled()).toBe(false);
  });
});

// ─── Test 2: Semantically invalid but well-formed → 422 ──────────────────────

describe('validateRequest — semantic violations (422)', () => {
  test('Test 2a: scoreWinner and scoreLoser both zero (domain-invalid) returns 422', () => {
    const middleware = validateRequest(schemas.postMatch);
    const { req, res, next, isNextCalled } = mockRPC({
      type: 'singles',
      winners: ['p1'],
      losers: ['p2'],
      scoreWinner: 0,
      scoreLoser: 0,
    });

    middleware(req, res, next);

    expect(res._status).toBe(422);
    expect(res._body).toMatchObject({ error: expect.any(String), code: expect.any(String), details: expect.any(Array) });
    expect(isNextCalled()).toBe(false);
  });

  test('Test 2b: reset with invalid mode value returns 422', () => {
    const middleware = validateRequest(schemas.reset);
    const { req, res, next, isNextCalled } = mockRPC({ mode: 'invalid-mode' });

    middleware(req, res, next);

    expect(res._status).toBe(422);
    expect(res._body).toMatchObject({ error: expect.any(String), code: expect.any(String), details: expect.any(Array) });
    expect(isNextCalled()).toBe(false);
  });
});

// ─── Test 3: Unknown keys rejected on strict schemas ─────────────────────────

describe('validateRequest — unknown key rejection (strict mode)', () => {
  test('Test 3a: unknown field on addAdmin schema returns 400', () => {
    const middleware = validateRequest(schemas.addAdmin);
    const { req, res, next, isNextCalled } = mockRPC({
      firebaseUid: 'uid123',
      __proto__: {},           // prototype pollution attempt
      injectedField: 'evil',
    });

    middleware(req, res, next);

    expect(res._status).toBe(400);
    expect(isNextCalled()).toBe(false);
  });

  test('Test 3b: unknown field on postMatch schema returns 400', () => {
    const middleware = validateRequest(schemas.postMatch);
    const { req, res, next, isNextCalled } = mockRPC({
      type: 'singles',
      winners: ['p1'],
      losers: ['p2'],
      scoreWinner: 21,
      scoreLoser: 15,
      ADMIN_OVERRIDE: true,  // unknown key
    });

    middleware(req, res, next);

    expect(res._status).toBe(400);
    expect(isNextCalled()).toBe(false);
  });

  test('Test 3c: valid payload with no unknown keys calls next()', () => {
    const middleware = validateRequest(schemas.addAdmin);
    const { req, res, next, isNextCalled } = mockRPC({ firebaseUid: 'uid123' });

    middleware(req, res, next);

    expect(isNextCalled()).toBe(true);
    expect(res._status).toBeNull();
  });
});
