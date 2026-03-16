/**
 * Centralized request validation middleware factory.
 *
 * Usage:
 *   import { validateRequest } from '../middleware/validate-request.js';
 *   import { schemas } from '../validation/schemas.js';
 *
 *   router.post('/admin/admins', authMiddleware, adminMiddleware, validateRequest(schemas.addAdmin), handler);
 *
 * Error contract:
 *   400 — shape/type problems (wrong type, missing required field, unknown key in strict mode)
 *   422 — domain semantic violations (correct shape but logically invalid values)
 *
 * Both 400 and 422 use the same JSON shape:
 *   { error: string, code: string, details: Array<{ field: string, message: string }> }
 *
 * This middleware does NOT alter auth middleware ordering or modify success response payloads.
 */

/**
 * Build the error response payload.
 * @param {string} message - Human-readable summary
 * @param {string} code - Machine-readable error code
 * @param {Array<{field:string,message:string}>} details - Per-field violations
 */
function buildError(message, code, details) {
  return { error: message, code, details };
}

/**
 * Determine the effective typeof for a value, treating arrays as 'array'.
 */
function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Create an Express middleware function that validates req.body against the provided schema.
 *
 * @param {object} schema - Schema object from schemas.js
 * @returns {function} Express middleware (req, res, next) => void
 */
export function validateRequest(schema) {
  if (!schema) {
    throw new Error('validateRequest: schema is required');
  }

  const {
    strict = false,
    required = [],
    optional = [],
    types = {},
    enums = {},
    semanticRules = [],
  } = schema;

  const allowedKeys = new Set([...required, ...optional]);

  return function validateRequestMiddleware(req, res, next) {
    const body = req.body || {};
    const shapeErrors = [];

    // 1. Unknown key check (strict mode) — 400
    if (strict) {
      for (const key of Object.keys(body)) {
        if (!allowedKeys.has(key)) {
          shapeErrors.push({ field: key, message: `Unknown field: "${key}" is not allowed` });
        }
      }
    }

    // 2. Required fields check — 400
    for (const field of required) {
      if (body[field] === undefined || body[field] === null) {
        shapeErrors.push({ field, message: `Required field "${field}" is missing or null` });
      }
    }

    // 3. Type checks — 400
    for (const [field, expectedType] of Object.entries(types)) {
      const value = body[field];
      if (value === undefined || value === null) continue; // handled by required check
      const actualType = typeOf(value);
      if (actualType !== expectedType) {
        shapeErrors.push({
          field,
          message: `Field "${field}" must be ${expectedType}, got ${actualType}`,
        });
      }
    }

    if (shapeErrors.length > 0) {
      return res.status(400).json(
        buildError('Request validation failed', 'VALIDATION_ERROR', shapeErrors),
      );
    }

    // 4. Enum checks — 422 (value is right type but not an allowed value)
    const semanticErrors = [];
    for (const [field, allowed] of Object.entries(enums)) {
      const value = body[field];
      if (value === undefined || value === null) continue;
      if (!allowed.includes(value)) {
        semanticErrors.push({
          field,
          message: `Field "${field}" must be one of [${allowed.join(', ')}], got "${value}"`,
        });
      }
    }

    // 5. Semantic rules — 422
    for (const rule of semanticRules) {
      const violation = rule(body);
      if (violation) {
        semanticErrors.push(violation);
      }
    }

    if (semanticErrors.length > 0) {
      return res.status(422).json(
        buildError('Semantic validation failed', 'SEMANTIC_ERROR', semanticErrors),
      );
    }

    next();
  };
}
