/**
 * TDD tests for centralized validation boundary behavior on high-risk routes.
 *
 * Test 1: Malformed payloads for representative admin/matches/import mutations
 *         return 400 with code/details contract.
 * Test 2: Semantically invalid payloads return 422 where schema marks
 *         domain-level failures.
 * Test 3: Unknown fields are rejected and valid payloads pass through.
 *
 * Strategy: exercise validateRequest middleware with representative schemas
 * to confirm boundary contracts — status codes, error code strings, details
 * arrays — are consistently enforced across routes.
 */

import { validateRequest } from '../middleware/validate-request.js';
import { schemas } from '../validation/schemas.js';

// ─── Test helper ─────────────────────────────────────────────────────────────

function invoke(schema, body) {
  const req = { body };
  const res = {
    _status: null,
    _body: null,
    status(code) { this._status = code; return this; },
    json(data) { this._body = data; return this; },
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };
  validateRequest(schema)(req, res, next);
  return { status: res._status, body: res._body, nextCalled };
}

// ─── Error contract shape assertion ──────────────────────────────────────────

function assert4xxContract(result, expectedStatus) {
  expect(result.status).toBe(expectedStatus);
  expect(result.body).toBeDefined();
  expect(typeof result.body.error).toBe('string');
  expect(typeof result.body.code).toBe('string');
  expect(result.body.code.length).toBeGreaterThan(0);
  expect(Array.isArray(result.body.details)).toBe(true);
  expect(result.body.details.length).toBeGreaterThan(0);
  expect(result.nextCalled).toBe(false);
}

// ─── Test 1: Malformed payloads return 400 with code/details ─────────────────

describe('Test 1 — Malformed payloads return 400 with error/code/details', () => {

  test('1a: POST /admin/admins — missing firebaseUid returns 400 with full contract', () => {
    const result = invoke(schemas.addAdmin, {});
    assert4xxContract(result, 400);
    expect(result.body.code).toBe('VALIDATION_ERROR');
    expect(result.body.details.some(d => d.field === 'firebaseUid')).toBe(true);
  });

  test('1b: POST /admin/admins — firebaseUid as number (wrong type) returns 400', () => {
    const result = invoke(schemas.addAdmin, { firebaseUid: 12345 });
    assert4xxContract(result, 400);
    expect(result.body.details.some(d => d.field === 'firebaseUid')).toBe(true);
  });

  test('1c: POST /matches — missing required winners array returns 400', () => {
    const result = invoke(schemas.postMatch, {
      type: 'singles',
      losers: ['p2'],
      scoreWinner: 21,
      scoreLoser: 15,
    });
    assert4xxContract(result, 400);
    expect(result.body.details.some(d => d.field === 'winners')).toBe(true);
  });

  test('1d: POST /matches — scoreWinner as string (wrong type) returns 400', () => {
    const result = invoke(schemas.postMatch, {
      type: 'singles',
      winners: ['p1'],
      losers: ['p2'],
      scoreWinner: '21',
      scoreLoser: 15,
    });
    assert4xxContract(result, 400);
    expect(result.body.details.some(d => d.field === 'scoreWinner')).toBe(true);
  });

  test('1e: POST /import — missing players array returns 400 with contract', () => {
    const result = invoke(schemas.importData, { matches: [] });
    assert4xxContract(result, 400);
    expect(result.body.details.some(d => d.field === 'players')).toBe(true);
  });

  test('1f: POST /import — players as object not array returns 400', () => {
    const result = invoke(schemas.importData, { players: {}, matches: [] });
    assert4xxContract(result, 400);
    expect(result.body.details.some(d => d.field === 'players')).toBe(true);
  });

  test('1g: PUT /matches — missing losers field returns 400', () => {
    const result = invoke(schemas.putMatch, {
      winners: ['p1'],
      scoreWinner: 21,
      scoreLoser: 15,
    });
    assert4xxContract(result, 400);
    expect(result.body.details.some(d => d.field === 'losers')).toBe(true);
  });

  test('1h: POST /admin/leagues — missing required name returns 400', () => {
    const result = invoke(schemas.createLeague, {});
    assert4xxContract(result, 400);
    expect(result.body.details.some(d => d.field === 'name')).toBe(true);
  });
});

// ─── Test 2: Semantically invalid payloads return 422 ────────────────────────

describe('Test 2 — Semantically invalid payloads return 422 (SEMANTIC_ERROR)', () => {

  test('2a: POST /matches — invalid type enum returns 422', () => {
    const result = invoke(schemas.postMatch, {
      type: 'triples',
      winners: ['p1'],
      losers: ['p2'],
      scoreWinner: 21,
      scoreLoser: 15,
    });
    assert4xxContract(result, 422);
    expect(result.body.code).toBe('SEMANTIC_ERROR');
    expect(result.body.details.some(d => d.field === 'type')).toBe(true);
  });

  test('2b: POST /matches — invalid matchFormat enum returns 422', () => {
    const result = invoke(schemas.postMatch, {
      type: 'singles',
      winners: ['p1'],
      losers: ['p2'],
      scoreWinner: 21,
      scoreLoser: 15,
      matchFormat: 'ultra21',
    });
    assert4xxContract(result, 422);
    expect(result.body.code).toBe('SEMANTIC_ERROR');
    expect(result.body.details.some(d => d.field === 'matchFormat')).toBe(true);
  });

  test('2c: POST /matches — 0-0 score is domain invalid, returns 422', () => {
    const result = invoke(schemas.postMatch, {
      type: 'singles',
      winners: ['p1'],
      losers: ['p2'],
      scoreWinner: 0,
      scoreLoser: 0,
    });
    assert4xxContract(result, 422);
    expect(result.body.code).toBe('SEMANTIC_ERROR');
  });

  test('2d: POST /matches — draw (equal scores) returns 422', () => {
    const result = invoke(schemas.postMatch, {
      type: 'singles',
      winners: ['p1'],
      losers: ['p2'],
      scoreWinner: 11,
      scoreLoser: 11,
    });
    assert4xxContract(result, 422);
    expect(result.body.code).toBe('SEMANTIC_ERROR');
  });

  test('2e: POST /reset — invalid mode string returns 422', () => {
    const result = invoke(schemas.reset, { mode: 'wipe-everything' });
    assert4xxContract(result, 422);
    expect(result.body.code).toBe('SEMANTIC_ERROR');
    expect(result.body.details.some(d => d.field === 'mode')).toBe(true);
  });

  test('2f: POST /admin/leagues — blank name string is domain invalid, returns 422', () => {
    const result = invoke(schemas.createLeague, { name: '   ' });
    assert4xxContract(result, 422);
    expect(result.body.code).toBe('SEMANTIC_ERROR');
    expect(result.body.details.some(d => d.field === 'name')).toBe(true);
  });

  test('2g: PUT /matches — draw returns 422 with SEMANTIC_ERROR code', () => {
    const result = invoke(schemas.putMatch, {
      winners: ['p1'],
      losers: ['p2'],
      scoreWinner: 11,
      scoreLoser: 11,
    });
    assert4xxContract(result, 422);
    expect(result.body.code).toBe('SEMANTIC_ERROR');
  });
});

// ─── Test 3: Unknown fields rejected, valid payloads pass through ─────────────

describe('Test 3 — Unknown fields rejected; valid payloads pass through', () => {

  test('3a: POST /admin/admins — unknown field injected with valid data returns 400', () => {
    const result = invoke(schemas.addAdmin, { firebaseUid: 'uid123', __bypass: true });
    assert4xxContract(result, 400);
    expect(result.body.details.some(d => d.field === '__bypass')).toBe(true);
  });

  test('3b: POST /matches — unknown field injected returns 400', () => {
    const result = invoke(schemas.postMatch, {
      type: 'singles',
      winners: ['p1'],
      losers: ['p2'],
      scoreWinner: 21,
      scoreLoser: 15,
      eloOverride: 9999,
    });
    assert4xxContract(result, 400);
    expect(result.body.details.some(d => d.field === 'eloOverride')).toBe(true);
  });

  test('3c: POST /import — extra unknown field in strict schema returns 400', () => {
    const result = invoke(schemas.importData, {
      players: [],
      matches: [],
      __adminOverride: true,
    });
    assert4xxContract(result, 400);
    expect(result.body.details.some(d => d.field === '__adminOverride')).toBe(true);
  });

  test('3d: PUT /admin/users — unknown field dangerousField rejected', () => {
    const result = invoke(schemas.updateUser, {
      name: 'Alice',
      dangerousField: 'hack',
    });
    assert4xxContract(result, 400);
    expect(result.body.details.some(d => d.field === 'dangerousField')).toBe(true);
  });

  // Valid payload pass-through assertions

  test('3e: valid addAdmin payload calls next()', () => {
    const result = invoke(schemas.addAdmin, { firebaseUid: 'uid_abc123' });
    expect(result.nextCalled).toBe(true);
    expect(result.status).toBeNull();
  });

  test('3f: valid postMatch singles payload calls next()', () => {
    const result = invoke(schemas.postMatch, {
      type: 'singles',
      winners: ['p1'],
      losers: ['p2'],
      scoreWinner: 21,
      scoreLoser: 15,
    });
    expect(result.nextCalled).toBe(true);
    expect(result.status).toBeNull();
  });

  test('3g: valid postMatch doubles with matchFormat calls next()', () => {
    const result = invoke(schemas.postMatch, {
      type: 'doubles',
      winners: ['p1', 'p2'],
      losers: ['p3', 'p4'],
      scoreWinner: 11,
      scoreLoser: 8,
      matchFormat: 'standard11',
      isFriendly: false,
    });
    expect(result.nextCalled).toBe(true);
    expect(result.status).toBeNull();
  });

  test('3h: valid importData with optional history and rackets calls next()', () => {
    const result = invoke(schemas.importData, {
      players: [],
      matches: [],
      history: [],
      rackets: [],
    });
    expect(result.nextCalled).toBe(true);
    expect(result.status).toBeNull();
  });

  test('3i: valid reset with mode=fresh calls next()', () => {
    const result = invoke(schemas.reset, { mode: 'fresh' });
    expect(result.nextCalled).toBe(true);
    expect(result.status).toBeNull();
  });

  test('3j: valid createLeague payload calls next()', () => {
    const result = invoke(schemas.createLeague, { name: 'Pro League', description: 'Ranked play' });
    expect(result.nextCalled).toBe(true);
    expect(result.status).toBeNull();
  });

  test('3k: valid updateUser with partial allowed fields calls next()', () => {
    const result = invoke(schemas.updateUser, { name: 'Bob', eloSingles: 1350 });
    expect(result.nextCalled).toBe(true);
    expect(result.status).toBeNull();
  });

  test('3l: empty body for reset (mode is optional) calls next()', () => {
    const result = invoke(schemas.reset, {});
    expect(result.nextCalled).toBe(true);
    expect(result.status).toBeNull();
  });
});
