import { Inject, Injectable } from '@nestjs/common';
import { SESSION_DISCIPLINE_FAMILIES } from '../../../../shared/domain/value-objects/sport-family.vo.js';
import { MODULE_TYPES } from '../../domain/value-objects/module-type.vo.js';
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
  /**
   * Renvoie le modèle d'un fichier d'import de séances : chaque champ à valeurs fermées porte ses valeurs possibles, avec les clés de discipline du référentiel courant.
   */
  async execute(): Promise<SessionImportTemplateDto> {
    return {
      kind: SESSION_IMPORT_KIND,
      schemaVersion: SESSION_IMPORT_SCHEMA_VERSION,
      importId: '<UUID v4 unique pour ce fichier>',
      seances: [
        {
          date: '2026-11-16',
          disciplineTypeKey: SESSION_DISCIPLINE_FAMILIES.join(' | '),
          durationMinutes: 60,
          startTime: '18:00',
          title: 'Fond en aisance',
          description: 'Séance de fond',
          targetDistanceMeters: 10000,
          targetHrZonePercentages: [10, 20, 40, 20, 10],
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
