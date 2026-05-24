const API_KEY = process.env.DRUG_API_KEY ?? '';
const BASE_URL = 'https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList';
const DRUG_DETAIL_URL = 'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService04/getDrugPrdtPrmsnDtlInq03';

function extractKeyword(productName: string): string {
  return productName
    .split('(')[0]
    .replace(/[0-9]/g, '')
    .replace(/mg|ml|%/gi, '')
    .trim()
    .slice(0, 10);
}

export async function searchIngredientByName(productName: string): Promise<string | null> {
  if (!API_KEY) return null;

  try {
    const keyword = extractKeyword(productName);

    const url = new URL(DRUG_DETAIL_URL);
    url.searchParams.set('serviceKey', API_KEY);
    url.searchParams.set('item_name', keyword);
    url.searchParams.set('type', 'json');
    url.searchParams.set('numOfRows', '3');
    url.searchParams.set('pageNo', '1');

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const items = data?.body?.items;
    if (!items || items.length === 0) return null;

    const first = items[0];
    return first.MAIN_ITEM_INGR ?? first.INGR_NAME ?? null;

  } catch (error) {
    console.error('식약처 성분 API 오류:', error);
    return null;
  }
}

export async function searchDrugByName(productName: string): Promise<string | null> {
  if (!API_KEY) {
    console.warn('DRUG_API_KEY 미설정');
    return null;
  }

  try {
    const keyword = extractKeyword(productName);

    const url = new URL(BASE_URL);
    url.searchParams.set('serviceKey', API_KEY);
    url.searchParams.set('itemName', keyword);
    url.searchParams.set('type', 'json');
    url.searchParams.set('numOfRows', '5');
    url.searchParams.set('pageNo', '1');

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const items = data?.body?.items;
    if (!items || items.length === 0) return null;

    const first = items[0];

    const nameMatch = first.itemName?.match(/\(([^)]+)\)/);
    if (nameMatch) return nameMatch[1];

    const efcy = first.efcyQesitm ?? '';
    return efcy.slice(0, 50) || null;

  } catch (error) {
    console.error('식약처 API 오류:', error);
    return null;
  }
}
