import { NextResponse } from 'next/server';

const API_KEY = process.env.DRUG_API_KEY ?? '';
const keyword = encodeURIComponent('모드코프');

const apis = [
  {
    label: 'nedrug API',
    url: `https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService06/getDrugPrdtPrmsnDtlInq06?serviceKey=${API_KEY}&item_name=${keyword}&type=json&numOfRows=3&pageNo=1`,
  },
  {
    label: 'nedrug 허가 v3',
    url: `https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService03/getDrugPrdtPrmsnDtlInq03?serviceKey=${API_KEY}&item_name=${keyword}&type=json&numOfRows=3&pageNo=1`,
  },
  {
    label: 'nedrug 성분',
    url: `https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService/getMdcinGrnIdntfcInfoList?serviceKey=${API_KEY}&item_name=${keyword}&type=json&numOfRows=3&pageNo=1`,
  },
  {
    label: 'nedrug 표준코드',
    url: `https://apis.data.go.kr/B551182/msupCertImport/getdListDrugStandCode?serviceKey=${API_KEY}&ITEM_NAME=${keyword}&type=json&numOfRows=3`,
  },
];

export async function GET() {
  const results = await Promise.all(
    apis.map(async ({ label, url }) => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        const raw = await res.text();
        return { label, status: res.status, rawResponse: raw.slice(0, 300) };
      } catch (e) {
        return { label, status: 0, error: String(e) };
      }
    })
  );

  return NextResponse.json({ keyword: '모드코프', results });
}
