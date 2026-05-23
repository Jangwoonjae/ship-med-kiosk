import { NextResponse } from 'next/server';

const BASE_URL = process.env.BARCODE_SITE_URL ?? 'https://as21.net/mr7';
const TEST_BARCODE = '8806421028003';

const SEARCH_URLS = [
  `${BASE_URL}/dBasePrdtInfoMfds.asp?search=${TEST_BARCODE}`,
  `${BASE_URL}/dFindDicNor.asp?search=${TEST_BARCODE}`,
  `${BASE_URL}/dBasePrdt.asp?search=${TEST_BARCODE}`,
];

export async function GET() {
  // 1. 로그인
  const formData = new URLSearchParams();
  formData.set('webId', process.env.BARCODE_SITE_ID ?? '');
  formData.set('webPwd', process.env.BARCODE_SITE_PW ?? '');

  let loginCookie = '';
  let loginStatus: number | null = null;
  let loginError: string | null = null;

  try {
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

    loginStatus = loginRes.status;

    const rawCookies: string[] =
      typeof (loginRes.headers as any).getSetCookie === 'function'
        ? (loginRes.headers as any).getSetCookie()
        : [loginRes.headers.get('set-cookie') ?? ''].filter(Boolean);

    loginCookie = rawCookies.map(c => c.split(';')[0]).join('; ');
  } catch (e) {
    loginError = String(e);
    return NextResponse.json({ loginStatus, loginError });
  }

  // 2. 각 URL 순서대로 시도
  const searchResults = await Promise.all(
    SEARCH_URLS.map(async (url) => {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Cookie': loginCookie,
            'Referer': `${BASE_URL}/`,
          },
        });
        const html = await res.text();
        const tableIdx = html.search(/<table/i);
        const tablePreview = tableIdx !== -1 ? html.slice(tableIdx, tableIdx + 3000) : '테이블 없음';
        return { url, status: res.status, tablePreview };
      } catch (e) {
        return { url, status: null, error: String(e) };
      }
    })
  );

  return NextResponse.json({ loginStatus, loginCookie, loginError, searchResults });
}
