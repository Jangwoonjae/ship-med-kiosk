import { NextResponse } from 'next/server';

const API_KEY = process.env.DRUG_API_KEY ?? '';
const keyword = '모드코프';

async function testUrl(label: string, url: string) {
  try {
    const res = await fetch(url);
    const raw = await res.text();
    return { label, status: res.status, rawResponse: raw.slice(0, 500) };
  } catch (e) {
    return { label, status: 0, error: String(e) };
  }
}

export async function GET() {
  const url1 = `https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService06/getDrugPrdtPrmsnDtlInq06?serviceKey=${API_KEY}&item_name=${encodeURIComponent(keyword)}&type=json&numOfRows=3&pageNo=1`;
  const url2 = `https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList?serviceKey=${API_KEY}&itemName=${encodeURIComponent(keyword)}&type=json&numOfRows=3&pageNo=1`;
  const url3 = `https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService01/getMdcinGrnIdntfcInfoList01?serviceKey=${API_KEY}&item_name=${encodeURIComponent(keyword)}&type=json&numOfRows=3&pageNo=1`;

  const [r1, r2, r3] = await Promise.all([
    testUrl('DrugPrdtPrmsnInfoService06', url1),
    testUrl('DrbEasyDrugInfoService', url2),
    testUrl('MdcinGrnIdntfcInfoService01', url3),
  ]);

  return NextResponse.json({ keyword, results: [r1, r2, r3] });
}
