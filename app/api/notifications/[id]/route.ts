import { respondNotification } from '@/lib/server/game';
import { apiFailure } from '@/lib/server/http';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { action?: unknown; reply?: unknown };
    return Response.json(await respondNotification(id, body));
  } catch (error) {
    return apiFailure(error);
  }
}