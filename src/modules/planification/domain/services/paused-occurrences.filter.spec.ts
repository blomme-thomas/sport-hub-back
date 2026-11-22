import { describe, expect, it } from 'vitest';
import { removePausedOccurrences } from './paused-occurrences.filter.js';

const OCCURRENCES = [
  { slotId: 'a', date: '2026-12-19' },
  { slotId: 'b', date: '2026-12-20' },
  { slotId: 'c', date: '2026-12-25' },
  { slotId: 'd', date: '2027-01-05' },
  { slotId: 'e', date: '2027-01-06' },
];

describe('removePausedOccurrences', () => {
  it('garde toutes les occurrences sans pause', () => {
    expect(removePausedOccurrences(OCCURRENCES, [])).toEqual(OCCURRENCES);
  });

  it('retire les occurrences des bornes incluses d’une pause', () => {
    const kept = removePausedOccurrences(OCCURRENCES, [
      { from: '2026-12-20', to: '2027-01-05' },
    ]);

    expect(kept.map((occurrence) => occurrence.slotId)).toEqual(['a', 'e']);
  });

  it('ne touche pas aux occurrences hors pause', () => {
    const kept = removePausedOccurrences(OCCURRENCES, [
      { from: '2026-12-21', to: '2026-12-24' },
    ]);

    expect(kept).toHaveLength(5);
  });

  it('retire les occurrences couvertes par plusieurs pauses', () => {
    const kept = removePausedOccurrences(OCCURRENCES, [
      { from: '2026-12-20', to: '2026-12-20' },
      { from: '2027-01-05', to: '2027-01-06' },
    ]);

    expect(kept.map((occurrence) => occurrence.slotId)).toEqual(['a', 'c']);
  });
});
