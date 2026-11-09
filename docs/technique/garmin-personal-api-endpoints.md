# Catalogue des endpoints de l'API Garmin Personal

Catalogue des 26 opérations de la spécification officielle, avec leur utilité pour les stories #11 (statistiques d'entraînement) et #12 (génération de séances par IA). Authentification et format du jeton : voir [API Garmin Personal](garmin-personal-api.md). Hypothèses de la synchronisation #8 : voir [garmin-sync](contextes/garmin-sync.md).

## Source et portée

- Source : [`garmin/swagger.json`](garmin/swagger.json), spécification OpenAPI 3.0.1 (titre « Garmin Connect Personal API », version 1.0.0), versionnée dans le dépôt (commit `290a3a3`).
- 26 opérations, toutes en `GET` (`paths.<chemin>.get`), regroupées par tags : Activity, Health, Women's Health, User Profile. 109 schémas (`components.schemas`).
- Serveurs déclarés (`servers`) : `https://personal.connectapi.garmin.com` (utilisé par `sport-hub-back`) et `https://personal.connectapi.garmin.cn`.
- La spécification ne contient ni `securitySchemes` ni `security` : **aucun scope n'est déclaré**. Le scope de chaque opération est donc indiqué « non précisé par la spécification ».
- Le point d'échange de la clé contre un jeton (`personalapitoken-service`) **n'est pas dans la spécification**.
- Aucun appel réel n'a été fait : la spécification fait foi pour cette story. Le comportement réel reste à vérifier.
- Convention de citation des sources : `chemin` + méthode + champ du Swagger, par exemple `GET /activitylist-service/activities/search/activities` → `responses.200`.

## Légende

- **Utilité** :
  - **oui** : donnée utile à la story visée, à intégrer ;
  - **peut-être** : utile sous condition, à arbitrer dans la story visée ;
  - **non** : pas de besoin identifié à ce jour.
- **Story** : #11 (statistiques), #12 (génération de séance).
- **Pagination ou plage** : `start`/`limit` pour une pagination par décalage ; `startDate`/`endDate` ou chemins `{startDate}/{endDate}` pour une plage. « Max » indique la plage maximale décrite dans la description de l'opération.
- **Scope** : « non précisé par la spécification » pour toutes les opérations (voir ci-dessus).
- **Erreurs** : codes listés dans `responses`. Un code absent n'est pas documenté, il ne signifie pas qu'il n'existe pas.

## Activités

#### E01 : `GET /activity-service/activity/{activityId}`

| Champ | Valeur |
|---|---|
| Source | `paths./activity-service/activity/{activityId}.get` |
| Paramètres | `activityId` (chemin, entier int64, **obligatoire**) |
| Réponse 200 | `ActivitySummaryDTO` (objet) : `activityId`, `activityName`, `activityTypeDTO`, `summaryDTO` (mesures, dont `startTimeGMT`, `distance`, `duration`), `splitSummaries`, `metadataDTO` |
| Erreurs | 400, 401, 403, 404, 500 |
| Pagination ou plage | Aucune (une activité) |
| Scope | non précisé par la spécification |
| Utilité | peut-être (#11) |
| Justification | Détail d'une activité (splits, métadonnées). La liste E03 suffit pour les statistiques de base. Structure différente de la liste : les champs sont imbriqués dans `summaryDTO` et `activityTypeDTO`. |

#### E02 : `GET /activity-service/activity/{activityId}/workouts`

| Champ | Valeur |
|---|---|
| Source | `paths./activity-service/activity/{activityId}/workouts.get` |
| Paramètres | `activityId` (chemin, entier int64, **obligatoire**) |
| Réponse 200 | Tableau de `ActivityWorkoutDTO` : `index`, `workoutName`, `timeCreated`, `sport`, `multisportSet`, `steps` (tableau de `WorkoutStepDTO` : `stepIndex`, `intensity`, `durationType`, `durationValue`, `targetType`, `targetValueLow`, `targetValueHigh`, etc.). Tableau vide si aucun workout (`responses.200.examples`). |
| Erreurs | 400, 401, 403, 404, 500 |
| Pagination ou plage | Aucune |
| Scope | non précisé par la spécification |
| Utilité | peut-être (#12) |
| Justification | Structure des séances réalisées (étapes, zones cibles) : contexte utile au prompt de génération. Ne concerne que les activités ayant un workout structuré. |

#### E03 : `GET /activitylist-service/activities/search/activities`

| Champ | Valeur |
|---|---|
| Source | `paths./activitylist-service/activities/search/activities.get` |
| Paramètres | **Tous optionnels** (aucun `required`). Pagination : `start` (défaut 0), `limit` (défaut 99, maximum non précisé). Tri : `sortBy` (défaut `startLocal`), `sortOrder` (défaut `desc`). Filtres : `favorite` (défaut -1, sans filtre), `excludeChildren` (défaut `true`), `search`, `activityType`, `activitySubType`, `eventType`, `minDistance`/`maxDistance` (m), `minDuration`/`maxDuration` (s), `minElapsedDuration`/`maxElapsedDuration` (s), `minElevation`/`maxElevation` (m), `startDate`/`endDate` (`YYYY-MM-DD`, date locale de l'activité, bornes incluses), `upperLatitude`/`rightLongitude`/`lowerLatitude`/`leftLongitude` (boîte englobante, les quatre ensemble), `decoDive`, `lowerMaxDepth`/`upperMaxDepth`, `minBottomTime`/`maxBottomTime`, `minAvgPower`, `excludedActivitySubType` et `requiredField` (répétables) |
| Réponse 200 | Tableau de `SummarizedActivityDTO`. Champs à plat : `activityId` (int64), `activityName`, `activityType` (`typeKey`, `parentTypeId`), `startTimeLocal` et `startTimeGMT` (`yyyy-MM-dd HH:mm:ss`, sans décalage), `distance` (m), `duration` (s), `elapsedDuration`, `movingDuration`, `elevationGain`, `averageHR`, `maxHR`, `calories`, `parentId`, `isFavorite` |
| Erreurs | 400 (type ou sous-type invalide, boîte englobante invalide ou trop grande), 401, 403, 500 |
| Pagination ou plage | Décalage : `start` + `limit`. Plage : `startDate`/`endDate` inclusives, sur la date locale. Pas de borne de profondeur documentée. |
| Scope | non précisé par la spécification |
| Utilité | oui (#11, et #12 pour l'historique récent) |
| Justification | Source principale des statistiques et du contexte d'entraînement. C'est l'endpoint utilisé par la synchronisation #8 : ses paramètres par défaut (`excludeChildren=true`, tri `desc`) et la taille de page doivent être alignés (voir les écarts). |

#### E04 : `GET /download-service/files/activity/{activityId}`

| Champ | Valeur |
|---|---|
| Source | `paths./download-service/files/activity/{activityId}.get` |
| Paramètres | `activityId` (chemin, entier int64, **obligatoire**) |
| Réponse 200 | Pas de schéma. Contenu `application/x-zip-compressed` : « Download an activity file in its original format ». Le contenu de l'archive n'est pas décrit. |
| Erreurs | Seul 200 est documenté |
| Pagination ou plage | Aucune |
| Scope | non précisé par la spécification |
| Utilité | non |
| Justification | Fichier source (FIT, etc.) livré en archive. Inutile aux statistiques et à la génération de séance tant que l'application ne lit pas de fichiers. À reconsidérer si un import de fichiers est envisagé. |

#### E05 : `GET /wellnessactivity-service/activity/summary/range/{fromDate}/{untilDate}`

| Champ | Valeur |
|---|---|
| Source | `paths./wellnessactivity-service/activity/summary/range/{fromDate}/{untilDate}.get` |
| Paramètres | `fromDate` et `untilDate` (chemin, date `YYYY-MM-DD`, **obligatoires**, bornes incluses) |
| Réponse 200 | Tableau de `WellnessActivitySummaryDTO` : `activityName`, `notes`, `calendarDate`, `wellnessActivityType` (énumération), `activityUuid`, `rulePK` |
| Erreurs | 400, 401, 403, 500 |
| Pagination ou plage | Plage `fromDate`/`untilDate`, pas de maximum documenté |
| Scope | non précisé par la spécification |
| Utilité | peut-être (#11) |
| Justification | Activités de bien-être, distinctes des activités sportives de E03 (schéma différent). À arbitrer si les statistiques doivent les inclure. |

## Récupération et forme

#### E06 : `GET /fitnessage-service/fitnessage/v2/{calendarDate}`

| Champ | Valeur |
|---|---|
| Source | `paths./fitnessage-service/fitnessage/v2/{calendarDate}.get` |
| Paramètres | `calendarDate` (chemin, date, **obligatoire**) ; `fullHistoryScan` (requête, booléen, défaut `true` ; si `false`, seuls les 28 jours précédant la date sont examinés) |
| Réponse 200 | Tableau de `FitnessAgeDTO` : `chronologicalAge`, `fitnessAge`, `achievableFitnessAge`, `previousFitnessAge`, `components` (`FitnessAgeComponent`), `invalidReason` |
| Erreurs | Seul 200 est documenté |
| Pagination ou plage | Date unique ; historique complet ou 28 jours selon `fullHistoryScan` |
| Scope | non précisé par la spécification |
| Utilité | peut-être (#11) |
| Justification | Indicateur synthétique de condition physique. Sa signification métier pour l'application reste à valider. |

#### E07 : `GET /hrv-service/hrv/{calendarDate}`

| Champ | Valeur |
|---|---|
| Source | `paths./hrv-service/hrv/{calendarDate}.get` |
| Paramètres | `calendarDate` (chemin, date, **obligatoire**) |
| Réponse 200 | `HrvChartDTO` (objet) : `hrvSummary` (`HrvSummaryDTO`), `hrvReadings` (tableau de `HrvReadingDTO`), horodatages `startTimestampGMT`/`endTimestampGMT`/`startTimestampLocal`/`endTimestampLocal` |
| Erreurs | 204 « No data » (pas de contenu) ; pas d'autre code documenté |
| Pagination ou plage | Date unique |
| Scope | non précisé par la spécification |
| Utilité | peut-être (#12) |
| Justification | Variabilité de la fréquence cardiaque, signal de récupération. Absent certains jours (204) : à traiter comme une donnée optionnelle. |

#### E08 : `GET /hrv-service/hrv/daily/{fromDate}/{toDate}`

| Champ | Valeur |
|---|---|
| Source | `paths./hrv-service/hrv/daily/{fromDate}/{toDate}.get` |
| Paramètres | `fromDate` et `toDate` (chemin, date, **obligatoires**) |
| Réponse 200 | `HrvDailySummaryDTO` (objet) : `hrvSummaries` (tableau de `HrvSummaryDTO`), `userProfilePk` |
| Erreurs | 204 « no data » |
| Pagination ou plage | Plage, pas de maximum documenté |
| Scope | non précisé par la spécification |
| Utilité | peut-être (#12) |
| Justification | Même information que E07 sur une plage, plus adapté à une tendance. Même réserve sur les jours sans donnée. |

#### E09 : `GET /sleep-service/sleep/dailySleep`

| Champ | Valeur |
|---|---|
| Source | `paths./sleep-service/sleep/dailySleep.get` |
| Paramètres | `date` (requête, date, **optionnel** au sens de la spécification) |
| Réponse 200 | `DailySleepDTO` (objet) : `calendarDate`, `sleepTimeSeconds` (hors siestes), `napTimeSeconds`, `sleepStartTimestampGMT`/`sleepEndTimestampGMT`, `sleepStartTimestampLocal`/`sleepEndTimestampLocal`, `sleepWindowConfirmationType` |
| Erreurs | Seul 200 est documenté |
| Pagination ou plage | Date unique |
| Scope | non précisé par la spécification |
| Utilité | oui (#12) |
| Justification | Le sommeil de la nuit précédant une séance est la donnée de récupération la plus directe pour adapter l'intensité proposée. |

#### E10 : `GET /sleep-service/sleep/dailySleepSummariesByDate`

| Champ | Valeur |
|---|---|
| Source | `paths./sleep-service/sleep/dailySleepSummariesByDate.get` |
| Paramètres | `startDate` et `endDate` (requête, date, **optionnels** au sens de la spécification) |
| Réponse 200 | Tableau de `DailySleepDTO` (même schéma que E09) |
| Erreurs | Seul 200 est documenté |
| Pagination ou plage | Plage, **max 31 jours** (description de l'opération) |
| Scope | non précisé par la spécification |
| Utilité | oui (#11) |
| Justification | Historique de sommeil sur un mois pour les statistiques de récupération. Préférable à E09 appelé jour par jour. |

#### E11 : `GET /usersummary-service/stats/hydration/daily/{startDate}/{endDate}`

| Champ | Valeur |
|---|---|
| Source | `paths./usersummary-service/stats/hydration/daily/{startDate}/{endDate}.get` |
| Paramètres | `startDate` et `endDate` (chemin, date, **obligatoires**) |
| Réponse 200 | Tableau de `UserDailyHydrationDTO` : `calendarDate`, `valueInML`, `goalInML`, `sweatLossInML`, `activityIntakeInML` |
| Erreurs | Seul 200 est documenté |
| Pagination ou plage | Plage, **max 31 jours** |
| Scope | non précisé par la spécification |
| Utilité | peut-être (#12) |
| Justification | Hydratation et pertes par la transpiration, utiles à une recommandation de séance longue ou chaude. Non indispensable à #11. |

#### E12 : `GET /usersummary-service/stats/steps/daily/{startDate}/{endDate}`

| Champ | Valeur |
|---|---|
| Source | `paths./usersummary-service/stats/steps/daily/{startDate}/{endDate}.get` |
| Paramètres | `startDate` et `endDate` (chemin, date, **obligatoires**) |
| Réponse 200 | Tableau de `StepsDailyStatDTO` : `calendarDate`, `totalSteps`, `totalDistance` (mètres), `stepGoal` |
| Erreurs | Seul 200 est documenté |
| Pagination ou plage | Plage, **max 28 jours** |
| Scope | non précisé par la spécification |
| Utilité | peut-être (#11) |
| Justification | Activité quotidienne hors séances enregistrées : complète les statistiques de charge. La même information est aussi disponible dans E15. |

#### E13 : `GET /usersummary-service/stats/stress/daily/{startDate}/{endDate}`

| Champ | Valeur |
|---|---|
| Source | `paths./usersummary-service/stats/stress/daily/{startDate}/{endDate}.get` |
| Paramètres | `startDate` et `endDate` (chemin, date, **obligatoires**) |
| Réponse 200 | Tableau de `MultiValueWellnessChartItemDTO` : `calendarDate`, `values` (dictionnaire : `overallStressLevel`, `highStressDuration`, `mediumStressDuration`, `lowStressDuration`, `restStressDuration`, durées en secondes) |
| Erreurs | Seul 200 est documenté |
| Pagination ou plage | Plage, **max 28 jours** |
| Scope | non précisé par la spécification |
| Utilité | peut-être (#12) |
| Justification | Charge de stress journalière, facteur de récupération. Les clés de `values` sont listées dans la description, pas dans un schéma typé. |

#### E14 : `GET /usersummary-service/usersummary/daily`

| Champ | Valeur |
|---|---|
| Source | `paths./usersummary-service/usersummary/daily.get` |
| Paramètres | `calendarDate` (requête, date, **optionnel** au sens de la spécification) |
| Réponse 200 | `UserDailySummaryDto` (objet) : `totalKilocalories`, `activeKilocalories`, `bmrKilocalories`, `consumedKilocalories`, `remainingKilocalories`, `totalSteps` et autres indicateurs |
| Erreurs | Seul 200 est documenté |
| Pagination ou plage | Date unique |
| Scope | non précisé par la spécification |
| Utilité | non |
| Justification | Redondant avec E15 (plage, même famille de données) pour les besoins de #11. À réévaluer si un besoin « jour courant » apparaît. |

#### E15 : `GET /usersummary-service/v2/dailysummaries`

| Champ | Valeur |
|---|---|
| Source | `paths./usersummary-service/v2/dailysummaries.get` |
| Paramètres | `startDate` et `endDate` (requête, date, **optionnels** au sens de la spécification) |
| Réponse 200 | `ApiDocumentListUserDailySummaryV2DTO` (**objet**, non tableau) : `data` (tableau de `UserDailySummaryV2DTO`, pas relu en détail) |
| Erreurs | Seul 200 est documenté |
| Pagination ou plage | Plage, **max 1 an** (description de l'opération) |
| Scope | non précisé par la spécification |
| Utilité | oui (#11) |
| Justification | Résumé quotidien sur un an (pas, calories, stress, Body Battery) : base la plus large pour les statistiques. L'enveloppe `data` doit être prise en compte. |
| Utilisation (#72) | `calories` de chaque `UserDailySummaryV2DTO` est un objet `CaloriesV2DTO` : `burnedResting` (BMR), `burnedActive`, `burnedTotal` (total de la journée). `GetDailyCaloriesUseCase` lit `burnedTotal` : sens établi par la spécification, non vérifié sur une réponse réelle. Requêtes de 90 jours au plus. |

#### E16 : `GET /wellness-service/wellness/bodyBattery/reports/daily`

| Champ | Valeur |
|---|---|
| Source | `paths./wellness-service/wellness/bodyBattery/reports/daily.get` |
| Paramètres | `startDate` et `endDate` (requête, date, **optionnels** au sens de la spécification) ; `chunks` (requête, entier int32 : nombre d'intervalles par jour) |
| Réponse 200 | Tableau de `BodyBatteryDailyReportDTO` : `date`, `charged`, `drained` (échelle 0 à 100), `startTimestampGMT`/`endTimestampGMT`, `startTimestampLocal`/`endTimestampLocal`, `bodyBatteryValuesArray` |
| Erreurs | 400, 401, 403, 500 |
| Pagination ou plage | Plage, **max 31 jours** |
| Scope | non précisé par la spécification |
| Utilité | oui (#12) |
| Justification | Énergie disponible par jour (rechargée, consommée) : indicateur de forme directement exploitable pour dimensionner une séance. |

#### E17 : `GET /wellness-service/wellness/daily/spo2acclimation/{calendarDate}`

| Champ | Valeur |
|---|---|
| Source | `paths./wellness-service/wellness/daily/spo2acclimation/{calendarDate}.get` |
| Paramètres | `calendarDate` (chemin, date, **obligatoire**) |
| Réponse 200 | `DailySpO2AndAcclimationDTO` (objet) : `calendarDate`, horodatages `startTimestampGMT`/`endTimestampGMT`/`startTimestampLocal`/`endTimestampLocal`, mesures SpO2 (schéma non relu en détail) |
| Erreurs | 400, 401, 403, 500 |
| Pagination ou plage | Date unique |
| Scope | non précisé par la spécification |
| Utilité | non |
| Justification | Saturation en oxygène et acclimatation (altitude) : pas de besoin identifié pour #11 ni #12 à ce jour. |

#### E18 : `GET /wellness-service/wellness/dailyHeartRate`

| Champ | Valeur |
|---|---|
| Source | `paths./wellness-service/wellness/dailyHeartRate.get` |
| Paramètres | `date` (requête, date, **optionnel** au sens de la spécification) |
| Réponse 200 | `DailyHeartRateDTO` (objet) : `calendarDate`, `maxHeartRate`, `minHeartRate`, `restingHeartRate`, `lastSevenDaysAvgRestingHeartRate`, horodatages |
| Erreurs | 400, 401, 403, 500 |
| Pagination ou plage | Date unique |
| Scope | non précisé par la spécification |
| Utilité | oui (#11) |
| Justification | Fréquence cardiaque de repos quotidienne : indicateur de forme de fond pour les statistiques, sans dépendre d'une activité. |

## Profil et mesures

#### E19 : `GET /biometric-service/heartRateZones/v2`

| Champ | Valeur |
|---|---|
| Source | `paths./biometric-service/heartRateZones/v2.get` |
| Paramètres | `generateDefaults` (requête, booléen, défaut `true` : génère des zones par défaut si l'utilisateur n'en a pas) |
| Réponse 200 | Tableau de `HeartRateZonesDTO` : `trainingMethod` (`HR_MAX`, `LACTATE_THRESHOLD`, `HR_RESERVE`, `CUSTOM`), `zone1Floor` à `zone5Floor`, `maxHeartRateUsed`, `restingHeartRateUsed`, `sport` (`DEFAULT`, `RUNNING`, `CYCLING`, `SWIMMING`, `ROWING`) |
| Erreurs | Seul 200 est documenté |
| Pagination ou plage | Aucune |
| Scope | non précisé par la spécification |
| Utilité | oui (#12, et #11) |
| Justification | Zones cardiaques de l'utilisateur : permettent de cibler une séance par zone et d'interpréter les temps passés en zone. |

#### E20 : `GET /goal-service/goal/user/effective/weightgoal/{startDate}/{endDate}`

| Champ | Valeur |
|---|---|
| Source | `paths./goal-service/goal/user/effective/weightgoal/{startDate}/{endDate}.get` |
| Paramètres | `startDate` et `endDate` (chemin, date, **obligatoires**) |
| Réponse 200 | `UserGoalsRangeDTO` (objet) : `userGoals` (tableau de `UserGoalDTO`), `userGoalRanges` (tableau de `UserGoalHighLowRangeDTO`) |
| Erreurs | 400, 401, 403, 500 |
| Pagination ou plage | Plage, pas de maximum documenté |
| Scope | non précisé par la spécification |
| Utilité | non |
| Justification | Objectifs de poids : hors des besoins de #11 et #12 tels que définis. |

#### E21 : `GET /userprofile-service/userprofile/settings`

| Champ | Valeur |
|---|---|
| Source | `paths./userprofile-service/userprofile/settings.get` |
| Paramètres | Aucun |
| Réponse 200 | `UserSettingsDTO` (objet) : `measurementSystem`, `timeZone`, `firstDayOfWeek`, `timeFormat`, `dateFormat`, `availableTrainingDays`, `preferredLongTrainingDays`, `hydrationMeasurementUnit`, `wheelchairModeEnabled`, entre autres |
| Erreurs | Seul 200 est documenté |
| Pagination ou plage | Aucune |
| Scope | non précisé par la spécification |
| Utilité | oui (#11) |
| Justification | Fuseau horaire et système de mesure de l'utilisateur : nécessaires pour interpréter les dates locales (paramètres `startDate` de E03) et les unités des statistiques. |

#### E22 : `GET /weight-service/weight/all/{startDate}/{endDate}`

| Champ | Valeur |
|---|---|
| Source | `paths./weight-service/weight/all/{startDate}/{endDate}.get` |
| Paramètres | `startDate` et `endDate` (chemin, date `yyyy-MM-dd`, **obligatoires**, bornes incluses, date locale) |
| Réponse 200 | Tableau de `DateWeightDTO` : `calendarDate`, `weight` (kg), `bmi`, `bodyFat`, `bodyWater`, `muscleMass`, `timestampGMT`, `weightDelta` |
| Erreurs | Seul 200 est documenté |
| Pagination ou plage | Plage, pas de maximum documenté |
| Scope | non précisé par la spécification |
| Utilité | peut-être (#11) |
| Justification | Poids pour exprimer la charge en W/kg ou en kcal par kilo. Utile seulement si #11 retient ces indicateurs. |

#### E23 : `GET /weight-service/weight/range/{startDate}/{endDate}`

| Champ | Valeur |
|---|---|
| Source | `paths./weight-service/weight/range/{startDate}/{endDate}.get` |
| Paramètres | `startDate` et `endDate` (chemin, date, **obligatoires**, bornes incluses) ; `includeAll` (requête, booléen, défaut `false` : seule la dernière pesée du jour est renvoyée) |
| Réponse 200 | `WeightRangeDTO` (objet) : `dailyWeightSummaries`, `totalAverage` (`WeightAverageDTO`), `previousDateWeight` et `nextDateWeight` (`DateWeightDTO`) |
| Erreurs | Seul 200 est documenté |
| Pagination ou plage | Plage, pas de maximum documenté |
| Scope | non précisé par la spécification |
| Utilité | peut-être (#11) |
| Justification | Version résumée de E22 (moyenne sur la plage). Même réserve : à retenir seulement si #11 a besoin du poids. |

## Nutrition

#### E24 : `GET /nutrition-service/food/logs/{date}`

| Champ | Valeur |
|---|---|
| Source | `paths./nutrition-service/food/logs/{date}.get` |
| Paramètres | `date` (chemin, `YYYY-MM-DD`, fuseau local de l'utilisateur, **obligatoire**) ; `includeGoals`, `includeNutrition`, `includeMedia` (requête, booléens, défaut `true`) ; `mealId` (requête, entier int64, optionnel) |
| Réponse 200 | `DailyNutritionSummaryDTO` (objet) : `mealDate` (obligatoire), `dailyNutritionContent`, `dailyNutritionGoals`, `mealDetails` (répartition par repas), `loggedFoodsWithServingSizes` |
| Erreurs | Seul 200 est documenté |
| Pagination ou plage | Date unique |
| Scope | non précisé par la spécification |
| Utilité | peut-être (#12) |
| Justification | Apports énergétiques et nutritionnels du jour : contexte possible pour adapter les conseils de la séance. Donnée sensible : à arbitrer par l'utilisateur avant tout usage. |

## Santé de la femme

#### E25 : `GET /periodichealth-service/menstrualcycle/summary/{calendarDate}`

| Champ | Valeur |
|---|---|
| Source | `paths./periodichealth-service/menstrualcycle/summary/{calendarDate}.get` |
| Paramètres | `calendarDate` (chemin, date, **obligatoire**) |
| Réponse 200 | `MenstrualCycleSummaryDTO` (objet) : `analysis`, `currentPhase`, `cycleType`, `dayInCycle`, `daysUntilNextPhase`, `deliveryDate`, `dueDate` |
| Erreurs | 400, 401, 403, 500 |
| Pagination ou plage | Date unique |
| Scope | non précisé par la spécification |
| Utilité | non |
| Justification | Donnée de santé intime, sans besoin identifié pour #11 ni #12. Ne pas l'appeler sans décision explicite. |

#### E26 : `GET /periodichealth-service/menstrualcycle/dayview/{calendarDate}`

| Champ | Valeur |
|---|---|
| Source | `paths./periodichealth-service/menstrualcycle/dayview/{calendarDate}.get` |
| Paramètres | `calendarDate` (chemin, date, **obligatoire**) ; `todayDate` (requête, date, optionnel) ; `reducedResponse`, `skipbm`, `includeAnalysis` (requête, booléens, défaut `false`) |
| Réponse 200 | `DetailedMenstrualCycleDayDTO` (objet) : `dayLog` (`DailyMenstrualCycleLogDTO`), `daySummary` (`MenstrualCycleSummaryDTO`), `weightGoals` (`WeightGoalRangeDTO`) |
| Erreurs | 400, 401, 403, 500 |
| Pagination ou plage | Date unique |
| Scope | non précisé par la spécification |
| Utilité | non |
| Justification | Détail journalier du cycle et des symptômes : donnée de santé intime, hors besoin identifié. |

## Écarts entre la spécification et les hypothèses de #8

Hypothèses de la synchronisation (`docs/technique/contextes/garmin-sync.md`, section « Hypothèses non vérifiées ») comparées à la spécification.

| Sujet | Hypothèse de #8 | Spécification | Statut |
|---|---|---|---|
| Endpoint | `GET /activitylist-service/activities/search/activities` | Opération E03, même chemin | Confirmé |
| Taille de page | `PAGE_SIZE` = 100 (#8) | `limit` : défaut **99**, maximum non précisé | **Corrigé** en #25 : `PAGE_SIZE` = 99 |
| Arrêt de pagination | arrêt quand une page contient moins de `PAGE_SIZE` éléments | Si Garmin plafonne `limit` en dessous de 99, une page pleine paraît incomplète et la pagination s'arrête trop tôt | **Risque**, à vérifier (non modifié en #25) |
| `startDate` | date seule `AAAA-MM-JJ`, lue en UTC | Date sur l'**heure locale** de l'activité (`startDate` et `endDate` inclusifs) | **Corrigé** en #25 : date UTC de `since` moins un jour, marge pour l'heure locale |
| `endDate` | non utilisé | Existe, inclusif | Information |
| Tri | non précisé | `sortBy` défaut `startLocal`, `sortOrder` défaut `desc` | À expliciter dans l'appel |
| Activités enfants | non précisé | `excludeChildren` défaut **`true`** : les activités enfants (jambes d'un multisport) sont exclues si le paramètre n'est pas envoyé | **Écart** à décider (hors #25) |
| Filtre favori | non précisé | `favorite` défaut -1 (aucun filtre) | Aucun écart |
| `startTimeGMT` | `AAAA-MM-JJ HH:MM:SS`, lu comme UTC | `yyyy-MM-dd HH:mm:ss` sans suffixe, GMT (`SummarizedActivityDTO`), pattern sans fraction | **Corrigé** en #25 : pattern sans fraction ; un élément avec fraction est ignoré (`warn`) |
| `activityType.typeKey` | champ `typeKey` de `activityType` | `activityType` de type `ActivityTypeDTO` avec `typeKey` | Confirmé |
| `duration` et `distance` | secondes et mètres | `duration` en secondes, `distance` en mètres (`SummarizedActivityDTO`) | Confirmé |
| `activityId` | « nombre ou texte » | Entier int64 | **Corrigé** en #25 : nombre entier sûr uniquement, une chaîne est ignorée |
| Optionnalité des champs lus | `activityId`, `activityType`, `startTimeGMT`, `duration` supposés présents | Aucun champ `required` dans `SummarizedActivityDTO` | **Justifié** : ces champs sont exigés par le Domain (`Activity`) ; `distance` reste optionnel |
| `activityName` | non lu | Nom de l'activité, non mappé | Information : conservé dans `sourcePayload` |
| Format de réponse | JSON | `application/json`, tableau de `SummarizedActivityDTO` | Confirmé pour la liste. Le téléchargement (E04) renvoie une archive non décrite |
| Pagination maximale | 50 pages (`MAX_PAGES`) | Non documenté | Non vérifié |
| Historique initial | 365 jours | Aucune borne documentée pour E03 | Non vérifié |
| Statuts 401 et 403 | refus de la clé ou du jeton | 401 : « Authentication is missing or invalid » ; 403 : « not authorized to access this endpoint » (E03) | Confirmé pour les endpoints de données |
| Hôte | `personal.connectapi.garmin.com` | Serveurs `.com` et `.cn` déclarés | Information : le `.cn` n'est pas utilisé |

Écart interne à la spécification, à prendre en compte pour #11 et #12 : la **liste** (E03, `SummarizedActivityDTO`) met `startTimeGMT`, `distance`, `duration` et `activityType` à plat, alors que le **détail** (E01, `ActivitySummaryDTO`) les range dans `summaryDTO` et `activityTypeDTO`. Les deux schémas ne sont pas interchangeables.

## Points non vérifiés restants

- **Quotas et limites de débit** : la spécification ne décrit ni quota, ni code 429, ni en-tête de limitation. Non vérifié.
- **Scopes du jeton** : aucun `securitySchemes` ni scope dans la spécification. Pour les 26 opérations, le scope reste « non précisé par la spécification ». Les scopes du jeton réel sont décrits dans [API Garmin Personal](garmin-personal-api.md) (réponse réelle, issue #7), sans lien vérifié avec les opérations.
- **Profondeur de l'historique des activités** : aucune borne documentée pour E03 (ni pour E01). Les bornes indiquées concernent les endpoints de santé (E10 : 31 jours, E13 : 28 jours, E15 : 1 an, etc.).
- **Taille maximale de `limit`** : non précisée. Le défaut de 99 est vérifié et envoyé explicitement par l'adapter.
- **Endpoint d'échange de la clé** (`personalapitoken-service`) : absent de la spécification. Ses statuts 401 ou 403 et son format restent sourcés de la réponse réelle (issue #7), pas du Swagger.
- **Format des fichiers** : le téléchargement (E04) renvoie une archive « format original », contenu non décrit. Le FIT n'est pas confirmé par la spécification.
- **Fuseau de `startDate`** : la spécification indique l'heure locale de l'activité, sans préciser le fuseau de référence si l'activité n'en a pas.
- **Comportement réel** : la spécification fait foi pour cette story. Aucun appel réel n'a été fait ; les écarts ci-dessus doivent être vérifiés avec une clé lors de la story d'alignement.

## Stories suivantes proposées

Une story par famille d'endpoints retenue. Elles ne sont pas créées : seulement proposées.

1. **Alignement de l'adapter sur la spécification** (story d'alignement mentionnée dans l'issue #24) : taille de page et arrêt de pagination (E03, `limit`), `startDate` en date locale, `excludeChildren`, tri explicite, identifiants et horodatages. Vérification avec une clé en environnement de test.
2. **Données de récupération et de forme** (E07, E08, E09, E11, E13, E16, E19) : HRV, sommeil, hydratation, stress, Body Battery, zones cardiaques. Cible : #12 (adaptation de séance).
3. **Statistiques d'entraînement et de forme** (E06, E10, E12, E15, E18, E21, E22, E23) : résumés quotidiens sur un an, sommeil sur un mois, fréquence cardiaque de repos, paramètres de l'utilisateur (unités, fuseau), poids. Cible : #11.
4. **Détail des activités** (E01, E02, E05) : détail d'une activité, workouts structurés, activités de bien-être. Cible : #12 pour les workouts, #11 pour le détail. À décider après la story 1.
5. **Nutrition** (E24) : à arbitrer par l'utilisateur, donnée sensible. Cible : #12, seulement si une décision explicite est prise.

Pas de story proposée pour E04, E14, E17, E20, E25 et E26 : pas de besoin identifié à ce jour (santé de la femme : donnée sensible, hors besoin identifié).

## Table de contrôle

Les 26 opérations de `garmin/swagger.json` (`paths.*.get`).

| # | Méthode | Chemin | Domaine | Utilité | Story |
|---|---|---|---|---|---|
| E01 | GET | `/activity-service/activity/{activityId}` | Activités | peut-être | #11 |
| E02 | GET | `/activity-service/activity/{activityId}/workouts` | Activités | peut-être | #12 |
| E03 | GET | `/activitylist-service/activities/search/activities` | Activités | oui | #11, #12 |
| E04 | GET | `/download-service/files/activity/{activityId}` | Activités | non | |
| E05 | GET | `/wellnessactivity-service/activity/summary/range/{fromDate}/{untilDate}` | Activités | peut-être | #11 |
| E06 | GET | `/fitnessage-service/fitnessage/v2/{calendarDate}` | Récupération et forme | peut-être | #11 |
| E07 | GET | `/hrv-service/hrv/{calendarDate}` | Récupération et forme | peut-être | #12 |
| E08 | GET | `/hrv-service/hrv/daily/{fromDate}/{toDate}` | Récupération et forme | peut-être | #12 |
| E09 | GET | `/sleep-service/sleep/dailySleep` | Récupération et forme | oui | #12 |
| E10 | GET | `/sleep-service/sleep/dailySleepSummariesByDate` | Récupération et forme | oui | #11 |
| E11 | GET | `/usersummary-service/stats/hydration/daily/{startDate}/{endDate}` | Récupération et forme | peut-être | #12 |
| E12 | GET | `/usersummary-service/stats/steps/daily/{startDate}/{endDate}` | Récupération et forme | peut-être | #11 |
| E13 | GET | `/usersummary-service/stats/stress/daily/{startDate}/{endDate}` | Récupération et forme | peut-être | #12 |
| E14 | GET | `/usersummary-service/usersummary/daily` | Récupération et forme | non | |
| E15 | GET | `/usersummary-service/v2/dailysummaries` | Récupération et forme | oui | #11, #72 |
| E16 | GET | `/wellness-service/wellness/bodyBattery/reports/daily` | Récupération et forme | oui | #12 |
| E17 | GET | `/wellness-service/wellness/daily/spo2acclimation/{calendarDate}` | Récupération et forme | non | |
| E18 | GET | `/wellness-service/wellness/dailyHeartRate` | Récupération et forme | oui | #11 |
| E19 | GET | `/biometric-service/heartRateZones/v2` | Profil et mesures | oui | #12, #11 |
| E20 | GET | `/goal-service/goal/user/effective/weightgoal/{startDate}/{endDate}` | Profil et mesures | non | |
| E21 | GET | `/userprofile-service/userprofile/settings` | Profil et mesures | oui | #11 |
| E22 | GET | `/weight-service/weight/all/{startDate}/{endDate}` | Profil et mesures | peut-être | #11 |
| E23 | GET | `/weight-service/weight/range/{startDate}/{endDate}` | Profil et mesures | peut-être | #11 |
| E24 | GET | `/nutrition-service/food/logs/{date}` | Nutrition | peut-être | #12 |
| E25 | GET | `/periodichealth-service/menstrualcycle/summary/{calendarDate}` | Santé de la femme | non | |
| E26 | GET | `/periodichealth-service/menstrualcycle/dayview/{calendarDate}` | Santé de la femme | non | |
