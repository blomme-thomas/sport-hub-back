import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import ICAL from 'ical.js';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

describe('Export calendrier ICS avec heure de début (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  async function cleanup(): Promise<void> {
    await prisma.session.deleteMany();
    await prisma.discipline.deleteMany();
  }

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();
    await prisma.discipline.create({
      data: {
        typeKey: 'running',
        label: 'Course',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    await cleanup();
    await app.close();
  });

  function http() {
    return request(app.getHttpServer());
  }

  it('exporte une séance avec heure de début en événement horodaté', async () => {
    await http()
      .post('/api/sessions')
      .send({
        date: '2099-05-04',
        disciplineTypeKey: 'running',
        durationMinutes: 45,
        startTime: '18:30',
      })
      .expect(201);

    const res = await http()
      .get('/api/calendar.ics')
      .query({ from: '2099-05-01', to: '2099-05-31' })
      .expect(200);

    const root = new ICAL.Component(ICAL.parse(res.text));
    const event = root.getFirstSubcomponent('vevent');
    expect(event).not.toBeNull();
    expect(
      (event?.getFirstPropertyValue('dtstart') as ICAL.Time).toString(),
    ).toBe('2099-05-04T18:30:00');
    expect(
      (event?.getFirstPropertyValue('dtend') as ICAL.Time).toString(),
    ).toBe('2099-05-04T19:15:00');
  });

  it('répond 400 pour une heure de début mal formée', async () => {
    await http()
      .post('/api/sessions')
      .send({
        date: '2099-05-04',
        disciplineTypeKey: 'running',
        durationMinutes: 45,
        startTime: '6h30',
      })
      .expect(400);
  });

  it('permet d’effacer l’heure par PATCH avec null', async () => {
    const created = await http()
      .post('/api/sessions')
      .send({
        date: '2099-05-04',
        disciplineTypeKey: 'running',
        durationMinutes: 45,
        startTime: '18:30',
      })
      .expect(201);

    const res = await http()
      .patch(`/api/sessions/${created.body.id as string}`)
      .send({ startTime: null })
      .expect(200);

    expect(res.body.startTime).toBeNull();
  });
});
