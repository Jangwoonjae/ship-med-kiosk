const BASE_URL = process.env.BARCODE_SITE_URL ?? 'https://as21.net/mr7';
const SITE_ID  = process.env.BARCODE_SITE_ID ?? '';
const SITE_PW  = process.env.BARCODE_SITE_PW ?? '';

let sessionCookie: string | null = null;
let sessionExpiry = 0;

async function login(): Promise<string> {
  const formData = new URLSearchParams();
  formData.set('webId', SITE_ID);
  formData.set('webPwd', SITE_PW);

  const loginRes = await fetch(BASE_URL + '/loginP.asp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
    },
    body: formData.toString(),
    redirect: 'manual',
  });

  const rawCookies: string[] =
    typeof (loginRes.headers as any).getSetCookie === 'function'
      ? (loginRes.headers as any).getSetCookie()
      : [loginRes.headers.get('set-cookie') ?? ''].filter(Boolean);

  const cookie = rawCookies.map(c => c.split(';')[0]).join('; ');
  sessionCookie = cookie;
  sessionExpiry = Date.now() + 30 * 60 * 1000;
  return cookie;
}

async function getSession(): Promise<string> {
  if (sessionCookie && Date.now() < sessionExpiry) {
    return sessionCookie;
  }
  return login();
}

async function parseHtml(html: string, barcode: string): Promise<{
  matched: boolean;
  name?: string;
  packQty?: string;
  form?: string;
  company?: string;
  barcode?: string;
}> {
  const { load } = await import('cheerio');
  const $ = load(html);

  const rows = $('table.table-hover tr').slice(1);
  const cols = rows.first().find('td');
  const name = cols.eq(0).text().trim();

  if (!name) return { matched: false };

  return {
    matched: true,
    name,
    packQty: cols.eq(1).text().trim(),
    form: cols.eq(2).text().trim(),
    company: cols.eq(3).text().trim(),
    barcode: cols.eq(5).text().trim() || barcode,
  };
}

export async function searchBarcodeFromSite(barcode: string): Promise<{
  matched: boolean;
  name?: string;
  spec?: string;
  company?: string;
  form?: string;
  barcode?: string;
  packQty?: string;
  error?: string;
}> {
  if (!SITE_ID || !SITE_PW) {
    return { matched: false, error: '바코드 사이트 계정 미설정' };
  }

  try {
    const encoded = barcode.replace(/[^0-9a-zA-Z]/g, '');
    const searchUrl = BASE_URL + '/dFindDicNor.asp?sortCol=0&sortDir=desc&displayLength=10&search=' + encoded;

    const doSearch = async (cookie: string) =>
      fetch(searchUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookie, 'Referer': BASE_URL + '/' },
      });

    let cookie = await getSession();
    let res = await doSearch(cookie);
    let html = await res.text();

    // 세션 만료 감지 → 재로그인 후 1회 재시도
    if (html.includes('loginP.asp') || html.includes('name="webId"')) {
      sessionCookie = null;
      cookie = await login();
      res = await doSearch(cookie);
      html = await res.text();
    }

    return parseHtml(html, barcode);

  } catch (error) {
    console.error('스크래핑 오류:', error);
    return { matched: false, error: String(error) };
  }
}
