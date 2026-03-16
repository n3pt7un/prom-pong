/**
 * Centralized validation schemas for high-risk mutating and admin routes.
 *
 * Each schema describes:
 *   - required: field names that must be present with a non-null value
 *   - optional: field names that are permitted but not required
 *   - types: expected typeof for each field
 *   - enums: allowed literal values for constrained fields
 *   - semanticRules: domain-level checks beyond shape (return string on violation)
 *   - strict: when true, unknown keys cause a 400 rejection
 *
 * Schemas do NOT change auth middleware order or success response payloads.
 */

export const schemas = {

  // POST /api/admin/admins — add admin by Firebase UID
  addAdmin: {
    strict: true,
    required: ['firebaseUid'],
    optional: [],
    types: {
      firebaseUid: 'string',
    },
    enums: {},
    semanticRules: [],
  },

  // PUT /api/admin/users/:playerId — update player fields
  updateUser: {
    strict: true,
    required: [],
    optional: [
      'name', 'avatar', 'bio',
      'eloSingles', 'eloDoubles',
      'winsSingles', 'lossesSingles', 'streakSingles',
      'winsDoubles', 'lossesDoubles', 'streakDoubles',
      'leagueId', 'mainRacketId',
    ],
    types: {
      name: 'string',
      avatar: 'string',
      bio: 'string',
      eloSingles: 'number',
      eloDoubles: 'number',
      winsSingles: 'number',
      lossesSingles: 'number',
      streakSingles: 'number',
      winsDoubles: 'number',
      lossesDoubles: 'number',
      streakDoubles: 'number',
      leagueId: 'string',
      mainRacketId: 'string',
    },
    enums: {},
    semanticRules: [],
  },

  // POST /api/admin/leagues — create league
  createLeague: {
    strict: true,
    required: ['name'],
    optional: ['description'],
    types: {
      name: 'string',
      description: 'string',
    },
    enums: {},
    semanticRules: [
      (body) => {
        if (typeof body.name === 'string' && !body.name.trim()) {
          return { field: 'name', message: 'League name must not be blank' };
        }
        return null;
      },
    ],
  },

  // PUT /api/admin/leagues/:leagueId — update league
  updateLeague: {
    strict: true,
    required: [],
    optional: ['name', 'description'],
    types: {
      name: 'string',
      description: 'string',
    },
    enums: {},
    semanticRules: [],
  },

  // POST /api/matches — log a new match
  postMatch: {
    strict: true,
    required: ['type', 'winners', 'losers', 'scoreWinner', 'scoreLoser'],
    optional: ['isFriendly', 'matchFormat', 'leagueId'],
    types: {
      type: 'string',
      winners: 'array',
      losers: 'array',
      scoreWinner: 'number',
      scoreLoser: 'number',
      isFriendly: 'boolean',
      matchFormat: 'string',
      leagueId: 'string',
    },
    enums: {
      type: ['singles', 'doubles'],
      matchFormat: ['standard11', 'vintage21'],
    },
    semanticRules: [
      (body) => {
        const sw = body.scoreWinner;
        const sl = body.scoreLoser;
        if (typeof sw === 'number' && typeof sl === 'number' && sw === 0 && sl === 0) {
          return { field: 'scoreWinner', message: 'A match cannot end 0-0' };
        }
        return null;
      },
      (body) => {
        const sw = body.scoreWinner;
        const sl = body.scoreLoser;
        if (typeof sw === 'number' && typeof sl === 'number' && sw === sl) {
          return { field: 'scoreWinner', message: 'Draws are not allowed' };
        }
        return null;
      },
    ],
  },

  // PUT /api/matches/:id — update a match
  putMatch: {
    strict: true,
    required: ['winners', 'losers', 'scoreWinner', 'scoreLoser'],
    optional: [],
    types: {
      winners: 'array',
      losers: 'array',
      scoreWinner: 'number',
      scoreLoser: 'number',
    },
    enums: {},
    semanticRules: [
      (body) => {
        const sw = body.scoreWinner;
        const sl = body.scoreLoser;
        if (typeof sw === 'number' && typeof sl === 'number' && sw === sl) {
          return { field: 'scoreWinner', message: 'Draws are not allowed' };
        }
        return null;
      },
    ],
  },

  // POST /api/import — bulk data import (admin only)
  importData: {
    strict: true,
    required: ['players', 'matches'],
    optional: ['history', 'rackets'],
    types: {
      players: 'array',
      matches: 'array',
      history: 'array',
      rackets: 'array',
    },
    enums: {},
    semanticRules: [],
  },

  // POST /api/reset — reset league data (admin only)
  reset: {
    strict: true,
    required: [],
    optional: ['mode'],
    types: {
      mode: 'string',
    },
    enums: {
      mode: ['season', 'fresh', 'seed'],
    },
    semanticRules: [
      (body) => {
        // If mode is present it must be one of the valid enum values (handled by enum check),
        // but if it's explicitly set to something else that's a domain error.
        if (body.mode !== undefined && !['season', 'fresh', 'seed'].includes(body.mode)) {
          return { field: 'mode', message: `Invalid reset mode: "${body.mode}". Allowed: season, fresh, seed` };
        }
        return null;
      },
    ],
  },
};
