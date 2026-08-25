import { updateProfile } from '@/lib/server/game';
import { apiFailure } from '@/lib/server/http';

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { name?: unknown; age?: unknown };
    return Response.json(await updateProfile(body));
  } catch (error) {
    return apiFailure(error);
  }
}