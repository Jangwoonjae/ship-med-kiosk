import { NextRequest, NextResponse } from 'next/server';
import { getMedicineById, updateMedicine, updateMedicineQty, deleteMedicine } from '@/lib/medicines';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const item = await getMedicineById(Number(id));
  if (!item) return NextResponse.json({ error: '없음' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    let updated;
    if (typeof body.delta === 'number') {
      updated = await updateMedicineQty(Number(id), body.delta);
    } else {
      updated = await updateMedicine(Number(id), body);
    }
    if (!updated) return NextResponse.json({ error: '없음' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '수정 실패';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await deleteMedicine(Number(id));
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '삭제 실패';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
