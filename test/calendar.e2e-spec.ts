import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import ICAL from 'ical.js';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

const PROBLEM_JSON = /application\/problem\+json/;

describe('Export calendrier ICS (e2e)', () => {
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
        typeKey: 'swimming',
        label: 'Natation',
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

  async function createSession(
    date: string,
    durationMinutes: number,
  ): Promise<string> {
    const res = await http()
      .post('/api/sessions')
      .send({
        targetHrZonePercentages: [10, 20, 40, 20, 10],
        date,
        disciplineTypeKey: 'swimming',
        durationMinutes,
      })
      .expect(201);
    return res.body.id as string;
  }

  function events(ics: string) {
    const root = new ICAL.Component(ICAL.parse(ics));
    return root.getAllSubcomponents('vevent').map((event) => ({
      uid: event.getFirstPropertyValue('uid') as string,
      summary: event.getFirstPropertyValue('summary') as string,
      date: (event.getFirstPropertyValue('dtstart') as ICAL.Time).toString(),
    }));
  }

  it('renvoie un calendrier ICS avec une entrée par séance planifiée de la période', async () => {
    const first = await createSession('2099-05-04', 45);
    await createSession('2099-05-05', 60);
    await createSession('2099-06-01', 30);

    const res = await http()
      .get('/api/calendar.ics')
      .query({ from: '2099-05-01', to: '2099-05-31' })
      .expect(200)
      .expect('content-type', /text\/calendar/);

    const parsed = events(res.text);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({
      uid: `${first}@sport-hub`,
      summary: 'swimming - 45 min',
      date: '2099-05-04',
    });
  });

  it('n’exporte pas une séance réalisée comme planifiée', async () => {
    const id = await createSession('2099-05-04', 45);
    await http()
      .patch(`/api/sessions/${id}`)
      .send({ status: 'realisee' })
      .expect(200);

    const res = await http()
      .get('/api/calendar.ics')
      .query({ from: '2099-05-01', to: '2099-05-31' })
      .expect(200);

    expect(events(res.text)).toEqual([]);
  });

  it('renvoie un calendrier vide sans séance sur la période', async () => {
    const res = await http()
      .get('/api/calendar.ics')
      .query({ from: '2099-05-01', to: '2099-05-31' })
      .expect(200);

    expect(events(res.text)).toEqual([]);
  });

  it('répond 400 pour une date qui n’est pas au format AAAA-MM-JJ', async () => {
    await http()
      .get('/api/calendar.ics')
      .query({ from: '01/05/2099', to: '2099-05-31' })
      .expect(400)
      .expect('content-type', PROBLEM_JSON);
  });

  it('répond 400 quand la fin précède le début', async () => {
    await http()
      .get('/api/calendar.ics')
      .query({ from: '2099-05-31', to: '2099-05-01' })
      .expect(400);
  });
});
