# Contexte calendrier

Export ICS en lecture seule des séances planifiées, pour consulter le planning depuis l'agenda du téléphone (issue #44). Les séances avec heure de début sont horodatées (fuseau Europe/Paris). Code : `src/modules/calendrier/`. Usage mono-utilisateur.

Périmètre livré : `GET /api/calendar.ics?from&to`. Hors périmètre : import ICS, écriture vers Garmin ou tout autre agenda.

## Route

| Méthode | Chemin | Effet | Erreurs |
|---|---|---|---|
| `GET` | `/api/calendar.ics?from=AAAA-MM-JJ&to=AAAA-MM-JJ` | Renvoie un calendrier ICS (`text/calendar`) des séances planifiées de la période | 400 |

## Règles

- **Période** : `from` et `to` sont inclus. La règle de la lecture des séances s'applique : fin antérieure au début ou période de plus de 366 jours donnent 400 `SESSION_INVALID`.
- **Séances exportées** : uniquement celles au statut `planifiee`, une entrée par séance. Une séance `realisee` ou `manquee` n'apparaît pas.
- **Contenu d'une entrée** : `UID` = `<identifiant de la séance>@sport-hub`, `SUMMARY` = `<discipline> - <durée> min`, `TRANSP:TRANSPARENT`.
- **Séance avec heure de début** (`startTime`, HH:MM) : événement horodaté, `DTSTART;TZID=Europe/Paris` à l'heure de début et `DTEND;TZID=Europe/Paris` à début + durée. Un bloc `VTIMEZONE` Europe/Paris (heure d'été et d'hiver) est toujours inclus. Une fin qui dépasse minuit tombe le jour suivant.
- **Séance sans heure** : événement journée entière (`DTSTART;VALUE=DATE`), sans `DTEND`.
- **Format** : RFC 5545, fins de ligne CRLF, texte échappé (virgule, point-virgule, retour à la ligne), lignes repliées à 75 octets sans couper un caractère multi-octets. `DTSTAMP` est l'instant de génération en UTC.
- **Lecture seule** : aucune donnée n'est écrite, aucun appel externe.

## Structure

| Couche | Fichier | Rôle |
|---|---|---|
| Domain | `domain/services/ics-calendar.serializer.ts` | Produit le texte ICS (`serializeIcsCalendar`), échappement et repli |
| Domain | `domain/ports/outbound/calendar.ports.ts` | `ICalendarSessionsReader`, horloge `CalendarClock` |
| Application | `application/use-cases/export-planned-calendar.use-case.ts` | `ExportPlannedCalendarUseCase` : filtre `planifiee`, construit les événements |
| Infrastructure | `infrastructure/adapters/seances-calendar-sessions-reader.adapter.ts` | ACL vers `ListSessionsUseCase` (`seances`) |
| Presentation | `presentation/http/controllers/calendar.controller.ts` | Route `/api/calendar.ics`, en-tête `Content-Type: text/calendar` |
| Composition | `calendrier.module.ts` | Importe `SeancesModule` (façade) |

## Tests

- Unitaires : `domain/services/ics-calendar.serializer.spec.ts` (le contenu est relu par le parseur `ical.js`, en devDependency de test uniquement), `application/use-cases/export-planned-calendar.use-case.spec.ts`.
- e2e : `test/calendar.e2e-spec.ts` (une entrée par séance planifiée, séance réalisée absente, calendrier vide, validation des dates).
