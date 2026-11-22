import { DomainError } from '../../shared/domain/domain-error.js';
import { ExternalServiceError } from './external-service.error.js';

describe('ExternalServiceError', () => {
  it('est une erreur technique, pas une DomainError', () => {
    const error = new ExternalServiceError('garmin', 'TIMEOUT', 3);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(ExternalServiceError);
    expect(error.name).toBe('ExternalServiceError');
  });

  it('expose la cible, le type de défaillance et le nombre de tentatives', () => {
    const error = new ExternalServiceError('garmin', 'NETWORK', 3);

    expect(error.target).toBe('garmin');
    expect(error.failure).toBe('NETWORK');
    expect(error.attempts).toBe(3);
    expect(error.upstreamStatus).toBeUndefined();
  });

  it('conserve le statut amont pour une défaillance HTTP_STATUS', () => {
    const error = new ExternalServiceError('garmin', 'HTTP_STATUS', 1, 503);

    expect(error.failure).toBe('HTTP_STATUS');
    expect(error.upstreamStatus).toBe(503);
  });

  it('mentionne la cible dans le message', () => {
    const { message } = new ExternalServiceError('garmin', 'TIMEOUT', 2);

    expect(message).toContain('garmin');
  });

  it('a un message identique quelle que soit la défaillance', () => {
    const timeout = new ExternalServiceError('garmin', 'TIMEOUT', 3);
    const network = new ExternalServiceError('garmin', 'NETWORK', 1);
    const status = new ExternalServiceError('garmin', 'HTTP_STATUS', 2, 502);

    expect(network.message).toBe(timeout.message);
    expect(status.message).toBe(timeout.message);
  });

  it('ne porte aucune cause', () => {
    const error = new ExternalServiceError('garmin', 'NETWORK', 3);

    expect(error.cause).toBeUndefined();
    expect(Object.keys(error)).not.toContain('cause');
  });

  it('ne contient ni URL, ni en-tête d autorisation dans sa sérialisation', () => {
    const error = new ExternalServiceError('garmin', 'HTTP_STATUS', 3, 500);
    const serialized = JSON.stringify(error);

    expect(error.message).not.toMatch(/https?:\/\/|authorization|bearer/i);
    expect(serialized).not.toMatch(/https?:\/\/|authorization|bearer/i);
  });
});
