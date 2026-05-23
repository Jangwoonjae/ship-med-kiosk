import { readFileSync } from 'fs';
import { createClient } from '@libsql/client';
import sql from 'mssql';

// .env.local 로드
try {
  readFileSync('.env.local', 'utf-8')
    .split('\n')
    .forEach(line => {
      const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
      if (m) process.env[m[1].trim()] ??= m[2].trim();
    });
} catch {}

const mssqlConfig: sql.config = {
  server: process.env.MSSQL_HOST!,
  port: parseInt(process.env.MSSQL_PORT ?? '1433'),
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASS,
  database: process.env.MSSQL_NAME,
  options: { encrypt: false, trustServerCertificate: true, connectTimeout: 10000, requestTimeout: 10000 },
};

async function searchBarcode(pool: sql.ConnectionPool, keyword: string): Promise<string | null> {
  const res = await pool.request()
    .input('kw', sql.NVarChar, keyword)
    .query(`
      SELECT TOP 1 BoxBarcode
      FROM tblBarcodeinBox
      WHERE BoxBarName LIKE '%' + @kw + '%'
        AND BoxBarcode IS NOT NULL
        AND BoxBarcode <> ''
    `);
  return res.recordset[0]?.BoxBarcode ?? null;
}

async function main() {
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL ?? 'file:./data/ship-med.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const { rows } = await turso.execute(
    'SELECT id, name_ko, name_en, brand_name, barcode FROM medicines ORDER BY id'
  );

  console.log(`\nTurso 약품 ${rows.length}건 조회 완료\n`);

  const pool = await sql.connect(mssqlConfig);
  console.log('MSSQL 연결 완료\n');
  console.log('─'.repeat(60));

  const matched: string[] = [];
  const skipped: string[] = [];
  const unmatched: string[] = [];

  for (const row of rows) {
    const id        = row[0] as number;
    const name_ko   = row[1] as string;
    const name_en   = row[2] as string;
    const brand     = row[3] as string;
    const existing  = row[4] as string | null;

    if (existing) {
      skipped.push(`[${id}] ${name_ko} — 이미 등록됨 (${existing})`);
      continue;
    }

    // name_ko → name_en → brand_name 순으로 검색
    let barcode: string | null = null;
    let matchedBy = '';

    barcode = await searchBarcode(pool, name_ko);
    if (barcode) { matchedBy = `name_ko: ${name_ko}`; }

    if (!barcode && name_en) {
      barcode = await searchBarcode(pool, name_en);
      if (barcode) { matchedBy = `name_en: ${name_en}`; }
    }

    if (!barcode && brand) {
      barcode = await searchBarcode(pool, brand);
      if (barcode) { matchedBy = `brand_name: ${brand}`; }
    }

    if (barcode) {
      await turso.execute({
        sql: 'UPDATE medicines SET barcode = ?, updated_at = datetime(\'now\') WHERE id = ?',
        args: [barcode, id],
      });
      matched.push(`[${id}] ${name_ko} → ${barcode}  (by ${matchedBy})`);
      console.log(`✓ [${id}] ${name_ko} → ${barcode}`);
    } else {
      unmatched.push(`[${id}] ${name_ko}`);
      console.log(`✗ [${id}] ${name_ko} — 미매칭`);
    }
  }

  await pool.close();
  turso.close();

  console.log('\n' + '─'.repeat(60));
  console.log(`\n[결과 요약]`);
  console.log(`  매칭 업데이트 : ${matched.length}건`);
  console.log(`  이미 등록됨   : ${skipped.length}건`);
  console.log(`  미매칭        : ${unmatched.length}건`);

  if (matched.length > 0) {
    console.log('\n[업데이트 목록]');
    matched.forEach(m => console.log(' ', m));
  }
  if (unmatched.length > 0) {
    console.log('\n[미매칭 목록]');
    unmatched.forEach(u => console.log(' ', u));
  }
  if (skipped.length > 0) {
    console.log('\n[스킵 목록]');
    skipped.forEach(s => console.log(' ', s));
  }
}

main().catch(e => { console.error('오류:', e); process.exit(1); });
