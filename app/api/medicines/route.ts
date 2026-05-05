import { NextRequest, NextResponse } from 'next/server';
import { listMedicines, createMedicine, getSummaryStats } from '@/lib/medicines';

console.log('TURSO_URL:', process.env.TURSO_DATABASE_URL?.slice(0,30))
console.log('TURSO_TOKEN exists:', !!process.env.TURSO_AUTH_TOKEN)

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const category = sp.get('category') ?? undefined;
    const search = sp.get('search') ?? undefined;
    const status = sp.get('status') as 'normal' | 'warning' | 'critical' | null;
    const routeType = sp.get('routeType') ?? 'international';
    const summary = sp.get('summary') === '1';

    if (summary) {
      return NextResponse.json(await getSummaryStats(routeType));
    }

    const items = await listMedicines({ category, search, status: status ?? undefined, routeType });
    return NextResponse.json(items);
  } catch (e) {
    return NextResponse.json({ error: '목록 조회 실패' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const item = await createMedicine(body);
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '등록 실패';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
