import { mutateRoutine } from '@/lib/server/game';
import { apiFailure } from '@/lib/server/http';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json() as { mutation?: unknown };
    return Response.json(await mutateRoutine(id, body.mutation));
  } catch (error) {
    return apiFailure(error);
  }
}
