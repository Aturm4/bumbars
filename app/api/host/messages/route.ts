import { sendHostMessage } from '@/lib/server/game';
import { apiFailure } from '@/lib/server/http';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: unknown };
    return Response.json(await sendHostMessage(body), { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}