import { NextRequest, NextResponse } from 'next/server';
import { listMedicines, createMedicine, getSummaryStats } from '@/lib/medicines';

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
    console.error(e);
    return Response.json({ error: String(e) }, { status: 500 });
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
