// Garde-fou d'architecture (npm run deps:check). Règles tirées de instructions/04 et 11 :
// presentation → application → domain ← infrastructure ; le Domain et l'Application
// n'importent ni framework, ni client, ni ORM, ni implémentation d'Adapter.
// Fichier en .cjs car package.json déclare "type": "module".

// Frameworks, clients d'I/O et ORM interdits dans le Domain et l'Application.
const IO_LIBRARIES =
  'pg|express|axios|class-validator|class-transformer|@prisma|@anthropic-ai|garmin-connect';
const NESTJS = '@nestjs';

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Pas de dépendance circulaire.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'domain-no-outer-layers',
      severity: 'error',
      comment:
        "Le Domain ne dépend ni de l'Application, ni de l'Infrastructure, ni de la Presentation (instructions/04).",
      from: { path: '^src/modules/[^/]+/domain/' },
      to: {
        path: '^src/modules/[^/]+/(application|infrastructure|presentation)/',
      },
    },
    {
      name: 'domain-no-framework-or-io',
      severity: 'error',
      comment:
        "Le Domain n'importe ni framework (NestJS), ni client, ni ORM : classes TypeScript pures (instructions/04 et 02).",
      from: { path: '^src/modules/[^/]+/domain/' },
      to: {
        path: `^(node_modules/(${NESTJS}|${IO_LIBRARIES})(/|$)|src/core/prisma/)`,
      },
    },
    {
      name: 'application-no-outer-layers',
      severity: 'error',
      comment:
        "L'Application dépend du Domain et de ses propres Ports, jamais de l'Infrastructure ni de la Presentation (instructions/04).",
      from: { path: '^src/modules/[^/]+/application/' },
      to: { path: '^src/modules/[^/]+/(infrastructure|presentation)/' },
    },
    {
      name: 'application-no-io',
      severity: 'error',
      comment:
        "L'Application n'importe ni client ni ORM (@nestjs/common reste autorisé : @Injectable, @Inject).",
      from: { path: '^src/modules/[^/]+/application/' },
      to: {
        path: `^(node_modules/(${IO_LIBRARIES})(/|$)|src/core/prisma/)`,
      },
    },
    {
      name: 'presentation-no-infrastructure',
      severity: 'error',
      comment:
        "Un Adapter n'en appelle pas un autre : la Presentation passe par l'Application (instructions/04).",
      from: { path: '^src/modules/[^/]+/presentation/' },
      to: { path: '^src/modules/[^/]+/infrastructure/' },
    },
    {
      name: 'infrastructure-no-presentation',
      severity: 'error',
      comment: "L'Infrastructure ne dépend pas de la Presentation.",
      from: { path: '^src/modules/[^/]+/infrastructure/' },
      to: { path: '^src/modules/[^/]+/presentation/' },
    },
    {
      name: 'modules-isolated',
      severity: 'warn',
      comment:
        "Un module n'importe pas l'intérieur d'un autre module sans contrat explicite (instructions/04). Avertissement : le contrat entre modules n'est pas encore défini.",
      from: { path: '^src/modules/([^/]+)/' },
      to: { path: '^src/modules/', pathNot: '^src/modules/$1/' },
    },
    {
      name: 'shared-core-no-modules',
      severity: 'error',
      comment:
        "Le transverse (src/shared, src/core) ne dépend pas des modules métier.",
      from: { path: '^src/(shared|core)/' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'not-to-spec',
      severity: 'error',
      comment: 'Le code de production ne dépend pas des fichiers de test.',
      from: { path: '^src/', pathNot: '\\.spec\\.ts$' },
      to: { path: '\\.spec\\.ts$' },
    },
    {
      name: 'not-to-dev-dependency',
      severity: 'error',
      comment:
        "Le code de production n'importe pas de devDependencies (elles ne sont pas installées en production).",
      from: { path: '^src/', pathNot: '\\.spec\\.ts$' },
      to: { dependencyTypes: ['npm-dev'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    // Le client Prisma généré n'est pas du code du projet.
    exclude: { path: '^src/core/prisma/generated' },
    tsConfig: { fileName: 'tsconfig.json' },
    // Compte aussi les imports de types.
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
