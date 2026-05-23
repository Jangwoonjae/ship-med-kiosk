const BASE_URL = process.env.BARCODE_SITE_URL ?? 'https://as21.net/mr7';
const SITE_ID  = process.env.BARCODE_SITE_ID ?? '';
const SITE_PW  = process.env.BARCODE_SITE_PW ?? '';

let sessionCookie: string | null = null;
let sessionExpiry: number = 0;

async function getSession(): Promise<string> {
  if (sessionCookie && Date.now() < sessionExpiry) {
    return sessionCookie;
  }

  const formData = new URLSearchParams();
  formData.set('webId', SITE_ID);
  formData.set('webPwd', SITE_PW);

  const loginRes = await fetch(`${BASE_URL}/loginP.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
      'Referer': `${BASE_URL}/`,
    },
    body: formData.toString(),
    redirect: 'manual',
  });

  const rawCookies: string[] =
    typeof (loginRes.headers as any).getSetCookie === 'function'
      ? (loginRes.headers as any).getSetCookie()
      : [loginRes.headers.get('set-cookie') ?? ''].filter(Boolean);

  sessionCookie = rawCookies.map(c => c.split(';')[0]).join('; ');
  sessionExpiry = Date.now() + 30 * 60 * 1000;

  return sessionCookie;
}

export async function searchBarcodeFromSite(barcode: string): Promise<{
  matched: boolean;
  name?: string;
  packQty?: string;
  company?: string;
  form?: string;
  barcode?: string;
  error?: string;
}> {
  if (!SITE_ID || !SITE_PW) {
    return { matched: false, error: '바코드 사이트 계정 미설정' };
  }

  try {
    const cookie = await getSession();

    const searchRes = await fetch(
      `${BASE_URL}/dFindDicNor.asp?sortCol=0&sortDir=desc&displayLength=10&search=${encodeURIComponent(barcode)}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Cookie': cookie,
          'Referer': `${BASE_URL}/`,
        },
      }
    );

    const html = await searchRes.text();
    const { load } = await import('cheerio');
    const $ = load(html);

    if (html.includes('loginP.asp') || $('form input[name="webId"]').length > 0) {
      sessionCookie = null;
      return { matched: false, error: '세션 만료 — 재시도 필요' };
    }

    const rows = $('table.table-hover tr').slice(1);
    const firstRow = rows.first();
    const cols = firstRow.find('td');

    if (cols.length === 0) {
      return { matched: false };
    }

    const name    = cols.eq(0).text().trim();
    const packQty = cols.eq(1).text().trim();
    const form    = cols.eq(2).text().trim();
    const company = cols.eq(3).text().trim();
    const barcode = cols.eq(5).text().trim();

    if (!name || !barcode) return { matched: false };

    return { matched: true, name, packQty, form, company, barcode };

  } catch (error) {
    console.error('바코드 스크래핑 오류:', error);
    return { matched: false, error: '조회 중 오류: ' + String(error) };
  }
}
