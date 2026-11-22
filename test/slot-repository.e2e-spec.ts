import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';
import { configureApp } from './../src/app.setup.js';
import { Slot } from './../src/modules/creneaux/domain/entities/slot.entity.js';
import {
  SLOT_REPOSITORY,
  type ISlotRepository,
} from './../src/modules/creneaux/domain/ports/outbound/slot.repository.port.js';
import { LocalTime } from './../src/modules/creneaux/domain/value-objects/local-time.vo.js';
import { SlotId } from './../src/modules/creneaux/domain/value-objects/slot-id.vo.js';
import { SlotPeriod } from './../src/modules/creneaux/domain/value-objects/slot-period.vo.js';
import { SlotTimeZone } from './../src/modules/creneaux/domain/value-objects/slot-time-zone.vo.js';

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function slot(overrides: Record<string, unknown> = {}): Slot {
  return Slot.create({
    type: 'libre',
    date: day('2026-05-04'),
    startTime: LocalTime.parse('09:00'),
    endTime: LocalTime.parse('10:30'),
    recurrence: 'aucune',
    timeZone: SlotTimeZone.create('Europe/Paris'),
    ...overrides,
  });
}

function period(from: string, to: string): SlotPeriod {
  return SlotPeriod.create({ from: day(from), to: day(to) });
}

describe('SlotRepository (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let repository: ISlotRepository;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    repository = app.get<ISlotRepository>(SLOT_REPOSITORY, { strict: false });
    await prisma.slot.deleteMany();
  });

  afterEach(async () => {
    await prisma.slot.deleteMany();
    await app.close();
  });

  describe('save', () => {
    it('crée un nouveau créneau', async () => {
      const created = slot();

      await repository.save(created);

      expect(await prisma.slot.count()).toBe(1);
    });

    it('met à jour un créneau existant sous le même identifiant', async () => {
      const created = slot();
      await repository.save(created);

      await repository.save(
        created.change({ endTime: LocalTime.parse('11:00') }),
      );

      expect(await prisma.slot.count()).toBe(1);
      const stored = await prisma.slot.findUniqueOrThrow({
        where: { id: created.id.toString() },
      });
      expect(stored.endMinute).toBe(660);
    });

    it('persiste les heures en minutes depuis minuit', async () => {
      const created = slot({
        startTime: LocalTime.parse('18:05'),
        endTime: LocalTime.parse('23:59'),
      });

      await repository.save(created);

      const stored = await prisma.slot.findUniqueOrThrow({
        where: { id: created.id.toString() },
      });
      expect(stored.startMinute).toBe(1085);
      expect(stored.endMinute).toBe(1439);
    });
  });

  describe('findById', () => {
    it('renvoie null pour un identifiant inconnu', async () => {
      await expect(
        repository.findById(
          SlotId.create('3f2504e0-4f89-41d3-9a0c-0305e82c3301'),
        ),
      ).resolves.toBeNull();
    });

    it('relit un créneau équivalent à celui enregistré', async () => {
      const original = slot({
        type: 'occupe',
        recurrence: 'hebdomadaire',
        timeZone: SlotTimeZone.create('America/New_York'),
      });
      await repository.save(original);

      const found = await repository.findById(original.id);

      expect(found?.id.toString()).toBe(original.id.toString());
      expect(found?.type).toBe('occupe');
      expect(found?.recurrence).toBe('hebdomadaire');
      expect(found?.startTime.toString()).toBe('09:00');
      expect(found?.endTime.toString()).toBe('10:30');
      expect(found?.timeZone.toString()).toBe('America/New_York');
      expect(found?.date.toISOString()).toBe('2026-05-04T00:00:00.000Z');
    });
  });

  describe('findIntersecting', () => {
    it('renvoie les ponctuels dont la date est dans la période, bornes incluses', async () => {
      const onFrom = slot({ date: day('2026-05-01') });
      const onTo = slot({ date: day('2026-05-31') });
      const outside = slot({ date: day('2026-06-01') });
      await repository.save(onFrom);
      await repository.save(onTo);
      await repository.save(outside);

      const found = await repository.findIntersecting(
        period('2026-05-01', '2026-05-31'),
      );

      expect(found.map((s) => s.id.toString()).sort()).toEqual(
        [onFrom.id.toString(), onTo.id.toString()].sort(),
      );
    });

    it('renvoie les hebdomadaires dont l’ancre est antérieure ou égale à la fin de période', async () => {
      const anchoredBefore = slot({
        date: day('2026-04-01'),
        recurrence: 'hebdomadaire',
      });
      const anchoredInside = slot({
        date: day('2026-05-10'),
        recurrence: 'hebdomadaire',
      });
      const anchoredAfter = slot({
        date: day('2026-06-01'),
        recurrence: 'hebdomadaire',
      });
      await repository.save(anchoredBefore);
      await repository.save(anchoredInside);
      await repository.save(anchoredAfter);

      const found = await repository.findIntersecting(
        period('2026-05-01', '2026-05-31'),
      );

      expect(found.map((s) => s.id.toString()).sort()).toEqual(
        [anchoredBefore.id.toString(), anchoredInside.id.toString()].sort(),
      );
    });

    it('n’applique pas la date du ponctuel à une récurrence hebdomadaire', async () => {
      await repository.save(
        slot({ date: day('2026-04-01'), recurrence: 'hebdomadaire' }),
      );
      await repository.save(slot({ date: day('2026-04-01') }));

      const found = await repository.findIntersecting(
        period('2026-05-01', '2026-05-31'),
      );

      expect(found).toHaveLength(1);
      expect(found[0]?.recurrence).toBe('hebdomadaire');
    });

    it('renvoie une liste vide quand aucun créneau ne touche la période', async () => {
      await repository.save(slot({ date: day('2026-07-01') }));

      await expect(
        repository.findIntersecting(period('2026-05-01', '2026-05-31')),
      ).resolves.toEqual([]);
    });
  });

  describe('delete', () => {
    it('supprime le créneau ciblé', async () => {
      const target = slot();
      const other = slot();
      await repository.save(target);
      await repository.save(other);

      await repository.delete(target.id);

      expect(await prisma.slot.count()).toBe(1);
      await expect(repository.findById(target.id)).resolves.toBeNull();
      await expect(repository.findById(other.id)).resolves.not.toBeNull();
    });

    it('ne fait rien pour un identifiant inconnu', async () => {
      await repository.save(slot());

      await expect(
        repository.delete(
          SlotId.create('3f2504e0-4f89-41d3-9a0c-0305e82c3301'),
        ),
      ).resolves.toBeUndefined();
      expect(await prisma.slot.count()).toBe(1);
    });
  });
});
