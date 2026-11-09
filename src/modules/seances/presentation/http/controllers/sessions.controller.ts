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
import { LinkSessionActivityUseCase } from '../../../application/use-cases/link-session-activity.use-case.js';
import { ListSessionOccurrencesUseCase } from '../../../application/use-cases/list-session-occurrences.use-case.js';
import { ReconcileSessionsUseCase } from '../../../application/use-cases/reconcile-sessions.use-case.js';
import { ReplaceSessionModulesUseCase } from '../../../application/use-cases/replace-session-modules.use-case.js';
import { UnlinkSessionActivityUseCase } from '../../../application/use-cases/unlink-session-activity.use-case.js';
import { UpdateSessionUseCase } from '../../../application/use-cases/update-session.use-case.js';
import { CreateSessionRequestDto } from '../dtos/create-session.request.dto.js';
import { LinkSessionActivityRequestDto } from '../dtos/link-session-activity.request.dto.js';
import { ListSessionsRequestDto } from '../dtos/list-sessions.request.dto.js';
import { ReconcileSessionsResponseDto } from '../dtos/reconcile-sessions.response.dto.js';
import { ReplaceSessionModulesRequestDto } from '../dtos/replace-session-modules.request.dto.js';
import { SessionIdParamDto } from '../dtos/session-id.param.dto.js';
import { SessionOccurrenceListResponseDto } from '../dtos/session-list.response.dto.js';
import { SessionResponseDto } from '../dtos/session.response.dto.js';
import { UpdateSessionRequestDto } from '../dtos/update-session.request.dto.js';
import { SessionHttpMapper } from '../mappers/session.http-mapper.js';

@ApiTags('seances')
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly createSession: CreateSessionUseCase,
    private readonly listSessionOccurrences: ListSessionOccurrencesUseCase,
    private readonly getSession: GetSessionUseCase,
    private readonly updateSession: UpdateSessionUseCase,
    private readonly replaceSessionModules: ReplaceSessionModulesUseCase,
    private readonly deleteSession: DeleteSessionUseCase,
    private readonly reconcileSessions: ReconcileSessionsUseCase,
    private readonly linkSessionActivity: LinkSessionActivityUseCase,
    private readonly unlinkSessionActivity: UnlinkSessionActivityUseCase,
  ) {}

  @Post('reconcile')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Rapproche automatiquement les séances planifiées de la période avec les activités du même jour et de la même discipline, sans les cas ambigus',
  })
  @ApiOkResponse({ type: ReconcileSessionsResponseDto })
  @ApiProblemResponses(400)
  async reconcile(
    @Query() request: ListSessionsRequestDto,
  ): Promise<ReconcileSessionsResponseDto> {
    const pairs = await this.reconcileSessions.execute(
      SessionHttpMapper.toListQuery(request),
    );
    return {
      items: pairs.map((pair) => ({
        sessionId: pair.sessionId,
        activityId: pair.activityId,
      })),
    };
  }

  @Put(':id/activity')
  @ApiOperation({
    summary:
      'Associe manuellement une activité du même jour à la séance, en remplaçant le lien précédent ; la séance passe à réalisée',
  })
  @ApiOkResponse({ type: SessionResponseDto })
  @ApiProblemResponses(400, 404, 409)
  async linkActivity(
    @Param() params: SessionIdParamDto,
    @Body() request: LinkSessionActivityRequestDto,
  ): Promise<SessionResponseDto> {
    const dto = await this.linkSessionActivity.execute({
      sessionId: params.id,
      activityId: request.activityId,
    });
    return SessionHttpMapper.toResponse(dto);
  }

  @Delete(':id/activity')
  @HttpCode(204)
  @ApiOperation({
    summary:
      "Dissocie l'activité liée à la séance ; le statut est conservé, et l'opération est sans effet sans lien",
  })
  @ApiNoContentResponse({ description: 'Lien dissocié' })
  @ApiProblemResponses(400, 404)
  async unlinkActivity(@Param() params: SessionIdParamDto): Promise<void> {
    await this.unlinkSessionActivity.execute(params.id);
  }

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
      'Liste les occurrences des séances entre from et to (bornes incluses, 366 jours au plus), triées par date, heure puis identifiant',
  })
  @ApiOkResponse({ type: SessionOccurrenceListResponseDto })
  @ApiProblemResponses(400)
  async list(
    @Query() request: ListSessionsRequestDto,
  ): Promise<SessionOccurrenceListResponseDto> {
    const occurrences = await this.listSessionOccurrences.execute(
      SessionHttpMapper.toListQuery(request),
    );
    return SessionHttpMapper.toOccurrenceListResponse(occurrences);
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
