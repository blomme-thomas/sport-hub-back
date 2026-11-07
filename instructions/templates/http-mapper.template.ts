// Squelette — à copier/renommer dans presentation/http/mappers/<name>.http-mapper.ts puis adapter.
// Convertit Application DTO <-> Transport DTO. Ne contient AUCUNE règle métier ni accès à un Repository.
// Exclu du build/lint/test du projet (voir instructions/11, section "Templates de code").
// Référence : instructions/08-api-and-boundaries.instructions.md

// import { ExampleDto } from '../../../application/dtos/example.dto';
// import { ExampleResponseDto } from '../dtos/example.response.dto';
// import { ExampleRequestDto } from '../dtos/example.request.dto';

/** Mapper de présentation : traduit entre les DTO applicatifs et les DTO de transport HTTP. */
export class ExampleHttpMapper {
  static toResponse(dto: { id: string; label: string }): { id: string; label: string } /* ExampleResponseDto */ {
    return { id: dto.id, label: dto.label };
  }

  static toQuery(request: { from: string; to: string }): { from: Date; to: Date } /* Query du Use Case */ {
    return { from: new Date(`${request.from}T00:00:00.000Z`), to: new Date(`${request.to}T00:00:00.000Z`) };
  }
}
