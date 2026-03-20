import { syncArmoryLogs } from '../../../lib/actions';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Security: Check for a secret header so random people can't trigger your sync
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  await syncArmoryLogs();
  return NextResponse.json({ success: true });
}