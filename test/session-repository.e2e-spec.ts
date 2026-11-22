import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';
import { configureApp } from './../src/app.setup.js';
import { Session } from './../src/modules/seances/domain/entities/session.entity.js';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from './../src/modules/seances/domain/ports/outbound/session.repository.port.js';
import { SessionModule } from './../src/modules/seances/domain/value-objects/session-module.vo.js';
import { SessionId } from './../src/modules/seances/domain/value-objects/session-id.vo.js';

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function module(position: number, instruction: string): SessionModule {
  return SessionModule.create({
    position,
    type: 'series',
    durationMinutes: 10,
    instruction,
  });
}

function seance(): Session {
  return Session.create({
    date: day('2099-05-04'),
    disciplineTypeKey: 'swimming',
    durationMinutes: 60,
    modules: [module(1, 'Échauffement'), module(2, 'Série')],
  });
}

describe('SessionRepository (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let repository: ISessionRepository;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    repository = app.get<ISessionRepository>(SESSION_REPOSITORY, {
      strict: false,
    });
    await prisma.session.deleteMany();
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await app.close();
  });

  describe('save et findById', () => {
    it('persiste une séance avec ses modules ordonnés', async () => {
      const created = seance();
      await repository.save(created);

      const found = await repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.modules.map((m) => m.instruction)).toEqual([
        'Échauffement',
        'Série',
      ]);
      expect(found!.modules.map((m) => m.position)).toEqual([1, 2]);
    });

    it('remplace la liste des modules lors d’une nouvelle sauvegarde', async () => {
      const created = seance();
      await repository.save(created);

      await repository.save(
        created.replaceModules([module(1, 'Retour au calme')], new Date()),
      );

      const found = await repository.findById(created.id);
      expect(found!.modules.map((m) => m.instruction)).toEqual([
        'Retour au calme',
      ]);
      expect(await prisma.sessionModule.count()).toBe(1);
    });

    it('persiste le journal des modifications en attente', async () => {
      const created = seance();
      await repository.save(created);
      const changed = created.change(
        { durationMinutes: 45 },
        new Date('2099-05-01T10:00:00.000Z'),
      );

      await repository.save(changed);

      const found = await repository.findById(created.id);
      expect(found!.modifiedManually).toBe(true);
      expect(found!.changeLog.map((entry) => entry.field)).toEqual([
        'durationMinutes',
      ]);
      expect(await prisma.sessionChangeLog.count()).toBe(1);
    });

    it('renvoie null pour une séance inconnue', async () => {
      const found = await repository.findById(
        SessionId.create('3f2504e0-4f89-41d3-9a0c-0305e82c3301'),
      );

      expect(found).toBeNull();
    });
  });

  describe('findByPeriod', () => {
    it('renvoie les séances dont la date est dans la période, bornes incluses', async () => {
      await repository.save(seance());
      await repository.save(
        Session.create({
          date: day('2099-06-01'),
          disciplineTypeKey: 'swimming',
          durationMinutes: 30,
        }),
      );
      await repository.save(
        Session.create({
          date: day('2099-08-01'),
          disciplineTypeKey: 'swimming',
          durationMinutes: 30,
        }),
      );

      const found = await repository.findByPeriod({
        from: day('2099-05-04'),
        to: day('2099-06-01'),
      });

      expect(found).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('supprime la séance et ses modules', async () => {
      const created = seance();
      await repository.save(created);

      await repository.delete(created.id);

      expect(await repository.findById(created.id)).toBeNull();
      expect(await prisma.sessionModule.count()).toBe(0);
    });
  });
});
