import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { RequestValidationException } from './request-validation.exception.js';
import {
  MAX_VALIDATION_ERRORS,
  flattenValidationErrors,
  validationExceptionFactory,
} from './validation-exception.factory.js';

function makeError(
  property: string,
  constraints?: Record<string, string>,
  children: ValidationError[] = [],
  value?: unknown,
): ValidationError {
  const error = new ValidationError();
  error.property = property;
  error.constraints = constraints;
  error.children = children;
  if (value !== undefined) error.value = value;
  return error;
}

describe('flattenValidationErrors', () => {
  it('renvoie une liste vide sans erreur', () => {
    expect(flattenValidationErrors([])).toEqual([]);
  });

  it('convertit une contrainte en entrée field/code/message', () => {
    const result = flattenValidationErrors([
      makeError('name', { isNotEmpty: 'name should not be empty' }),
    ]);
    expect(result).toEqual([
      {
        field: 'name',
        code: 'IS_NOT_EMPTY',
        message: 'name should not be empty',
      },
    ]);
  });

  it('produit une entrée par contrainte violée', () => {
    const result = flattenValidationErrors([
      makeError('email', {
        isEmail: 'email must be an email',
        minLength: 'email must be longer than 5 characters',
      }),
    ]);
    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        { field: 'email', code: 'IS_EMAIL', message: 'email must be an email' },
        {
          field: 'email',
          code: 'MIN_LENGTH',
          message: 'email must be longer than 5 characters',
        },
      ]),
    );
  });

  it('parcourt les objets imbriqués avec un chemin pointé', () => {
    const result = flattenValidationErrors([
      makeError('address', undefined, [
        makeError('city', { isString: 'city must be a string' }),
      ]),
    ]);
    expect(result).toEqual([
      {
        field: 'address.city',
        code: 'IS_STRING',
        message: 'city must be a string',
      },
    ]);
  });

  it('utilise la notation [i] quand le parent est un tableau', () => {
    const result = flattenValidationErrors([
      makeError('items', undefined, [
        makeError('0', undefined, [
          makeError('name', { isNotEmpty: 'name should not be empty' }),
        ]),
      ]),
    ]);
    expect(result.map((e) => e.field)).toEqual(['items[0].name']);
  });

  it('gère plusieurs éléments de tableau en erreur', () => {
    const result = flattenValidationErrors([
      makeError('items', undefined, [
        makeError('0', undefined, [makeError('name', { isString: 'x' })]),
        makeError('2', undefined, [makeError('qty', { isInt: 'y' })]),
      ]),
    ]);
    expect(result.map((e) => e.field)).toEqual([
      'items[0].name',
      'items[2].qty',
    ]);
  });

  it('gère une contrainte directement sur un élément de tableau', () => {
    const result = flattenValidationErrors([
      makeError('tags', undefined, [makeError('1', { isString: 'bad tag' })]),
    ]);
    expect(result.map((e) => e.field)).toEqual(['tags[1]']);
  });

  it('gère une contrainte et des enfants sur le même noeud', () => {
    const result = flattenValidationErrors([
      makeError('address', { isObject: 'address must be an object' }, [
        makeError('city', { isString: 'city must be a string' }),
      ]),
    ]);
    expect(result.map((e) => e.field).sort()).toEqual([
      'address',
      'address.city',
    ]);
  });

  it('respecte un parentPath fourni', () => {
    const result = flattenValidationErrors(
      [makeError('city', { isString: 'x' })],
      'address',
    );
    expect(result.map((e) => e.field)).toEqual(['address.city']);
  });

  it('mappe whitelistValidation vers PROPERTY_NOT_ALLOWED', () => {
    const result = flattenValidationErrors([
      makeError('extra', {
        whitelistValidation: 'property extra should not exist',
      }),
    ]);
    expect(result).toEqual([
      {
        field: 'extra',
        code: 'PROPERTY_NOT_ALLOWED',
        message: 'property extra should not exist',
      },
    ]);
  });

  it('ignore un noeud sans contrainte ni enfant', () => {
    expect(flattenValidationErrors([makeError('ok')])).toEqual([]);
  });
});

describe('flattenValidationErrors : séparateur selon value', () => {
  const nested = (value?: unknown) =>
    makeError(
      'a',
      undefined,
      [makeError('0', undefined, [makeError('b', { isString: 'x' })])],
      value,
    );

  it('utilise a[0].b quand value du parent est un tableau', () => {
    const result = flattenValidationErrors([nested([{}])]);
    expect(result.map((e) => e.field)).toEqual(['a[0].b']);
  });

  it('utilise a.0.b quand value du parent est un objet à clés numériques', () => {
    const result = flattenValidationErrors([nested({ '0': { b: 1 } })]);
    expect(result.map((e) => e.field)).toEqual(['a.0.b']);
  });

  it('applique encore l heuristique des clés numériques sans value', () => {
    const result = flattenValidationErrors([nested()]);
    expect(result.map((e) => e.field)).toEqual(['a[0].b']);
  });
});

describe('validationExceptionFactory', () => {
  describe('plafond MAX_VALIDATION_ERRORS', () => {
    const many = (count: number) =>
      Array.from({ length: count }, (_, i) =>
        makeError(`f${i}`, { isString: `f${i} invalide` }),
      );

    it('vaut 100', () => {
      expect(MAX_VALIDATION_ERRORS).toBe(100);
    });

    it('tronque à MAX_VALIDATION_ERRORS items et conserve le total réel', () => {
      const exception = validationExceptionFactory(many(150));

      expect(exception.errors).toHaveLength(MAX_VALIDATION_ERRORS);
      expect(exception.errors[0]?.field).toBe('f0');
      expect(exception.totalErrors).toBe(150);
    });

    it('ne tronque pas à exactement 100 erreurs', () => {
      const exception = validationExceptionFactory(many(100));

      expect(exception.errors).toHaveLength(100);
      expect(exception.totalErrors).toBe(100);
    });
  });

  it('renvoie une RequestValidationException (BadRequestException) en 400', () => {
    const exception = validationExceptionFactory([
      makeError('name', { isNotEmpty: 'name should not be empty' }),
    ]);
    expect(exception).toBeInstanceOf(RequestValidationException);
    expect(exception).toBeInstanceOf(BadRequestException);
    expect(exception.getStatus()).toBe(400);
  });

  it('porte toutes les erreurs aplaties', () => {
    const exception = validationExceptionFactory([
      makeError('name', { isNotEmpty: 'a' }),
      makeError('address', undefined, [makeError('city', { isString: 'b' })]),
      makeError('extra', { whitelistValidation: 'c' }),
    ]);
    expect(exception.errors.map((e) => [e.field, e.code])).toEqual([
      ['name', 'IS_NOT_EMPTY'],
      ['address.city', 'IS_STRING'],
      ['extra', 'PROPERTY_NOT_ALLOWED'],
    ]);
  });
});
