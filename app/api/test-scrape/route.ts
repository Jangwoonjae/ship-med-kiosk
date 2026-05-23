import { NextResponse } from 'next/server';

const BASE_URL = process.env.BARCODE_SITE_URL ?? 'https://as21.net/mr7';
const TEST_BARCODE = '8806421028003';

export async function GET() {
  // 1. 로그인
  const formData = new URLSearchParams();
  formData.set('webId', process.env.BARCODE_SITE_ID ?? '');
  formData.set('webPwd', process.env.BARCODE_SITE_PW ?? '');

  let loginStatus: number | null = null;
  let loginCookie: string | null = null;
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
    return NextResponse.json({ loginStatus, loginCookie, loginError });
  }

  // 2. 바코드 검색
  let searchStatus: number | null = null;
  let searchHtmlPreview: string | null = null;
  let searchError: string | null = null;

  try {
    const searchRes = await fetch(
      `${BASE_URL}/dFindDicNor.asp?sortCol=0&sortDir=desc&displayLength=10&search=${TEST_BARCODE}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Cookie': loginCookie ?? '',
          'Referer': `${BASE_URL}/`,
        },
      }
    );

    searchStatus = searchRes.status;
    const html = await searchRes.text();
    searchHtmlPreview = html.slice(0, 2000);
  } catch (e) {
    searchError = String(e);
  }

  return NextResponse.json({
    loginStatus,
    loginCookie,
    loginError,
    searchStatus,
    searchHtmlPreview,
    searchError,
  });
}
