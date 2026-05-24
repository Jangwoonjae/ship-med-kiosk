import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/db';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await client.execute('UPDATE medicines SET current_qty = 0');
    const count = await client.execute('SELECT COUNT(*) as cnt FROM medicines');
    return NextResponse.json({
      ok: true,
      message: '전체 현재고 0으로 초기화 완료',
      count: count.rows[0],
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
