// Squelette — à copier/renommer dans presentation/http/dtos/<name>.request.dto.ts et <name>.response.dto.ts.
// Transport DTO : contrat d'échange externe, versionné — distinct de l'Application DTO et du Domain Model.
// Exclu du build/lint/test du projet (voir instructions/11, section "Templates de code").
// Référence : instructions/08-api-and-boundaries.instructions.md

import { IsInt, IsPositive, IsString } from 'class-validator';

/** Validation de FORME uniquement (type, requis, format) — les règles métier restent dans le Domain. */
export class CreateExampleRequestDto {
  @IsString()
  reference!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;
}

/** Jamais une Entity/Aggregate renvoyée directement — toujours ce DTO, construit depuis l'Application DTO. */
export class ExampleResponseDto {
  id!: string;
  status!: string;

  static fromApplicationDto(dto: { id: string; status: string }): ExampleResponseDto {
    const response = new ExampleResponseDto();
    response.id = dto.id;
    response.status = dto.status;
    return response;
  }
}
