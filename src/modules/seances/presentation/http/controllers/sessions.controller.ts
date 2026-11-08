import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
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
import { CreateSessionUseCase } from '../../../application/use-cases/create-session.use-case.js';
import { DeleteSessionUseCase } from '../../../application/use-cases/delete-session.use-case.js';
import { GetSessionUseCase } from '../../../application/use-cases/get-session.use-case.js';
import { ListSessionsUseCase } from '../../../application/use-cases/list-sessions.use-case.js';
import { ReplaceSessionModulesUseCase } from '../../../application/use-cases/replace-session-modules.use-case.js';
import { UpdateSessionUseCase } from '../../../application/use-cases/update-session.use-case.js';
import { CreateSessionRequestDto } from '../dtos/create-session.request.dto.js';
import { ListSessionsRequestDto } from '../dtos/list-sessions.request.dto.js';
import { ReplaceSessionModulesRequestDto } from '../dtos/replace-session-modules.request.dto.js';
import { SessionIdParamDto } from '../dtos/session-id.param.dto.js';
import { SessionListResponseDto } from '../dtos/session-list.response.dto.js';
import { SessionResponseDto } from '../dtos/session.response.dto.js';
import { UpdateSessionRequestDto } from '../dtos/update-session.request.dto.js';
import { SessionHttpMapper } from '../mappers/session.http-mapper.js';

@ApiTags('seances')
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly createSession: CreateSessionUseCase,
    private readonly listSessions: ListSessionsUseCase,
    private readonly getSession: GetSessionUseCase,
    private readonly updateSession: UpdateSessionUseCase,
    private readonly replaceSessionModules: ReplaceSessionModulesUseCase,
    private readonly deleteSession: DeleteSessionUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      'Crée une séance planifiée, éventuellement avec ses modules ordonnés',
  })
  @ApiCreatedResponse({ type: SessionResponseDto })
  @ApiProblemResponses(400)
  async create(
    @Body() request: CreateSessionRequestDto,
  ): Promise<SessionResponseDto> {
    const dto = await this.createSession.execute(
      SessionHttpMapper.toCreateCommand(request),
    );
    return SessionHttpMapper.toResponse(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Liste les séances dont la date est comprise entre from et to (bornes incluses, 366 jours au plus)',
  })
  @ApiOkResponse({ type: SessionListResponseDto })
  @ApiProblemResponses(400)
  async list(
    @Query() request: ListSessionsRequestDto,
  ): Promise<SessionListResponseDto> {
    const dtos = await this.listSessions.execute(
      SessionHttpMapper.toListQuery(request),
    );
    return SessionHttpMapper.toListResponse(dtos);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Renvoie une séance avec ses modules ordonnés et son journal',
  })
  @ApiOkResponse({ type: SessionResponseDto })
  @ApiProblemResponses(400, 404)
  async get(@Param() params: SessionIdParamDto): Promise<SessionResponseDto> {
    const dto = await this.getSession.execute(params.id);
    return SessionHttpMapper.toResponse(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Modifie une séance ; les champs absents sont inchangés, null efface description, matériel ou points d’attention',
  })
  @ApiOkResponse({ type: SessionResponseDto })
  @ApiProblemResponses(400, 404, 409)
  async update(
    @Param() params: SessionIdParamDto,
    @Body() request: UpdateSessionRequestDto,
  ): Promise<SessionResponseDto> {
    const dto = await this.updateSession.execute(
      SessionHttpMapper.toUpdateCommand(params.id, request),
    );
    return SessionHttpMapper.toResponse(dto);
  }

  @Put(':id/modules')
  @ApiOperation({
    summary:
      'Remplace la liste ordonnée des modules d’une séance et renumérote leurs positions',
  })
  @ApiOkResponse({ type: SessionResponseDto })
  @ApiProblemResponses(400, 404, 409)
  async replaceModules(
    @Param() params: SessionIdParamDto,
    @Body() request: ReplaceSessionModulesRequestDto,
  ): Promise<SessionResponseDto> {
    const dto = await this.replaceSessionModules.execute(
      SessionHttpMapper.toReplaceModulesCommand(params.id, request),
    );
    return SessionHttpMapper.toResponse(dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Supprime une séance, réalisée ou non' })
  @ApiNoContentResponse({ description: 'Séance supprimée' })
  @ApiProblemResponses(400, 404)
  async remove(@Param() params: SessionIdParamDto): Promise<void> {
    await this.deleteSession.execute(params.id);
  }
}
