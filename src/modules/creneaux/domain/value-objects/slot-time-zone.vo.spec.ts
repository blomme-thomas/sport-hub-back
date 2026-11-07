import { InvalidSlotError } from '../errors/invalid-slot.error.js';
import { SlotTimeZone } from './slot-time-zone.vo.js';

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

describe('SlotTimeZone', () => {
  describe('fuseaux IANA reconnus', () => {
    it('conserve l’identifiant IANA du fuseau', () => {
      expect(SlotTimeZone.create('Europe/Paris').toString()).toBe(
        'Europe/Paris',
      );
    });

    it('accepte UTC', () => {
      expect(SlotTimeZone.create('UTC').toString()).toBe('UTC');
    });

    it('accepte un fuseau hors Europe', () => {
      expect(SlotTimeZone.create('America/New_York').toString()).toBe(
        'America/New_York',
      );
    });
  });

  describe('fuseaux refusés', () => {
    it.each([
      ['identifiant inconnu', 'Mars/Olympus'],
      ['nom de ville sans zone', 'Paris'],
      ['chaîne vide', ''],
      ['espaces seuls', '   '],
      ['décalage numérique positif avec deux-points', '+02:00'],
      ['décalage numérique négatif avec deux-points', '-05:00'],
      ['décalage numérique positif compact', '+0200'],
    ])('refuse %s (%s) avec SLOT_INVALID', (_label, value) => {
      expect(captureError(() => SlotTimeZone.create(value))).toMatchObject({
        code: 'SLOT_INVALID',
      });
    });

    it('lève une InvalidSlotError pour un fuseau inconnu', () => {
      expect(() => SlotTimeZone.create('Mars/Olympus')).toThrow(
        InvalidSlotError,
      );
    });
  });
});
