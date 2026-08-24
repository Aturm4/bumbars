export type IntentSafetyDecision =
  | { allowed: true }
  | { allowed: false; category: 'sexual_violence' | 'severe_harm' };

const SEXUAL_VIOLENCE_PATTERNS = [
  /(?<!\p{L})изнасил\p{L}*/iu,
  /(?<!\p{L})(?:принуд\p{L}*|застав\p{L}*).{0,32}(?:секс\p{L}*|полов\p{L}*)/iu,
  /(?<!\p{L})(?:секс\p{L}*|полов\p{L}*).{0,32}(?:силой|без\s+согласия|принуд\p{L}*)/iu,
];

const SEVERE_HARM_PATTERNS = [
  /(?<!\p{L})(?:убить|убивать|зарезать|застрелить|задушить|пытать|похитить)(?!\p{L})/iu,
];

export function evaluateIntentSafety(input: string): IntentSafetyDecision {
  const normalized = input.normalize('NFKC').toLocaleLowerCase('ru-RU');
  if (SEXUAL_VIOLENCE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { allowed: false, category: 'sexual_violence' };
  }
  if (SEVERE_HARM_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { allowed: false, category: 'severe_harm' };
  }
  return { allowed: true };
}
