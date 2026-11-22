// Squelette — à copier/renommer dans domain/specifications/<name>.specification.ts puis adapter.
// À utiliser seulement si la règle est réutilisée ou composée ; sinon un simple `if` dans l'Entity suffit (voir 02, 11).
// Exclu du build/lint/test du projet (voir instructions/11, section "Templates de code").
// Référence : instructions/00-glossary-and-artifacts.instructions.md §Business Rule/Policy/Specification

interface ExampleSpecification<T> {
  isSatisfiedBy(candidate: T): boolean;
}

interface ExampleSubject {
  status: string;
  lastUpdatedAt: Date;
}

/** Specification nommée et composable : exprime un prédicat métier réutilisable. */
export class ExampleIsOverdueSpecification implements ExampleSpecification<ExampleSubject> {
  constructor(private readonly thresholdDays: number) {}

  isSatisfiedBy(candidate: ExampleSubject): boolean {
    if (candidate.status === 'validated') return false;
    const elapsedMs = Date.now() - candidate.lastUpdatedAt.getTime();
    const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
    return elapsedDays > this.thresholdDays;
  }

  /** Composition : `and`/`or`/`not` au besoin, seulement si réellement utilisé. */
  and(other: ExampleSpecification<ExampleSubject>): ExampleSpecification<ExampleSubject> {
    return {
      isSatisfiedBy: (candidate) => this.isSatisfiedBy(candidate) && other.isSatisfiedBy(candidate),
    };
  }
}
