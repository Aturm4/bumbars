export interface RequestIdentity {
  playerId: string;
  source: 'DEV' | 'TELEGRAM_MINI_APP' | 'WEB';
}

export async function verifyTelegramInitData(initData: string, botToken: string): Promise<boolean> {
  const params = new URLSearchParams(initData);
  const suppliedHash = params.get('hash');
  if (!suppliedHash) return false;
  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => key + '=' + value)
    .join('\n');
  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const secret = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(botToken));
  const verificationKey = await crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', verificationKey, encoder.encode(dataCheckString));
  const calculatedHash = [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return timingSafeEqual(calculatedHash, suppliedHash);
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
