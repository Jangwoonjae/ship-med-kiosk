const BASE_URL = process.env.BARCODE_SITE_URL ?? 'https://as21.net/mr7';
const SITE_ID  = process.env.BARCODE_SITE_ID ?? '';
const SITE_PW  = process.env.BARCODE_SITE_PW ?? '';

let sessionCookie: string | null = null;
let sessionExpiry = 0;

async function getSession(): Promise<string> {
  if (sessionCookie && Date.now() < sessionExpiry) {
    return sessionCookie;
  }

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

  const cookie = loginRes.headers.get('set-cookie') ?? '';
  sessionCookie = cookie;
  sessionExpiry = Date.now() + 30 * 60 * 1000;
  return sessionCookie;
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
    const cookie = await getSession();
    const encoded = barcode.replace(/[^0-9a-zA-Z]/g, '');
    const searchUrl = BASE_URL + '/dFindDicNor.asp?sortCol=0&sortDir=desc&displayLength=10&search=' + encoded;

    const searchRes = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Cookie': cookie,
      },
    });

    const html = await searchRes.text();
    const { load } = await import('cheerio');
    const $ = load(html);

    const rows = $('table.table-hover tr').slice(1);
    const firstRow = rows.first();
    const cols = firstRow.find('td');

    const name = cols.eq(0).text().trim();
    const packQty = cols.eq(1).text().trim();
    const form = cols.eq(2).text().trim();
    const company = cols.eq(3).text().trim();
    const barcodeVal = cols.eq(5).text().trim();

    if (!name) {
      return { matched: false };
    }

    return {
      matched: true,
      name,
      packQty,
      form,
      company,
      barcode: barcodeVal || barcode,
    };

  } catch (error) {
    console.error('스크래핑 오류:', error);
    return { matched: false, error: String(error) };
  }
}
