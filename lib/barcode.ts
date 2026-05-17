import { getMedicineByBarcode } from './medicines';
import { getMssqlPool, sql } from './mssql';
import type { Medicine } from './schema';

interface BarCodeRow {
  표준코드문자?: string;
  대표코드문자?: string;
  구바코드?: string;
  품목명?: string;
  [key: string]: string | undefined;
}

export async function lookupBarcode(barcode: string): Promise<{
  matched: boolean;
  source: 'local' | 'mssql' | 'none';
  medicine?: Medicine;
  rawData?: BarCodeRow;
  error?: string;
}> {
  // 1. Turso 로컬 DB 조회
  const local = await getMedicineByBarcode(barcode);
  if (local) return { matched: true, source: 'local', medicine: local };

  // 2. MSSQL BarCodeData 테이블 조회
  try {
    const pool = await getMssqlPool();
    const result = await pool.request()
      .input('barcode', sql.NVarChar, barcode)
      .query(`
        SELECT TOP 1 *
        FROM BarCodeData
        WHERE 표준코드문자 = @barcode
           OR 대표코드문자 = @barcode
           OR 구바코드 = @barcode
      `);

    if (result.recordset.length > 0) {
      return { matched: true, source: 'mssql', rawData: result.recordset[0] as BarCodeRow };
    }
  } catch {
    return { matched: false, source: 'none', error: 'MSSQL 조회 오류' };
  }

  return { matched: false, source: 'none', error: '등록되지 않은 바코드입니다' };
}
