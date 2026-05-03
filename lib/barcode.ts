import { getMedicineByBarcode } from './medicines';
import type { Medicine } from './schema';

interface DrugApiResult {
  ITEM_NAME?: string;
  ITEM_ENG_NAME?: string;
  MAIN_ITEM_INGR?: string;
  CLASS_NAME?: string;
  ETC_OTC_NAME?: string;
  CHART?: string;
  ITEM_PERMIT_DATE?: string;
  [key: string]: string | undefined;
}

export async function lookupBarcode(barcode: string): Promise<{
  matched: boolean;
  source: 'local' | 'api' | 'none';
  medicine?: Medicine;
  rawData?: DrugApiResult;
  error?: string;
}> {
  // 1. 로컬 DB 조회
  const local = await getMedicineByBarcode(barcode);
  if (local) return { matched: true, source: 'local', medicine: local };

  // 2. 공공데이터포털 API 호출
  const apiKey = process.env.DRUG_API_KEY;
  if (!apiKey) {
    return { matched: false, source: 'none', error: 'API 키 미설정' };
  }

  try {
    const url = new URL('https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService04/getDrugPrdtPrmsnDtlInq03');
    url.searchParams.set('serviceKey', apiKey);
    url.searchParams.set('item_seq', barcode);
    url.searchParams.set('type', 'json');
    url.searchParams.set('numOfRows', '1');

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`API ${res.status}`);

    const json = await res.json();
    const items = json?.body?.items;
    if (Array.isArray(items) && items.length > 0) {
      return { matched: true, source: 'api', rawData: items[0] as DrugApiResult };
    }
    return { matched: false, source: 'none' };
  } catch {
    return { matched: false, source: 'none', error: '바코드 미확인 — 네트워크 오류' };
  }
}
