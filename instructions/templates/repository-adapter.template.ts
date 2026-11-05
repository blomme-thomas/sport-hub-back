// Squelette — à copier/renommer dans infrastructure/persistence/prisma/<name>.repository.adapter.ts puis adapter.
// Exclu du build/lint/test du projet (voir instructions/11, section "Templates de code").
// Référence : instructions/06-persistence-and-repositories.instructions.md

import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../../../../core/prisma/prisma.service';
// import { IExampleRepository } from '../../../domain/ports/outbound/example.repository.port';
// import { Example, ExampleId } from '../../../domain/entities/example.entity';
// import { ExampleMapper } from './example.mapper';

/** Outbound Adapter : implémente le Port avec Prisma. Charge/sauvegarde l'Aggregate entier et cohérent. */
@Injectable()
export class PrismaExampleRepositoryAdapter /* implements IExampleRepository */ {
  constructor(/* private readonly prisma: PrismaService */) {}

  async findById(id: unknown /* ExampleId */): Promise<unknown /* Example | null */> {
    // const record = await this.prisma.example.findUnique({ where: { id: id.toString() } });
    // return record ? ExampleMapper.toDomain(record) : null;
    throw new Error('Not implemented — squelette à compléter');
  }

  async save(example: unknown /* Example */): Promise<void> {
    // const data = ExampleMapper.toPersistence(example);
    // await this.prisma.example.upsert({ where: { id: data.id }, create: data, update: data });
    throw new Error('Not implemented — squelette à compléter');
  }

  async findOverdueExamples(thresholdDays: number): Promise<unknown[] /* Example[] */> {
    // requête de LECTURE simple ici ; pour une consultation complexe, préférer un Read Model (voir 06)
    throw new Error('Not implemented — squelette à compléter');
  }
}
