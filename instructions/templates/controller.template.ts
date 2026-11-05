// Squelette — à copier/renommer dans presentation/http/controllers/<name>.controller.ts puis adapter.
// Exclu du build/lint/test du projet (voir instructions/11, section "Templates de code").
// Référence : instructions/08-api-and-boundaries.instructions.md

import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
// import { ValidateExampleUseCase } from '../../../application/use-cases/validate-example.use-case';
// import { CreateExampleRequestDto, ExampleResponseDto } from '../dtos/example.dto';

/**
 * Inbound Adapter : traduit la requête HTTP en appel de Use Case, puis le résultat en Transport DTO.
 * Ne contient AUCUNE règle métier ni accès direct à un Repository.
 */
@Controller('examples')
export class ExamplesController {
  constructor(/* private readonly validateExample: ValidateExampleUseCase */) {}

  @Post(':id/validate')
  @HttpCode(200)
  async validate(@Param('id') id: string /*, @Body() dto: CreateExampleRequestDto */): Promise<unknown /* ExampleResponseDto */> {
    // const applicationDto = await this.validateExample.execute(id);
    // return ExampleResponseDto.fromApplicationDto(applicationDto);
    // Les Business Errors remontées du Use Case sont traduites par les filtres globaux (voir 08) — pas de try/catch ici.
    throw new Error('Not implemented — squelette à compléter');
  }
}
