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
import { CreateSlotUseCase } from '../../../application/use-cases/create-slot.use-case.js';
import { DeleteSlotUseCase } from '../../../application/use-cases/delete-slot.use-case.js';
import { ListSlotOccurrencesUseCase } from '../../../application/use-cases/list-slot-occurrences.use-case.js';
import { UpdateSlotUseCase } from '../../../application/use-cases/update-slot.use-case.js';
import { CreateSlotRequestDto } from '../dtos/create-slot.request.dto.js';
import { ListSlotsRequestDto } from '../dtos/list-slots.request.dto.js';
import { SlotIdParamDto } from '../dtos/slot-id.param.dto.js';
import { SlotOccurrencesResponseDto } from '../dtos/slot-occurrences.response.dto.js';
import { SlotResponseDto } from '../dtos/slot.response.dto.js';
import { UpdateSlotRequestDto } from '../dtos/update-slot.request.dto.js';
import { SlotHttpMapper } from '../mappers/slot.http-mapper.js';

@ApiTags('creneaux')
@Controller('slots')
export class SlotsController {
  constructor(
    private readonly createSlot: CreateSlotUseCase,
    private readonly updateSlot: UpdateSlotUseCase,
    private readonly deleteSlot: DeleteSlotUseCase,
    private readonly listSlotOccurrences: ListSlotOccurrencesUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      'Crée un créneau libre ou occupé, ponctuel ou hebdomadaire, en heure murale locale',
  })
  @ApiCreatedResponse({ type: SlotResponseDto })
  @ApiProblemResponses(400)
  async create(
    @Body() request: CreateSlotRequestDto,
  ): Promise<SlotResponseDto> {
    const dto = await this.createSlot.execute(
      SlotHttpMapper.toCreateCommand(request),
    );
    return SlotHttpMapper.toResponse(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Occurrences des créneaux sur une période (bornes incluses, 366 jours au plus)',
  })
  @ApiOkResponse({ type: SlotOccurrencesResponseDto })
  @ApiProblemResponses(400)
  async list(
    @Query() request: ListSlotsRequestDto,
  ): Promise<SlotOccurrencesResponseDto> {
    const dto = await this.listSlotOccurrences.execute(
      SlotHttpMapper.toListQuery(request),
    );
    return SlotHttpMapper.toOccurrencesResponse(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Modifie un créneau et sa série ; les champs absents sont inchangés',
  })
  @ApiOkResponse({ type: SlotResponseDto })
  @ApiProblemResponses(400, 404)
  async update(
    @Param() params: SlotIdParamDto,
    @Body() request: UpdateSlotRequestDto,
  ): Promise<SlotResponseDto> {
    const dto = await this.updateSlot.execute(
      SlotHttpMapper.toUpdateCommand(params.id, request),
    );
    return SlotHttpMapper.toResponse(dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Supprime un créneau et sa série' })
  @ApiNoContentResponse({ description: 'Créneau supprimé' })
  @ApiProblemResponses(400, 404)
  async remove(@Param() params: SlotIdParamDto): Promise<void> {
    await this.deleteSlot.execute(params.id);
  }
}
