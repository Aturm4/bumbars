import { getGameState } from '@/lib/server/game';
import { apiFailure } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(await getGameState());
  } catch (error) {
    return apiFailure(error);
  }
}
