import type { ActionKind } from '@/lib/game-types';

export interface InterpretedIntent {
  kind: ActionKind;
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
    const kind: ActionKind = normalized.includes('трен') || normalized.includes('зал')
      ? 'training'
      : normalized.includes('уч') || normalized.includes('курс')
        ? 'study'
        : normalized.includes('работ') || normalized.includes('проект')
          ? 'work'
          : normalized.includes('медит') || normalized.includes('дых')
            ? 'meditation'
            : 'travel';
    return { kind, difficulty: 'ordinary', risk: kind === 'travel' ? 'medium' : 'low', relevantDomains: [kind] };
  }

  async narrate(input: { canonicalOutcome: string; visibleKnowledge: string[] }): Promise<string> {
    const context = input.visibleKnowledge.length ? ' Мир учитывает доступные персонажу сведения.' : '';
    return input.canonicalOutcome + context;
  }
}
