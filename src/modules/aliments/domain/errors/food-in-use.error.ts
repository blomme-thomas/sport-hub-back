import { DomainError } from '../../../../shared/domain/domain-error.js';

export class FoodInUseError extends DomainError {
  readonly code = 'FOOD_IN_USE';

  constructor() {
    super(
      'Cet aliment est utilisé dans une recette : retirez-le des recettes avant de le supprimer.',
    );
  }
}
