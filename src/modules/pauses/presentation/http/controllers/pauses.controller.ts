import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiProblemResponses } from '../../../../../core/filters/api-problem-responses.decorator.js';
import { CreatePauseUseCase } from '../../../application/use-cases/create-pause.use-case.js';
import { DeletePauseUseCase } from '../../../application/use-cases/delete-pause.use-case.js';
import { ListPausesUseCase } from '../../../application/use-cases/list-pauses.use-case.js';
import { UpdatePauseUseCase } from '../../../application/use-cases/update-pause.use-case.js';
import { CreatePauseRequestDto } from '../dtos/create-pause.request.dto.js';
import { ListPausesRequestDto } from '../dtos/list-pauses.request.dto.js';
import { PauseIdParamDto } from '../dtos/pause-id.param.dto.js';
import { PauseResponseDto } from '../dtos/pause.response.dto.js';
import { UpdatePauseRequestDto } from '../dtos/update-pause.request.dto.js';

@ApiTags('pauses')
@Controller('pauses')
export class PausesController {
  constructor(
    private readonly createPause: CreatePauseUseCase,
    private readonly listPauses: ListPausesUseCase,
    private readonly updatePause: UpdatePauseUseCase,
    private readonly deletePause: DeletePauseUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      'Crée une pause : la planification ne propose aucune séance pendant sa durée',
  })
  @ApiCreatedResponse({ type: PauseResponseDto })
  @ApiProblemResponses(400)
  async create(
    @Body() request: CreatePauseRequestDto,
  ): Promise<PauseResponseDto> {
    const dto = await this.createPause.execute(request);
    return PauseResponseDto.fromDto(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Liste les pauses par date de début ; avec from/to, ne garde que celles qui chevauchent la période',
  })
  @ApiOkResponse({ type: PauseResponseDto, isArray: true })
  @ApiProblemResponses(400)
  async list(
    @Query() request: ListPausesRequestDto,
  ): Promise<PauseResponseDto[]> {
    const dtos = await this.listPauses.execute(request);
    return dtos.map((dto) => PauseResponseDto.fromDto(dto));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Modifie une pause ; les champs absents sont inchangés',
  })
  @ApiOkResponse({ type: PauseResponseDto })
  @ApiProblemResponses(400, 404)
  async update(
    @Param() params: PauseIdParamDto,
    @Body() request: UpdatePauseRequestDto,
  ): Promise<PauseResponseDto> {
    const dto = await this.updatePause.execute({ id: params.id, ...request });
    return PauseResponseDto.fromDto(dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Supprime une pause ; les séances existantes sont conservées',
  })
  @ApiNoContentResponse({ description: 'Pause supprimée' })
  @ApiProblemResponses(400, 404)
  async remove(@Param() params: PauseIdParamDto): Promise<void> {
    await this.deletePause.execute(params.id);
  }
}
