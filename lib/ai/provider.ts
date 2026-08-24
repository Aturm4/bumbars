import type { ActionKind } from '@/lib/game-types';

export interface InterpretedIntent {
  kind: ActionKind | null;
  difficulty: 'easy' | 'ordinary' | 'hard';
  risk: 'none' | 'low' | 'medium' | 'high';
  relevantDomains: string[];
}

export interface AiProvider {
  readonly name: string;
  interpretIntent(input: string): Promise<InterpretedIntent>;
  narrate(input: { canonicalOutcome: string; visibleKnowledge: string[] }): Promise<string>;
}

export class DeterministicDevelopmentProvider implements AiProvider {
  readonly name = 'deterministic-development';

  async interpretIntent(input: string): Promise<InterpretedIntent> {
    const normalized = input.toLocaleLowerCase('ru-RU');
    const kind: ActionKind | null = normalized.includes('трен') || normalized.includes('зал') || normalized.includes('спорт')
      ? 'training'
      : normalized.includes('уч') || normalized.includes('курс') || normalized.includes('книг')
        ? 'study'
        : normalized.includes('работ') || normalized.includes('проект') || normalized.includes('контракт')
          ? 'work'
          : normalized.includes('медит') || normalized.includes('дых') || normalized.includes('вниман')
            ? 'meditation'
            : normalized.includes('поезд') || normalized.includes('съезд') || normalized.includes('маршрут') || normalized.includes('район')
              ? 'travel'
              : null;
    return { kind, difficulty: 'ordinary', risk: kind === 'travel' ? 'medium' : kind ? 'low' : 'none', relevantDomains: kind ? [kind] : [] };
  }

  async narrate(input: { canonicalOutcome: string; visibleKnowledge: string[] }): Promise<string> {
    const context = input.visibleKnowledge.length ? ' Мир учитывает доступные персонажу сведения.' : '';
    return input.canonicalOutcome + context;
  }
}
