import { NextResponse } from 'next/server';

export async function GET() {
  const { load } = await import('cheerio');

  // 1단계: 제품명으로 검색 → drug_cd 획득
  const searchUrl = 'https://health.kr/searchDrug/search_total_result.asp?searchTxt='
    + encodeURIComponent('모드코프에스');

  const searchRes = await fetch(searchUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const searchHtml = await searchRes.text();
  const $1 = load(searchHtml);

  const firstLink = $1('table tbody tr').first().find('a').attr('href') ?? '';
  const drugCdMatch = firstLink.match(/drug_cd=([^&]+)/);
  const drugCd = drugCdMatch?.[1] ?? '';

  // 2단계: 동일성분 페이지에서 성분명 획득
  let ingredients = '';
  if (drugCd) {
    const sunbUrl = 'https://health.kr/searchDrug/result_sunb.asp?drug_cd=' + drugCd;
    const sunbRes = await fetch(sunbUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const sunbHtml = await sunbRes.text();
    const $2 = load(sunbHtml);

    ingredients = $2('p, td, div').filter((_, el) => {
      const text = $2(el).text();
      return text.includes('아세트') ||
        (text.includes('mg') && text.length < 300);
    }).first().text().trim();
  }

  return NextResponse.json({
    searchStatus: searchRes.status,
    drugCd,
    firstLink,
    ingredients: ingredients.slice(0, 500),
  });
}
