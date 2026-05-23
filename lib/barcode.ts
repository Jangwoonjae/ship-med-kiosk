import { getMedicineByBarcode } from './medicines';
import { getMssqlPool } from './mssql';
import { searchBarcodeFromSite } from './barcode-scraper';
import type { Medicine } from './schema';

interface ScrapeData {
  name?: string;
  spec?: string;
  company?: string;
  form?: string;
  barcode?: string;
}

interface MssqlMedicine {
  name?: string;
  spec?: string;
  barcode?: string;
  packQty?: number;
  productId?: string;
}

export async function lookupBarcode(barcode: string): Promise<{
  matched: boolean;
  source: 'local' | 'mssql' | 'scrape' | 'none';
  medicine?: Medicine | MssqlMedicine;
  scrapeData?: ScrapeData;
  error?: string;
}> {
  try {
    // 1. Turso 로컬 DB 조회
    const local = await getMedicineByBarcode(barcode);
    if (local) return { matched: true, source: 'local', medicine: local };

    // 2. MSSQL tblBarcodeinBox 조회
    try {
      const pool = await getMssqlPool();
      const result = await pool.request()
        .input('Search', barcode)
        .query(`
          SELECT TOP 1
            BoxBarcode AS barcode,
            BoxBarName AS name,
            BoxBarSpec AS spec,
            BoxBarinQty AS packQty,
            BoxBarPrID AS productId
          FROM tblBarcodeinBox
          WHERE BoxBarcode LIKE '%' + @Search + '%'
             OR BoxBarPrID LIKE '%' + @Search + '%'
        `);

      const row = result.recordset[0];
      if (row) {
        return {
          matched: true,
          source: 'mssql',
          medicine: {
            name: row.name,
            spec: row.spec,
            barcode: row.barcode,
            packQty: row.packQty,
            productId: row.productId,
          },
        };
      }
    } catch (mssqlError) {
      console.error('MSSQL 바코드 쿼리 오류:', mssqlError);
    }

    // 3. 웹 스크래핑으로 조회
    const scraped = await searchBarcodeFromSite(barcode);
    if (scraped.matched) {
      return {
        matched: true,
        source: 'scrape',
        scrapeData: {
          name: scraped.name,
          spec: scraped.spec,
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
    console.error('MSSQL 바코드 쿼리 오류:', error);
    return { matched: false, source: 'none', error: String(error) };
  }
}
