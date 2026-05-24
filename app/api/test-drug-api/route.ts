import { NextResponse } from 'next/server';

export async function GET() {
  const { load } = await import('cheerio');

  const searchUrl = 'https://health.kr/searchDrug/search_total_result.asp?searchTxt='
    + encodeURIComponent('모드코프에스');

  const searchRes = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
  });
  const searchHtml = await searchRes.text();
  const $ = load(searchHtml);

  const links: string[] = [];
  $('a').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (href.includes('drug_cd') || href.includes('result_drug')) {
      links.push(href);
    }
  });

  const tableText = $('table').first().text().replace(/\s+/g, ' ').slice(0, 500);

  return NextResponse.json({
    status: searchRes.status,
    links: links.slice(0, 5),
    tableText,
    htmlPreview: searchHtml.slice(0, 1000),
  });
}
