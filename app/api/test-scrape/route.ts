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
  let loginHtmlPreview: string | null = null;
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
    loginHtmlPreview = (await loginRes.text()).slice(0, 1000);
  } catch (e) {
    loginError = String(e);
    return NextResponse.json({ loginStatus, loginCookie, loginHtmlPreview, loginError });
  }

  // 2. 메인 페이지 접속 (로그인 확인용)
  let mainStatus: number | null = null;
  let mainHtmlPreview: string | null = null;
  let mainError: string | null = null;

  try {
    const mainRes = await fetch(`${BASE_URL}/dBaseMain.asp`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Cookie': loginCookie ?? '',
        'Referer': `${BASE_URL}/`,
      },
    });
    mainStatus = mainRes.status;
    mainHtmlPreview = (await mainRes.text()).slice(0, 500);
  } catch (e) {
    mainError = String(e);
  }

  // 3. 바코드 검색
  let searchStatus: number | null = null;
  let tableHtml: string | null = null;
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
    const tableMatch = html.match(/<table[\s\S]*?<\/table>/i);
    tableHtml = tableMatch ? tableMatch[0] : '테이블 없음';
  } catch (e) {
    searchError = String(e);
  }

  return NextResponse.json({
    loginStatus,
    loginCookie,
    loginHtmlPreview,
    loginError,
    mainStatus,
    mainHtmlPreview,
    mainError,
    searchStatus,
    tableHtml,
    searchError,
  });
}
