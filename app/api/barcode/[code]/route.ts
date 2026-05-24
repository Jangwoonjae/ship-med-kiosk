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
    if (!result.matched || result.source !== 'scrape') {
      return NextResponse.json(result);
    }

    // scrape hit — drug API → Ollama
    const scrapedName = (result.medicine as any)?.name ?? '';

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

    const promptContext = ingredientFromApi
      ? `품명: ${scrapedName}\n식약처 성분: ${ingredientFromApi}`
      : `품명: ${scrapedName}`;

    const matchedIngredient = await matchIngredient(promptContext, ingredientList);

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
