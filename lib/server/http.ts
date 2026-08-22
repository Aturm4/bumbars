import { DomainError } from '@/lib/server/game';

export function apiFailure(error: unknown): Response {
  if (error instanceof DomainError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error(error);
  return Response.json(
    { error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' },
    { status: 500 },
  );
}
