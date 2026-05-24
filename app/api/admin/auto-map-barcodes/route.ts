import { NextResponse } from 'next/server';
import { client } from '@/lib/db';
import { getSession, login } from '@/lib/barcode-scraper';

const BASE_URL = process.env.BARCODE_SITE_URL ?? 'https://as21.net/mr7';

const alternativeNames: Record<string, string[]> = {
  '히요스신부틸브로마이드': ['부스코판', 'hyoscine', '스코폴라민부틸'],
  '비타민B복합제': ['비타민B', '활력비타민', '비콤'],
  '디메칠하이드리네이트': ['드라마민', '보나링', '멀미'],
  '코데인+파라세타몰': ['코데인', 'codeine'],
  '티아민(비타민B1)': ['비타민B1', '티아민', '아리나민'],
  '경구수분보충액': ['포카리', '이온음료', '수분보충'],
  '포비돈요오드연고': ['베타딘연고', '포비돈연고', '이오포비돈'],
  '하이드로코르티손크림': ['하이드로코르티손크림', '코르티손크림'],
  '시프로플록사신점이액': ['시프로플록사신점이', '귀약'],
  '자일로메타졸린비강분무액': ['자일로메타졸린', '오트리빈', '비강'],
  '탄력붕대': ['탄력붕대', '붕대'],
  '삼각붕대': ['삼각붕대'],
  '트라마돌(경구)': ['트라마돌정', '트리돌정'],
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchBarcodesForName(nameKo: string, cookie: string): Promise<{
  barcodes: string[];
  sessionExpired: boolean;
}> {
  const url = `${BASE_URL}/dFindDicNor.asp?sortCol=0&sortDir=desc&displayLength=50&search=${encodeURIComponent(nameKo)}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Cookie': cookie,
      'Referer': BASE_URL + '/',
    },
  });
  const html = await res.text();

  if (html.includes('loginP.asp') || html.includes('name="webId"')) {
    return { barcodes: [], sessionExpired: true };
  }

  const { load } = await import('cheerio');
  const $ = load(html);

  const barcodes: string[] = [];
  $('table.table-hover tr').slice(1).each((_, row) => {
    const barcode = $(row).find('td').eq(5).text().trim();
    if (barcode && barcode.length > 5) {
      barcodes.push(barcode);
    }
  });

  return { barcodes: [...new Set(barcodes)], sessionExpired: false };
}

export async function GET() {
  try {
    // 1. barcode가 null이거나 빈 품목 전체 조회
    const result = await client.execute(
      `SELECT id, name_ko FROM medicines WHERE barcode IS NULL OR barcode = ''`
    );

    const medicines = result.rows.map(row => ({
      id: Number(row[0]),
      name_ko: String(row[1]),
    }));

    let mapped = 0;
    let failed = 0;
    const results: Array<{ name_ko: string; barcodes: string[]; status: string }> = [];

    let cookie = await getSession();

    for (const med of medicines) {
      await delay(500);

      try {
        let { barcodes, sessionExpired } = await searchBarcodesForName(med.name_ko, cookie);

        // 세션 만료 시 재로그인 후 1회 재시도
        if (sessionExpired) {
          cookie = await login();
          const retry = await searchBarcodesForName(med.name_ko, cookie);
          barcodes = retry.barcodes;
        }

        // 미발견 시 대체 검색어로 재시도
        if (barcodes.length === 0) {
          const alternatives = alternativeNames[med.name_ko] ?? [];
          for (const altName of alternatives) {
            await delay(500);
            const alt = await searchBarcodesForName(altName, cookie);
            if (alt.sessionExpired) {
              cookie = await login();
              const retry = await searchBarcodesForName(altName, cookie);
              barcodes = retry.barcodes;
            } else {
              barcodes = alt.barcodes;
            }
            if (barcodes.length > 0) break;
          }
        }

        if (barcodes.length === 0) {
          failed++;
          results.push({ name_ko: med.name_ko, barcodes: [], status: 'not_found' });
          continue;
        }

        // 바코드 저장 (여러 개는 쉼표로 구분)
        await client.execute({
          sql: `UPDATE medicines SET barcode = ?, updated_at = datetime('now') WHERE id = ?`,
          args: [barcodes.join(','), med.id],
        });

        mapped++;
        results.push({ name_ko: med.name_ko, barcodes, status: 'mapped' });

      } catch (e) {
        failed++;
        results.push({ name_ko: med.name_ko, barcodes: [], status: 'error' });
      }
    }

    return NextResponse.json({ total: medicines.length, mapped, failed, results });

  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
