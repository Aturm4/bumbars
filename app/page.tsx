import GameApp from './GameApp';
import { requireChatGPTUser } from './chatgpt-auth';

export const dynamic = 'force-dynamic';

export default async function Page() {
  if (process.env.NODE_ENV === 'production') {
    await requireChatGPTUser('/');
  }

  return <GameApp />;
}
