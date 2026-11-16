import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';

describe('Modèle d’import des séances (e2e)', () => {
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
    await prisma.session.deleteMany();
    await prisma.discipline.deleteMany();
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.discipline.deleteMany();
    await app.close();
  });

  it('renvoie le modèle avec les clés de discipline du référentiel', async () => {
    await prisma.discipline.create({
      data: {
        typeKey: 'swimming',
        label: 'Natation',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      },
    });

    const response = await request(app.getHttpServer()).get(
      '/api/sessions/import/template',
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      kind: 'plan-seances',
      schemaVersion: 1,
      seances: [
        {
          disciplineTypeKey: 'swimming',
          modules: [
            {
              type: 'echauffement | educatifs | series | retour_au_calme | autre',
            },
          ],
        },
      ],
    });
  });

  it('renvoie un emplacement pour la clé de discipline quand le référentiel est vide', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/sessions/import/template',
    );

    expect(response.status).toBe(200);
    expect(response.body.seances[0].disciplineTypeKey).toBe(
      '<clé du référentiel>',
    );
  });
});
