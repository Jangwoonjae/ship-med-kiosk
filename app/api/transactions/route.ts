import { NextRequest, NextResponse } from 'next/server';
import { listTransactions, recordTransaction, recordBatchOut } from '@/lib/transactions';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const rows = await listTransactions({
      medicineId: sp.get('medicineId') ? Number(sp.get('medicineId')) : undefined,
      type: sp.get('type') ?? undefined,
      dateFrom: sp.get('dateFrom') ?? undefined,
      dateTo: sp.get('dateTo') ?? undefined,
      search: sp.get('search') ?? undefined,
    });

    if (sp.get('csv') === '1') {
      const header = '날짜,유형,품목명(한),품목명(영),수량,처리자,메모';
      const lines = rows.map(r =>
        [r.created_at, r.type === 'in' ? '입고' : r.type === 'out' ? '출고' : '조정',
          r.name_ko ?? '', r.name_en ?? '', r.quantity, r.actor, r.note].join(',')
      );
      const csv = '﻿' + [header, ...lines].join('\n');
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="transactions.csv"',
        },
      });
    }

    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: '이력 조회 실패' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (Array.isArray(body.items)) {
      const results = await recordBatchOut(body.items, body.actor ?? '선원');
      return NextResponse.json(results, { status: 201 });
    }

    const result = await recordTransaction({
      medicine_id: body.medicine_id,
      type: body.type,
      quantity: body.quantity,
      actor: body.actor ?? '관리자',
      note: body.note,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '처리 실패';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
