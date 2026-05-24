import { NextRequest, NextResponse } from 'next/server';
import { lookupBarcode } from '@/lib/barcode';
import { searchDrugByName, searchIngredientByName } from '@/lib/drugApi';
import { matchIngredient } from '@/lib/ollama';
import { client } from '@/lib/db';

type Params = { params: Promise<{ code: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { code } = await params;
    const result = await lookupBarcode(code);

    // local DB hit — return as-is
    if (result.source === 'local') {
      return NextResponse.json(result);
    }

    // scrape hit or fallback
    let scrapedName = (result.medicine as any)?.name ?? '';

    // as21.net 실패 시 식약처 API로 폴백
    if (!result.matched || !scrapedName || scrapedName === '실행 결과가 없습니다.') {
      const fallback = await searchDrugByName(code);
      if (!fallback) {
        return NextResponse.json({ matched: false, source: 'none', error: '등록되지 않은 바코드입니다.' });
      }
      scrapedName = fallback;
    }

    // 1. 식약처 API로 성분명 조회
    let ingredientFromApi: string | null = await searchIngredientByName(scrapedName);
    if (!ingredientFromApi) {
      ingredientFromApi = await searchDrugByName(scrapedName);
    }

    // 2. Ollama AI로 DB 성분명 매핑
    const allMeds = await client.execute(
      'SELECT id, name_ko FROM medicines ORDER BY name_ko'
    );
    const ingredientList = allMeds.rows.map(r => String(r[1] ?? '')).filter(Boolean);

    const productName = ingredientFromApi
      ? `${scrapedName} (식약처 성분: ${ingredientFromApi})`
      : scrapedName;

    const matchedIngredient = await matchIngredient(productName, ingredientList);

    // 3. 매핑된 성분명으로 품목 상세 조회
    let suggestedMedicine = null;
    if (matchedIngredient) {
      const found = allMeds.rows.find(r => String(r[1]) === matchedIngredient);
      if (found) {
        const detail = await client.execute({
          sql: 'SELECT * FROM medicines WHERE id = ?',
          args: [found[0]],
        });
        if (detail.rows[0]) {
          suggestedMedicine = Object.fromEntries(
            detail.columns.map((col, i) => [col, detail.rows[0][i]])
          );
        }
      }
    }

    return NextResponse.json({
      ...result,
      ingredientFromApi,
      suggestedMedicine,
      suggestedIngredient: matchedIngredient,
    });

  } catch (e) {
    return NextResponse.json({ matched: false, source: 'none', error: String(e) }, { status: 500 });
  }
}
