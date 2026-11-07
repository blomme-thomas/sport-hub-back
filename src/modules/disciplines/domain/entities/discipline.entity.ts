import { DisciplineLabel } from '../value-objects/discipline-label.vo.js';
import type { DisciplineTypeKey } from '../value-objects/discipline-type-key.vo.js';

export interface DisciplineProps {
  typeKey: DisciplineTypeKey;
  label: DisciplineLabel;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

export class Discipline {
  private constructor(private readonly props: DisciplineProps) {}

  /** Crée une discipline vue pour la première fois à `seenAt` ; son libellé provisoire est la clé de type. */
  static firstSeen(typeKey: DisciplineTypeKey, seenAt: Date): Discipline {
    return new Discipline({
      typeKey,
      label: DisciplineLabel.fromTypeKey(typeKey),
      firstSeenAt: new Date(seenAt.getTime()),
      lastSeenAt: new Date(seenAt.getTime()),
    });
  }

  static reconstitute(props: DisciplineProps): Discipline {
    return new Discipline({
      typeKey: props.typeKey,
      label: props.label,
      firstSeenAt: new Date(props.firstSeenAt.getTime()),
      lastSeenAt: new Date(props.lastSeenAt.getTime()),
    });
  }

  get typeKey(): DisciplineTypeKey {
    return this.props.typeKey;
  }

  get label(): DisciplineLabel {
    return this.props.label;
  }

  get firstSeenAt(): Date {
    return new Date(this.props.firstSeenAt.getTime());
  }

  get lastSeenAt(): Date {
    return new Date(this.props.lastSeenAt.getTime());
  }

  /** Renvoie une nouvelle discipline au libellé donné ; la clé et les dates d'apparition sont conservées. */
  rename(label: DisciplineLabel): Discipline {
    return new Discipline({ ...this.props, label });
  }

  /**
   * Renvoie une nouvelle discipline dont la dernière apparition est `seenAt`, sans jamais reculer une date déjà connue.
   * Le libellé et la première apparition ne changent pas.
   */
  markSeen(seenAt: Date): Discipline {
    const lastSeenAt =
      seenAt.getTime() > this.props.lastSeenAt.getTime()
        ? new Date(seenAt.getTime())
        : this.props.lastSeenAt;
    return new Discipline({ ...this.props, lastSeenAt });
  }
}
