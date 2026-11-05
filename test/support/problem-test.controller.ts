import { Body, Controller, Get, NotFoundException, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { DomainError } from '../../src/shared/domain/domain-error.js';

/** Business Error volontairement absente de DOMAIN_ERROR_STATUS (donc 422 par défaut). */
export class UnmappedTestError extends DomainError {
  readonly code = 'TEST_UNMAPPED_ERROR';

  constructor() {
    super('Règle métier de test violée');
  }
}

export class TestAddressDto {
  @IsString()
  @IsNotEmpty()
  city!: string;
}

export class TestPayloadDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(1)
  count!: number;

  @ValidateNested()
  @Type(() => TestAddressDto)
  address!: TestAddressDto;
}

/** Controller de test uniquement : fournit un déclencheur par type d'erreur. */
@Controller('test-problems')
export class ProblemTestController {
  @Get('domain-error')
  domainError(): never {
    throw new UnmappedTestError();
  }

  @Post('validate')
  validate(@Body() body: TestPayloadDto): TestPayloadDto {
    return body;
  }

  @Get('unexpected')
  unexpected(): never {
    throw new Error('secret interne');
  }

  @Get('not-found')
  notFound(): never {
    throw new NotFoundException('Ressource de test introuvable');
  }
}
