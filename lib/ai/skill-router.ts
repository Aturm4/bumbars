import type { ActionKind } from '@/lib/game-types';

export interface RoutedSkill {
  key: string;
  version: string;
  reason: string;
}

const ROUTES: Record<ActionKind, RoutedSkill[]> = {
  training: [
    { key: 'core.actions', version: 'v1', reason: 'универсальный action lifecycle' },
    { key: 'health.training', version: 'v1', reason: 'нагрузка и восстановление' },
  ],
  study: [
    { key: 'core.actions', version: 'v1', reason: 'универсальный action lifecycle' },
    { key: 'education.learning', version: 'v1', reason: 'образование и evidence' },
  ],
  work: [
    { key: 'core.actions', version: 'v1', reason: 'универсальный action lifecycle' },
    { key: 'career.employment', version: 'v1', reason: 'трудовой контракт' },
    { key: 'finance.ledger', version: 'v1', reason: 'сбалансированная проводка' },
  ],
  meditation: [
    { key: 'core.actions', version: 'v1', reason: 'универсальный action lifecycle' },
    { key: 'health.recovery', version: 'v1', reason: 'психологическое восстановление' },
  ],
  travel: [
    { key: 'core.actions', version: 'v1', reason: 'универсальный action lifecycle' },
    { key: 'world.travel', version: 'v1', reason: 'география и location capacity' },
  ],
};

export function routeSkills(kind: ActionKind): RoutedSkill[] {
  return ROUTES[kind];
}
