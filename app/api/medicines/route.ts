import { NextRequest, NextResponse } from 'next/server';
import { listMedicines, getSummaryStats } from '@/lib/medicines';
import { client } from '@/lib/db';

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
    const {
      category = '내용약',
      name_en = '',
      name_ko = '',
      brand_name = '',
      form = '',
      strength = '',
      indication = '',
      std_intl = 0,
      std_dom = 0,
      current_qty = 0,
      barcode = null,
    } = body;

    const result = await client.execute({
      sql: `INSERT INTO medicines
            (category, name_en, name_ko, brand_name, form, strength,
             indication, std_intl, std_dom, current_qty, barcode,
             created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [category, name_en, name_ko, brand_name, form, strength,
             indication, std_intl, std_dom, current_qty, barcode],
    });

    const sel = await client.execute({
      sql: 'SELECT * FROM medicines WHERE id = ?',
      args: [result.lastInsertRowid ?? 0],
    });
    const item = Object.fromEntries(sel.columns.map((col, i) => [col, sel.rows[0][i]]));
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '등록 실패';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
