import { Inject, Injectable } from '@nestjs/common';
import { MODULE_TYPES } from '../../domain/value-objects/module-type.vo.js';
import {
  DISCIPLINE_CATALOG,
  type IDisciplineCatalog,
} from '../../domain/ports/outbound/discipline-catalog.port.js';
import type { SessionImportTemplateDto } from '../dtos/session-import-template.dto.js';
import {
  SESSION_IMPORT_KIND,
  SESSION_IMPORT_SCHEMA_VERSION,
} from '../session-import-format.js';

const PERCEIVED_EFFORT_VALUES = Array.from({ length: 10 }, (_, index) =>
  String(index + 1),
).join(' | ');

@Injectable()
export class GetSessionImportTemplateUseCase {
  constructor(
    @Inject(DISCIPLINE_CATALOG)
    private readonly disciplines: IDisciplineCatalog,
  ) {}

  /**
   * Renvoie le modèle d'un fichier d'import de séances : chaque champ à valeurs fermées porte ses valeurs possibles, avec les clés de discipline du référentiel courant.
   */
  async execute(): Promise<SessionImportTemplateDto> {
    const typeKeys = await this.disciplines.listTypeKeys();
    return {
      kind: SESSION_IMPORT_KIND,
      schemaVersion: SESSION_IMPORT_SCHEMA_VERSION,
      importId: '<UUID v4 unique pour ce fichier>',
      seances: [
        {
          date: '2026-11-16',
          disciplineTypeKey:
            typeKeys.length > 0 ? typeKeys.join(' | ') : '<clé du référentiel>',
          durationMinutes: 60,
          startTime: '18:00',
          description: 'Séance de fond',
          equipment: 'Palmes',
          attentionPoints: 'Épaule droite',
          modules: [
            {
              type: MODULE_TYPES.join(' | '),
              durationMinutes: 10,
              instruction: 'Nage souple',
              targetZones: {
                'heartRate | pace | power': { min: 140, max: 160 },
              },
              perceivedEffort: PERCEIVED_EFFORT_VALUES,
            },
          ],
        },
      ],
    };
  }
}
