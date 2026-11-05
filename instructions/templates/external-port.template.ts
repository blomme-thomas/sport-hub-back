// Squelette — à copier/renommer dans domain/ports/outbound/<name>.port.ts puis adapter.
// Pour un Outbound Port non-persistance : client externe, IA, horloge, générateur d'identifiants, etc.
// Exemples concrets du dépôt : garmin-connect-client.port.ts, workout-ai-generator.port.ts (voir 11, "Spécificités du domaine").
// Exclu du build/lint/test du projet (voir instructions/11, section "Templates de code").
// Référence : instructions/04-hexagonal-architecture.instructions.md, instructions/08-api-and-boundaries.instructions.md

/**
 * Outbound Port : contrat exprimé en langage du domaine, pas en termes du système externe.
 * Le Domain/Application ne connaît ni le SDK, ni le format de réponse du système tiers.
 */
export interface IExampleGateway {
  fetchSomething(input: { reference: string }): Promise<ExampleGatewayResult>;
}

export interface ExampleGatewayResult {
  reference: string;
  value: number;
}

export const EXAMPLE_GATEWAY = Symbol('EXAMPLE_GATEWAY');
