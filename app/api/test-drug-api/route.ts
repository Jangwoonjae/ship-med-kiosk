import { NextRequest, NextResponse } from 'next/server';
import { searchDrugByName, searchIngredientByName } from '@/lib/drugApi';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name') ?? '모드코프정';

  const ingredient = await searchIngredientByName(name);
  const drugInfo = await searchDrugByName(name);

  return NextResponse.json({
    query: name,
    ingredientFromDetailApi: ingredient,
    ingredientFromEasyApi: drugInfo,
  });
}
