import { InvalidSlotError } from '../errors/invalid-slot.error.js';
import { LocalTime } from './local-time.vo.js';

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('aucune erreur levée');
}

describe('LocalTime', () => {
  describe('lecture au format HH:mm', () => {
    it.each([
      ['minuit', '00:00', 0],
      ['une heure du matin et cinq minutes', '01:05', 65],
      ['neuf heures cinq', '09:05', 545],
      ['dernière minute de la journée', '23:59', 1439],
    ])(
      'lit %s (%s) comme %i minutes depuis minuit',
      (_label, text, minutes) => {
        expect(LocalTime.parse(text).minutes()).toBe(minutes);
      },
    );

    it('restitue l’heure au format HH:mm avec zéro de tête', () => {
      expect(LocalTime.parse('09:05').toString()).toBe('09:05');
    });

    it('restitue la même heure après un aller-retour par les minutes', () => {
      const time = LocalTime.parse('18:45');

      expect(LocalTime.fromMinutes(time.minutes()).toString()).toBe('18:45');
    });
  });

  describe('construction depuis des minutes depuis minuit', () => {
    it('produit l’heure correspondant aux minutes', () => {
      expect(LocalTime.fromMinutes(545).toString()).toBe('09:05');
    });

    it('accepte minuit comme première valeur', () => {
      expect(LocalTime.fromMinutes(0).toString()).toBe('00:00');
    });

    it('accepte 23:59 comme dernière valeur', () => {
      expect(LocalTime.fromMinutes(1439).toString()).toBe('23:59');
    });

    it.each([
      ['minutes négatives', -1],
      ['minutes à 24:00', 1440],
      ['minutes fractionnaires', 90.5],
      ['minutes NaN', Number.NaN],
    ])('refuse %s avec SLOT_INVALID', (_label, minutes) => {
      expect(() => LocalTime.fromMinutes(minutes)).toThrow(InvalidSlotError);
    });
  });

  describe('validation du texte HH:mm', () => {
    it.each([
      ['heure sur 24', '24:00'],
      ['minutes sur 60', '12:60'],
      ['heure sans zéro de tête', '9:00'],
      ['avec secondes', '12:00:00'],
      ['minutes incomplètes', '12:5'],
      ['chaîne vide', ''],
      ['texte libre', 'midi'],
      ['espace en tête', ' 10:00'],
    ])('refuse %s (%s) avec SLOT_INVALID', (_label, text) => {
      expect(captureError(() => LocalTime.parse(text))).toMatchObject({
        code: 'SLOT_INVALID',
      });
    });

    it('lève une InvalidSlotError pour une heure mal formée', () => {
      expect(() => LocalTime.parse('25:00')).toThrow(InvalidSlotError);
    });
  });
});
