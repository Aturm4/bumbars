import { cancelProposal } from '@/lib/server/game';
import { apiFailure } from '@/lib/server/http';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return Response.json(await cancelProposal(id));
  } catch (error) {
    return apiFailure(error);
  }
}
