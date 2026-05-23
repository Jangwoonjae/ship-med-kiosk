import { getMedicineByBarcode } from './medicines';
import { searchBarcodeFromSite } from './barcode-scraper';
import type { Medicine } from './schema';

interface ScrapeData {
  name?: string;
  packQty?: string;
  company?: string;
  form?: string;
  barcode?: string;
}

export async function lookupBarcode(barcode: string): Promise<{
  matched: boolean;
  source: 'local' | 'scrape' | 'none';
  medicine?: Medicine;
  scrapeData?: ScrapeData;
  error?: string;
}> {
  try {
    // 1. Turso 로컬 DB 조회
    const local = await getMedicineByBarcode(barcode);
    if (local) return { matched: true, source: 'local', medicine: local };

    // 2. as21.net 스크래핑 조회
    const scraped = await searchBarcodeFromSite(barcode);
    if (scraped.matched) {
      return {
        matched: true,
        source: 'scrape',
        scrapeData: {
          name: scraped.name,
          packQty: scraped.packQty,
          company: scraped.company,
          form: scraped.form,
          barcode: scraped.barcode,
        },
      };
    }

    return {
      matched: false,
      source: 'none',
      error: scraped.error ?? '등록되지 않은 바코드입니다.',
    };
  } catch (error) {
    console.error('바코드 조회 오류:', error);
    return { matched: false, source: 'none', error: String(error) };
  }
}
