import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';
import { configureApp } from './../src/app.setup.js';
import { Discipline } from './../src/modules/disciplines/domain/entities/discipline.entity.js';
import {
  DISCIPLINE_REPOSITORY,
  type IDisciplineRepository,
} from './../src/modules/disciplines/domain/ports/outbound/discipline.repository.port.js';
import { DisciplineLabel } from './../src/modules/disciplines/domain/value-objects/discipline-label.vo.js';
import { DisciplineTypeKey } from './../src/modules/disciplines/domain/value-objects/discipline-type-key.vo.js';

const FIRST_SEEN = new Date('2026-05-01T08:00:00.000Z');
const SYNC_AT = new Date('2026-11-07T10:00:00.000Z');
const EARLIER = new Date('2026-04-01T08:00:00.000Z');

function key(raw: string): DisciplineTypeKey {
  return DisciplineTypeKey.create(raw);
}

describe('DisciplineRepository (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let repository: IDisciplineRepository;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    repository = app.get<IDisciplineRepository>(DISCIPLINE_REPOSITORY, {
      strict: false,
    });
    await prisma.discipline.deleteMany();
  });

  afterEach(async () => {
    await prisma.discipline.deleteMany();
    await app.close();
  });

  describe('saveAppearances', () => {
    it('crée une discipline inconnue avec la clé comme libellé et la date vue comme première et dernière apparition', async () => {
      await repository.saveAppearances([
        Discipline.firstSeen(key('running'), SYNC_AT),
      ]);

      const stored = await prisma.discipline.findUniqueOrThrow({
        where: { typeKey: 'running' },
      });
      expect(stored.label).toBe('running');
      expect(stored.firstSeenAt.toISOString()).toBe('2026-11-07T10:00:00.000Z');
      expect(stored.lastSeenAt.toISOString()).toBe('2026-11-07T10:00:00.000Z');
    });

    it('avance la dernière apparition d’une discipline connue sans toucher au libellé ni à la première apparition', async () => {
      const known = Discipline.reconstitute({
        typeKey: key('running'),
        label: DisciplineLabel.create('Course à pied'),
        firstSeenAt: FIRST_SEEN,
        lastSeenAt: FIRST_SEEN,
      });
      await repository.saveAppearances([known]);

      await repository.saveAppearances([known.markSeen(SYNC_AT)]);

      expect(await prisma.discipline.count()).toBe(1);
      const stored = await prisma.discipline.findUniqueOrThrow({
        where: { typeKey: 'running' },
      });
      expect(stored.label).toBe('Course à pied');
      expect(stored.firstSeenAt.toISOString()).toBe('2026-05-01T08:00:00.000Z');
      expect(stored.lastSeenAt.toISOString()).toBe('2026-11-07T10:00:00.000Z');
    });

    it('ne recule jamais la dernière apparition d’une discipline connue', async () => {
      const known = Discipline.reconstitute({
        typeKey: key('running'),
        label: DisciplineLabel.fromTypeKey(key('running')),
        firstSeenAt: FIRST_SEEN,
        lastSeenAt: SYNC_AT,
      });
      await repository.saveAppearances([known]);

      await repository.saveAppearances([
        Discipline.reconstitute({
          typeKey: key('running'),
          label: DisciplineLabel.fromTypeKey(key('running')),
          firstSeenAt: FIRST_SEEN,
          lastSeenAt: EARLIER,
        }),
      ]);

      const stored = await prisma.discipline.findUniqueOrThrow({
        where: { typeKey: 'running' },
      });
      expect(stored.lastSeenAt.toISOString()).toBe('2026-11-07T10:00:00.000Z');
    });
  });

  describe('saveLabel', () => {
    it('n’écrit que le libellé de la discipline ciblée', async () => {
      const running = Discipline.firstSeen(key('running'), FIRST_SEEN);
      await repository.saveAppearances([
        running,
        Discipline.firstSeen(key('cycling'), FIRST_SEEN),
      ]);

      await repository.saveLabel(
        running.rename(DisciplineLabel.create('Course à pied')),
      );

      const renamed = await prisma.discipline.findUniqueOrThrow({
        where: { typeKey: 'running' },
      });
      const untouched = await prisma.discipline.findUniqueOrThrow({
        where: { typeKey: 'cycling' },
      });
      expect(renamed.label).toBe('Course à pied');
      expect(untouched.label).toBe('cycling');
    });
  });

  describe('lecture', () => {
    it('renvoie null pour une clé inconnue', async () => {
      await expect(
        repository.findByTypeKey(key('swimming')),
      ).resolves.toBeNull();
    });

    it('relit une discipline équivalente à celle enregistrée', async () => {
      await repository.saveAppearances([
        Discipline.firstSeen(key('running'), FIRST_SEEN),
      ]);

      const found = await repository.findByTypeKey(key('running'));

      expect(found?.typeKey.toString()).toBe('running');
      expect(found?.label.toString()).toBe('running');
      expect(found?.firstSeenAt).toEqual(FIRST_SEEN);
      expect(found?.lastSeenAt).toEqual(FIRST_SEEN);
    });

    it('relit un libellé provisoire plus long que la borne de saisie', async () => {
      const longKey = 'x'.repeat(80);
      await repository.saveAppearances([
        Discipline.firstSeen(key(longKey), FIRST_SEEN),
      ]);

      const found = await repository.findByTypeKey(key(longKey));

      expect(found?.label.toString()).toBe(longKey);
    });

    it('renvoie seulement les disciplines connues parmi les clés demandées', async () => {
      await repository.saveAppearances([
        Discipline.firstSeen(key('running'), FIRST_SEEN),
        Discipline.firstSeen(key('cycling'), FIRST_SEEN),
      ]);

      const found = await repository.findByTypeKeys([
        key('running'),
        key('swimming'),
      ]);

      expect(found.map((d) => d.typeKey.toString())).toEqual(['running']);
    });

    it('renvoie les disciplines par libellé croissant puis clé de type croissante', async () => {
      const running = Discipline.firstSeen(key('running'), FIRST_SEEN);
      const cycling = Discipline.firstSeen(key('cycling'), FIRST_SEEN);
      await repository.saveAppearances([
        running,
        cycling,
        Discipline.firstSeen(key('strength_training'), FIRST_SEEN),
      ]);
      await repository.saveLabel(
        running.rename(DisciplineLabel.create('Course à pied')),
      );
      await repository.saveLabel(
        cycling.rename(DisciplineLabel.create('Cyclisme')),
      );

      const all = await repository.findAll();

      expect(all.map((d) => d.typeKey.toString())).toEqual([
        'running',
        'cycling',
        'strength_training',
      ]);
    });
  });
});
