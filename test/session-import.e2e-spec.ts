import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

const PROBLEM_JSON = /application\/problem\+json/;
const IMPORT_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const OTHER_IMPORT_ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

const SEANCE = {
  date: '2099-11-30',
  disciplineTypeKey: 'swimming',
  durationMinutes: 60,
  startTime: '18:00',
  description: 'Séance de fond',
  modules: [
    { type: 'echauffement', durationMinutes: 10, instruction: 'Nage souple' },
    {
      type: 'series',
      durationMinutes: 40,
      instruction: '4 x 100 m',
      targetZones: { pace: { min: 110, max: 120 } },
      perceivedEffort: 7,
    },
  ],
};

function plan(
  seances: unknown[] = [SEANCE],
  importId = IMPORT_ID,
): Record<string, unknown> {
  return { kind: 'plan-seances', schemaVersion: 1, importId, seances };
}

describe('Import des séances (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.sessionImport.deleteMany();
    await prisma.session.deleteMany();
    await prisma.discipline.deleteMany();
    await prisma.discipline.create({
      data: {
        typeKey: 'swimming',
        label: 'Natation',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    await prisma.sessionImport.deleteMany();
    await prisma.session.deleteMany();
    await prisma.discipline.deleteMany();
    await app.close();
  });

  function importFile(body: Record<string, unknown>) {
    return request(app.getHttpServer()).post('/api/sessions/import').send(body);
  }

  it('ajoute les séances planifiées et renvoie leurs identifiants', async () => {
    const response = await importFile(
      plan([SEANCE, { ...SEANCE, date: '2099-12-01' }]),
    );

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      importId: IMPORT_ID,
      createdCount: 2,
    });
    expect(response.body.sessionIds).toHaveLength(2);

    const sessions = await prisma.session.findMany({
      include: { modules: { orderBy: { position: 'asc' } } },
      orderBy: { date: 'asc' },
    });
    expect(sessions.map((session) => session.status)).toEqual([
      'planifiee',
      'planifiee',
    ]);
    expect(sessions[0]?.modules.map((module) => module.position)).toEqual([
      1, 2,
    ]);
    expect(sessions[0]?.modules[1]?.perceivedEffort).toBe(7);
  });

  it('ne modifie jamais une séance déjà présente', async () => {
    const existing = await prisma.session.create({
      data: {
        date: new Date('2099-11-30T00:00:00.000Z'),
        disciplineTypeKey: 'swimming',
        durationMinutes: 45,
        status: 'realisee',
        description: 'Déjà là',
      },
    });

    const response = await importFile(plan([SEANCE]));

    expect(response.status).toBe(201);
    const after = await prisma.session.findUniqueOrThrow({
      where: { id: existing.id },
    });
    expect(after).toMatchObject({
      durationMinutes: 45,
      status: 'realisee',
      description: 'Déjà là',
    });
    expect(await prisma.session.count()).toBe(2);
  });

  it('refuse un fichier déjà importé, sans rien ajouter', async () => {
    await importFile(plan([SEANCE])).expect(201);

    const response = await importFile(plan([SEANCE, SEANCE]));

    expect(response.status).toBe(409);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.body.code).toBe('SESSION_IMPORT_ALREADY_DONE');
    expect(await prisma.session.count()).toBe(1);
  });

  it('refuse tout le fichier quand une séance est invalide, avec la liste des erreurs', async () => {
    const response = await importFile(
      plan([SEANCE, { ...SEANCE, durationMinutes: 0 }]),
    );

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.body.code).toBe('SESSION_IMPORT_INVALID');
    expect(response.body.errors).toEqual([
      expect.objectContaining({ field: 'seances[1]', code: 'SESSION_INVALID' }),
    ]);
    expect(await prisma.session.count()).toBe(0);
    expect(await prisma.sessionImport.count()).toBe(0);
  });

  it('signale la discipline inconnue au chemin de la séance', async () => {
    const response = await importFile(
      plan([{ ...SEANCE, disciplineTypeKey: 'rowing' }]),
    );

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      expect.objectContaining({
        field: 'seances[0].disciplineTypeKey',
        code: 'SESSION_DISCIPLINE_UNKNOWN',
      }),
    ]);
  });

  it('refuse un champ hors format, pour attraper les fautes de frappe', async () => {
    const response = await importFile(plan([{ ...SEANCE, duree: 60 }]));

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      expect.objectContaining({
        field: 'seances[0].duree',
        code: 'SESSION_IMPORT_UNKNOWN_FIELD',
      }),
    ]);
  });

  it('refuse un champ hors de l’enveloppe du fichier avec une erreur de validation', async () => {
    const response = await importFile({ ...plan(), extra: true });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
    expect(await prisma.session.count()).toBe(0);
  });

  it('refuse un identifiant de fichier absent ou mal formé', async () => {
    const response = await importFile(plan([SEANCE], 'pas-un-uuid'));

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      expect.objectContaining({
        field: 'importId',
        code: 'SESSION_IMPORT_ID_INVALID',
      }),
    ]);
  });

  it('accepte deux fichiers distincts qui ajoutent chacun leurs séances', async () => {
    await importFile(plan([SEANCE])).expect(201);
    await importFile(
      plan([{ ...SEANCE, date: '2099-12-02' }], OTHER_IMPORT_ID),
    ).expect(201);

    expect(await prisma.session.count()).toBe(2);
    expect(await prisma.sessionImport.count()).toBe(2);
  });
});
