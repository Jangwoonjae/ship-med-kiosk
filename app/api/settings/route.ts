import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const { settings } = schema;

async function getSettings() {
  const rows = await db.select().from(settings).all();
  const map: Record<string, string> = {};
  for (const r of rows) {
    if (r.key !== 'admin_pin') map[r.key] = r.value;
  }
  return map;
}

export async function GET() {
  try {
    return NextResponse.json(await getSettings());
  } catch (e) {
    return NextResponse.json({ error: '설정 조회 실패' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.new_pin) {
      const hashed = await bcrypt.hash(body.new_pin, 10);
      await db.insert(settings).values({ key: 'admin_pin', value: hashed })
        .onConflictDoUpdate({ target: settings.key, set: { value: hashed } })
        .run();
    }

    const allowedKeys = ['ship_name', 'route_type'];
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        await db.insert(settings).values({ key, value: String(body[key]) })
          .onConflictDoUpdate({ target: settings.key, set: { value: String(body[key]) } })
          .run();
      }
    }

    return NextResponse.json(await getSettings());
  } catch (e) {
    return NextResponse.json({ error: '설정 저장 실패' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.pin) return NextResponse.json({ error: 'PIN 필요' }, { status: 400 });

    const row = await db.select().from(settings).where(eq(settings.key, 'admin_pin')).get();
    if (!row) return NextResponse.json({ ok: false, message: 'PIN 설정 없음' }, { status: 401 });

    const pin = String(body.pin);
    let match = false;
    if (row.value.startsWith('$2')) {
      match = bcrypt.compareSync(pin, row.value);
    } else {
      match = pin === row.value;
      if (match) {
        const hashed = bcrypt.hashSync(pin, 10);
        await db.insert(settings).values({ key: 'admin_pin', value: hashed })
          .onConflictDoUpdate({ target: settings.key, set: { value: hashed } })
          .run();
      }
    }

    return NextResponse.json({ ok: match });
  } catch (e) {
    return NextResponse.json({ error: '인증 실패' }, { status: 500 });
  }
}
