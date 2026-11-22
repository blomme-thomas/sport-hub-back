import { operationIdFactory } from './operation-id.js';

describe('operationIdFactory', () => {
  it('construit HealthController.check en healthCheck', () => {
    expect(operationIdFactory('HealthController', 'check')).toBe('healthCheck');
  });

  it('retire le suffixe Controller et met la méthode en majuscule initiale', () => {
    expect(operationIdFactory('WorkoutsController', 'generate')).toBe(
      'workoutsGenerate',
    );
  });

  it("ne retire pas Controller s'il n'est pas en fin de nom", () => {
    expect(operationIdFactory('ControllerHub', 'list')).toBe(
      'controllerHubList',
    );
  });
});
