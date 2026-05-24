import { NextResponse } from 'next/server';

const API_KEY = process.env.DRUG_API_KEY ?? '';
const DRUG_DETAIL_URL = 'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService04/getDrugPrdtPrmsnDtlInq03';

export async function GET() {
  const url = new URL(DRUG_DETAIL_URL);
  url.searchParams.set('serviceKey', API_KEY);
  url.searchParams.set('item_name', '모드코프');
  url.searchParams.set('type', 'json');
  url.searchParams.set('numOfRows', '3');
  url.searchParams.set('pageNo', '1');

  const res = await fetch(url.toString());
  const raw = await res.text();

  return NextResponse.json({
    url: url.toString().replace(API_KEY, 'HIDDEN'),
    status: res.status,
    rawResponse: raw.slice(0, 2000),
  });
}
