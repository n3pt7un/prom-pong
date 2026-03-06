/**
 * ELO calculation logic - server-side only
 */
export const K_FACTOR = 32;
export const INITIAL_ELO = 1200;

export const FORMULA_PRESETS = {
  standard: {
    label: 'Standard ELO',
    description: 'Classic ELO formula. Winner gains K*(1-E) points, loser loses the same.',
    template: 'Math.round(kFactor * (1 - expectedScore(winnerElo, loserElo)))',
  },
  score_weighted: {
    label: 'Score-Weighted ELO',
    description: 'K-factor scales with margin of victory. A 11-0 blowout awards up to 2x points vs a close 11-9 game.',
    template: 'Math.round(kFactor * (1 + (scoreWinner - scoreLoser) / (scoreWinner + scoreLoser || 1)) * (1 - expectedScore(winnerElo, loserElo)))',
  },
  custom: {
    label: 'Custom Formula',
    description: 'Write your own formula using the available variables and any custom constants you define.',
    template: 'Math.round(kFactor * (1 - expectedScore(winnerElo, loserElo)))',
  },
};

export const getExpectedScore = (ratingA, ratingB, dFactor = 200) =>
  1 / (1 + Math.pow(10, (ratingB - ratingA) / dFactor));

export const calculateNewRating = (currentRating, actualScore, expectedScore, kFactor = 32) =>
  Math.round(currentRating + kFactor * (actualScore - expectedScore));

/**
 * Evaluate a formula string using new Function() with explicit named parameters.
 * No vm module — works identically in every Node.js version and Cloud Run.
 * new Function() has no access to outer closure scope; only the listed params are visible.
 */
function runFormula(formula, winnerElo, loserElo, config) {
  const kFactor = config.kFactor ?? K_FACTOR;
  const dFactor = config.dFactor ?? 200;
  const scoreWinner = config.scoreWinner ?? 0;
  const scoreLoser = config.scoreLoser ?? 0;
  const customConstants = config.customConstants ?? {};

  const constantKeys = Object.keys(customConstants);
  const constantVals = Object.values(customConstants);

  // eslint-disable-next-line no-new-func
  const fn = new Function(
    'Math', 'winnerElo', 'loserElo', 'kFactor', 'dFactor',
    'scoreWinner', 'scoreLoser', ...constantKeys,
    `"use strict";
    function expectedScore(ra, rb, d) {
      if (d === undefined) d = dFactor;
      return 1 / (1 + Math.pow(10, (rb - ra) / d));
    }
    return (${formula});`
  );

  const result = fn(
    Math, winnerElo, loserElo, kFactor, dFactor,
    scoreWinner, scoreLoser, ...constantVals
  );

  if (typeof result !== 'number' || !isFinite(result)) throw new Error('Formula must return a finite number');
  return Math.round(result);
}

/**
 * Calculate ELO delta for a match.
 * config: { kFactor, dFactor, formulaPreset, scoreWinner, scoreLoser, customFormula, customConstants }
 */
export const calculateMatchDelta = (winnerElo, loserElo, config = {}) => {
  const kFactor = config.kFactor ?? K_FACTOR;
  const dFactor = config.dFactor ?? 200;
  const formulaPreset = config.formulaPreset ?? 'standard';
  const scoreWinner = config.scoreWinner;
  const scoreLoser = config.scoreLoser;

  const expected = getExpectedScore(winnerElo, loserElo, dFactor);

  if (formulaPreset === 'custom' && config.customFormula) {
    try {
      return runFormula(config.customFormula, winnerElo, loserElo, config);
    } catch {
      // Fall back to standard on error
      return Math.round(kFactor * (1 - expected));
    }
  }

  if (formulaPreset === 'score_weighted' && scoreWinner != null && scoreLoser != null) {
    const total = scoreWinner + scoreLoser;
    const effectiveK = total > 0
      ? kFactor * (1 + (scoreWinner - scoreLoser) / total)
      : kFactor;
    return Math.round(effectiveK * (1 - expected));
  }

  return Math.round(kFactor * (1 - expected));
};

/**
 * Validate a custom formula string by doing a dry-run with sample values.
 * Returns null on success, or an error message string.
 */
export const validateCustomFormula = (formula, customConstants = {}) => {
  try {
    runFormula(formula, 1200, 1200, {
      kFactor: 32, dFactor: 200, scoreWinner: 11, scoreLoser: 5, customConstants,
    });
    return null;
  } catch (e) {
    return e.message || 'Invalid formula';
  }
};
