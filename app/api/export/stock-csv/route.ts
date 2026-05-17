import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const routeType = searchParams.get('route') ?? 'international';
  const isIntl = routeType !== 'domestic';

  const { medicines: med } = schema;
  const stdCol = isIntl ? med.std_intl : med.std_dom;

  const rows = await db.select({
    category: med.category,
    name_ko: med.name_ko,
    name_en: med.name_en,
    brand_name: med.brand_name,
    form: med.form,
    strength: med.strength,
    current_qty: med.current_qty,
    std_qty: stdCol,
    barcode: med.barcode,
  }).from(med)
    .orderBy(asc(med.category), asc(med.name_ko))
    .all();

  const getStatus = (cur: number, std: number) => {
    if (!std) return '-';
    const r = cur / std;
    if (r <= 0.5) return '긴급';
    if (r < 0.8) return '경고';
    return '정상';
  };

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  const BOM = '﻿';
  const header = '분류,성분명(한글),성분명(영문),상품명,제형,함량,현재고,기준수량,상태,바코드\n';
  const lines = rows.map(m => {
    const status = getStatus(Number(m.current_qty), Number(m.std_qty));
    return [
      m.category,
      m.name_ko,
      m.name_en,
      m.brand_name,
      m.form,
      m.strength,
      m.current_qty,
      m.std_qty,
      status,
      m.barcode ?? '',
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
  }).join('\n');

  const csv = BOM + header + lines;
  const filename = encodeURIComponent(`재고현황_${dateStr}.csv`);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
