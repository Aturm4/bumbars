import { proposeAction } from '@/lib/server/game';
import { apiFailure } from '@/lib/server/http';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { intent?: unknown; kind?: unknown; targetLocationId?: unknown };
    return Response.json(await proposeAction(body), { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
