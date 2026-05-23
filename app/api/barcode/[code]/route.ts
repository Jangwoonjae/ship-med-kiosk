import { NextRequest, NextResponse } from 'next/server';
import { lookupBarcode } from '@/lib/barcode';

type Params = { params: Promise<{ code: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { code } = await params;
    const result = await lookupBarcode(code);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ matched: false, source: 'none', error: String(e) }, { status: 500 });
  }
}
