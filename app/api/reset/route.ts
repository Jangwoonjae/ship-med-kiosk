import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

export async function POST() {
  try {
    const setting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'route_type'))
      .get();
    const routeType = setting?.value ?? 'international';

    await db.delete(schema.transactions).run();

    const now = new Date().toISOString();
    if (routeType === 'domestic') {
      await db
        .update(schema.medicines)
        .set({ current_qty: sql`std_dom`, updated_at: now })
        .run();
    } else {
      await db
        .update(schema.medicines)
        .set({ current_qty: sql`std_intl`, updated_at: now })
        .run();
    }

    return NextResponse.json({
      success: true,
      message: `시스템 초기화 완료 (${routeType === 'domestic' ? '국내선' : '국제선'} 기준수량으로 복원)`,
      routeType,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
