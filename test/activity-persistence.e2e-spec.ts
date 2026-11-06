import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';
import { configureApp } from './../src/app.setup.js';

const buildActivity = (overrides: Record<string, unknown> = {}) => ({
  garminActivityId: '12345678901',
  type: 'running',
  startedAt: new Date('2026-05-01T06:30:00.000Z'),
  durationSeconds: 3600.5,
  distanceMeters: 10250.75,
  rawPayload: { activityId: 12345678901, activityName: 'Sortie matinale' },
  ...overrides,
});

describe('Persistance des activités (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.activity.deleteMany();
  });

  afterEach(async () => {
    await prisma.activity.deleteMany();
    await app.close();
  });

  it('crée une activité puis la relit avec ses valeurs et ses champs générés', async () => {
    const created = await prisma.activity.create({ data: buildActivity() });

    const found = await prisma.activity.findUnique({
      where: { id: created.id },
    });

    expect(found).not.toBeNull();
    expect(found?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(found?.garminActivityId).toBe('12345678901');
    expect(found?.type).toBe('running');
    expect(found?.startedAt.toISOString()).toBe('2026-05-01T06:30:00.000Z');
    expect(found?.durationSeconds).toBe(3600.5);
    expect(found?.distanceMeters).toBe(10250.75);
    expect(found?.rawPayload).toEqual({
      activityId: 12345678901,
      activityName: 'Sortie matinale',
    });
    expect(found?.createdAt).toBeInstanceOf(Date);
    expect(found?.updatedAt).toBeInstanceOf(Date);
  });

  it('relit une activité par garminActivityId', async () => {
    await prisma.activity.create({ data: buildActivity() });

    const found = await prisma.activity.findUnique({
      where: { garminActivityId: '12345678901' },
    });

    expect(found?.type).toBe('running');
  });

  it('rejette un second enregistrement avec le même garminActivityId (P2002)', async () => {
    await prisma.activity.create({ data: buildActivity() });

    await expect(
      prisma.activity.create({ data: buildActivity({ type: 'cycling' }) }),
    ).rejects.toMatchObject({ code: 'P2002' });

    expect(await prisma.activity.count()).toBe(1);
  });

  it('accepte deux activités avec des garminActivityId différents', async () => {
    await prisma.activity.create({ data: buildActivity() });
    await prisma.activity.create({
      data: buildActivity({ garminActivityId: '12345678902' }),
    });

    expect(await prisma.activity.count()).toBe(2);
  });

  it('accepte une distance nulle et la relit à null', async () => {
    const created = await prisma.activity.create({
      data: buildActivity({ distanceMeters: null }),
    });

    const found = await prisma.activity.findUnique({
      where: { id: created.id },
    });

    expect(found?.distanceMeters).toBeNull();
  });
});
