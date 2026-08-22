import { createRoutine } from '@/lib/server/game';
import { apiFailure } from '@/lib/server/http';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return Response.json(await createRoutine(body), { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
