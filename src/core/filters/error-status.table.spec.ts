import {
  DEFAULT_DOMAIN_ERROR_STATUS,
  DOMAIN_ERROR_STATUS,
  GENERIC_PROBLEM_CODES,
  PROBLEM_CODES,
} from './error-status.table.js';

const UPPER_SNAKE_CASE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;

describe('error-status.table', () => {
  it('utilise 422 comme statut par défaut des Business Errors', () => {
    expect(DEFAULT_DOMAIN_ERROR_STATUS).toBe(422);
  });

  it('a des codes génériques en UPPER_SNAKE_CASE', () => {
    for (const code of Object.keys(GENERIC_PROBLEM_CODES)) {
      expect(code).toMatch(UPPER_SNAKE_CASE);
    }
  });

  it('a des codes métier en UPPER_SNAKE_CASE', () => {
    for (const code of Object.keys(DOMAIN_ERROR_STATUS)) {
      expect(code).toMatch(UPPER_SNAKE_CASE);
    }
  });

  it('ne reprend aucun code générique dans la table métier', () => {
    const generic = Object.keys(GENERIC_PROBLEM_CODES);
    for (const code of Object.keys(DOMAIN_ERROR_STATUS)) {
      expect(generic).not.toContain(code);
    }
  });

  it('applique des statuts 400-599 à la table métier (même vide)', () => {
    for (const status of Object.values(DOMAIN_ERROR_STATUS)) {
      expect(Number.isInteger(status)).toBe(true);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThanOrEqual(599);
    }
  });

  it('associe GARMIN_ACCESS_DENIED au statut 502', () => {
    expect(DOMAIN_ERROR_STATUS['GARMIN_ACCESS_DENIED']).toBe(502);
  });

  it('associe GARMIN_UNAVAILABLE au statut 503', () => {
    expect(DOMAIN_ERROR_STATUS['GARMIN_UNAVAILABLE']).toBe(503);
  });

  it('expose les codes Garmin dans PROBLEM_CODES', () => {
    expect(PROBLEM_CODES).toEqual(
      expect.arrayContaining(['GARMIN_ACCESS_DENIED', 'GARMIN_UNAVAILABLE']),
    );
  });

  it('PROBLEM_CODES ne contient aucun doublon', () => {
    expect(new Set(PROBLEM_CODES).size).toBe(PROBLEM_CODES.length);
  });
});
