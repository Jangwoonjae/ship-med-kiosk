import { NextResponse } from 'next/server';

const API_KEY = process.env.DRUG_API_KEY ?? '';
const keyword = '모드코프';

export async function GET() {
  // 1단계: DrbEasyDrugInfoService로 itemSeq 획득
  const url1 = `https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList?serviceKey=${API_KEY}&itemName=${encodeURIComponent(keyword)}&type=json&numOfRows=3&pageNo=1`;

  const res1 = await fetch(url1);
  const data1 = await res1.json();

  const items1 = data1?.body?.items;
  if (!items1 || items1.length === 0) {
    return NextResponse.json({ error: '1단계: 결과 없음', raw1: JSON.stringify(data1).slice(0, 500) });
  }

  const first = items1[0];
  const itemSeq: string = first.itemSeq ?? first.ITEM_SEQ ?? '';
  const itemName: string = first.itemName ?? first.ITEM_NAME ?? '';

  if (!itemSeq) {
    return NextResponse.json({ error: 'itemSeq 없음', step1Result: first });
  }

  // 2단계: itemSeq로 주성분 조회
  const url2 = `https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService/getDrugPrdtPrmsnDtlInq?serviceKey=${API_KEY}&item_seq=${itemSeq}&type=json`;

  const res2 = await fetch(url2);
  const raw2 = await res2.text();

  let mainIngredient: string | null = null;
  try {
    const data2 = JSON.parse(raw2);
    const items2 = data2?.body?.items;
    if (items2 && items2.length > 0) {
      mainIngredient = items2[0].MAIN_ITEM_INGR ?? items2[0].INGR_NAME ?? null;
    }
  } catch {
    // raw2에서 직접 확인 가능
  }

  return NextResponse.json({
    itemName,
    itemSeq,
    mainIngredient,
    rawStep2: raw2.slice(0, 1000),
  });
}
