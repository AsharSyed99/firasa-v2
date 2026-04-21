import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    mode: 'serverless',
  });
}
