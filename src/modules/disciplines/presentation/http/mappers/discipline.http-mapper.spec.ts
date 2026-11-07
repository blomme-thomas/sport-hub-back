import { DisciplineHttpMapper } from './discipline.http-mapper.js';

const disciplineDto = {
  typeKey: 'running',
  label: 'Course à pied',
  firstSeenAt: new Date('2026-05-01T08:00:00.000Z'),
  lastSeenAt: new Date('2026-11-07T10:00:00.000Z'),
};

describe('DisciplineHttpMapper', () => {
  describe('toResponse', () => {
    it('restitue une discipline avec sa clé, son libellé et ses dates', () => {
      expect(DisciplineHttpMapper.toResponse(disciplineDto)).toEqual({
        typeKey: 'running',
        label: 'Course à pied',
        firstSeenAt: new Date('2026-05-01T08:00:00.000Z'),
        lastSeenAt: new Date('2026-11-07T10:00:00.000Z'),
      });
    });
  });

  describe('toListResponse', () => {
    it('enveloppe les disciplines dans la clé items en gardant leur ordre', () => {
      const other = { ...disciplineDto, typeKey: 'cycling', label: 'Cyclisme' };

      const response = DisciplineHttpMapper.toListResponse([
        other,
        disciplineDto,
      ]);

      expect(response.items.map((item) => item.typeKey)).toEqual([
        'cycling',
        'running',
      ]);
    });

    it('renvoie une liste d’éléments vide quand aucune discipline n’est connue', () => {
      expect(DisciplineHttpMapper.toListResponse([])).toEqual({ items: [] });
    });
  });
});
