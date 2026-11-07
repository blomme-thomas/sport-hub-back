import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { ListDisciplinesUseCase } from '../../../application/use-cases/list-disciplines.use-case.js';
import { RenameDisciplineUseCase } from '../../../application/use-cases/rename-discipline.use-case.js';
import { DisciplineListResponseDto } from '../dtos/discipline-list.response.dto.js';
import { DisciplineResponseDto } from '../dtos/discipline.response.dto.js';
import { DisciplineTypeKeyParamDto } from '../dtos/discipline-type-key.param.dto.js';
import { UpdateDisciplineRequestDto } from '../dtos/update-discipline.request.dto.js';
import { DisciplineHttpMapper } from '../mappers/discipline.http-mapper.js';

@ApiTags('disciplines')
@Controller('disciplines')
export class DisciplinesController {
  constructor(
    private readonly listDisciplines: ListDisciplinesUseCase,
    private readonly renameDiscipline: RenameDisciplineUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Liste les disciplines connues par libellé croissant, puis par clé de type',
  })
  @ApiOkResponse({ type: DisciplineListResponseDto })
  async list(): Promise<DisciplineListResponseDto> {
    const dtos = await this.listDisciplines.execute();
    return DisciplineHttpMapper.toListResponse(dtos);
  }

  @Patch(':typeKey')
  @ApiOperation({
    summary:
      'Renomme une discipline ; sa clé de type et ses dates d’apparition sont inchangées',
  })
  @ApiOkResponse({ type: DisciplineResponseDto })
  @ApiProblemResponses(400, 404)
  async update(
    @Param() params: DisciplineTypeKeyParamDto,
    @Body() request: UpdateDisciplineRequestDto,
  ): Promise<DisciplineResponseDto> {
    const dto = await this.renameDiscipline.execute(
      DisciplineHttpMapper.toRenameCommand(params.typeKey, request),
    );
    return DisciplineHttpMapper.toResponse(dto);
  }
}
