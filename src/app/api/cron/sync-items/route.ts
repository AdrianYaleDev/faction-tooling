import { NextResponse } from 'next/server';
import { syncMarketValues } from '../../../lib/actions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Check for authorization header if you want to secure it like Vercel Cron does
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new NextResponse('Unauthorized', { status: 401 });
    // }

    await syncMarketValues();

    return NextResponse.json({ success: true, message: 'Market values synced successfully' });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ success: false, error: 'Failed to sync market values' }, { status: 500 });
  }
}
