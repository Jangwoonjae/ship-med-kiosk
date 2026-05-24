import { NextResponse } from 'next/server';

const API_KEY = process.env.DRUG_API_KEY ?? '';

export async function GET() {
  const { load } = await import('cheerio');

  // 1단계: e약은요 API로 itemSeq 획득
  const easyUrl = `https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList?serviceKey=${API_KEY}&itemName=${encodeURIComponent('모드코프')}&type=json&numOfRows=3&pageNo=1`;
  const easyRes = await fetch(easyUrl);
  const easyData = await easyRes.json();
  const itemSeq: string = easyData?.body?.items?.[0]?.itemSeq ?? '';

  // 2단계: 의약품안전나라에서 성분 스크래핑
  let ingredients = '';
  let nedrugStatus = 0;

  if (itemSeq) {
    const nedrugUrl = `https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=${itemSeq}`;
    const nedrugRes = await fetch(nedrugUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    nedrugStatus = nedrugRes.status;
    const nedrugHtml = await nedrugRes.text();
    const $ = load(nedrugHtml);

    $('th, td').each((_, el) => {
      const text = $(el).text().trim();
      if (text.includes('성분') || text.includes('함량')) {
        ingredients += text + ' | ';
      }
    });
  }

  return NextResponse.json({
    itemSeq,
    nedrugStatus,
    ingredients: ingredients.slice(0, 500),
  });
}
