# 웹 스크래핑 바코드 조회 작업지시서

> 프로젝트: `ship-med-kiosk`
> 대상 사이트: `https://as21.net/mr7/index.asp`
> 작업 위치: `C:\projects\ship-med-kiosk`

---

## ⚠️ Vercel 배포 주의사항 (절대 변경 금지)
- `TURSO_AUTH_TOKEN` — 수정 금지
- `Node.js Version` — 반드시 20.x 유지

---

## 구현 방식

```
바코드 입력
    ↓
1. Turso DB에서 barcode 컬럼 조회 (로컬)
    ↓ 없으면
2. as21.net 로그인 → 바코드 검색 → 결과 파싱
    ↓ 없으면
3. "등록되지 않은 바코드" 반환
```

---

## Step 1. 패키지 설치

```bash
pnpm add cheerio
```

> `cheerio` — HTML 파싱 라이브러리 (jQuery 문법)
> `fetch`는 Next.js에 내장되어 있으므로 별도 설치 불필요

---

## Step 2. 환경변수 추가

**`.env.local`** 에 추가 (값은 직접 입력):

```env
# as21.net 바코드 조회 사이트
BARCODE_SITE_URL=https://as21.net/mr7
BARCODE_SITE_ID=여기에_실제_아이디_입력
BARCODE_SITE_PW=여기에_실제_비밀번호_입력
```

**`.env.local.example`** 에 추가 (값은 빈칸):

```env
# as21.net 바코드 조회 사이트
BARCODE_SITE_URL=https://as21.net/mr7
BARCODE_SITE_ID=
BARCODE_SITE_PW=
```

> ⚠️ `.env.local`은 `.gitignore`에 포함되어 GitHub에 올라가지 않음
> ⚠️ Vercel 환경변수에도 동일하게 추가 필요 (브라우저에서 직접 입력)

---

## Step 3. 스크래핑 모듈 생성

**`lib/barcode-scraper.ts`** 신규 생성:

```ts
import * as cheerio from 'cheerio';

const BASE_URL = process.env.BARCODE_SITE_URL ?? 'https://as21.net/mr7';
const SITE_ID  = process.env.BARCODE_SITE_ID ?? '';
const SITE_PW  = process.env.BARCODE_SITE_PW ?? '';

// 쿠키를 재사용하기 위한 세션 캐시
let sessionCookie: string | null = null;
let sessionExpiry: number = 0;

async function getSession(): Promise<string> {
  // 세션이 유효하면 재사용 (30분)
  if (sessionCookie && Date.now() < sessionExpiry) {
    return sessionCookie;
  }

  // 로그인 페이지 접속하여 hidden 필드 및 쿠키 획득
  const loginPageRes = await fetch(`${BASE_URL}/index.asp`, {
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  const loginPageCookie = loginPageRes.headers.get('set-cookie') ?? '';
  const loginPageHtml = await loginPageRes.text();
  const $ = cheerio.load(loginPageHtml);

  // 로그인 폼의 hidden 필드 수집
  const formData = new URLSearchParams();
  $('form input').each((_, el) => {
    const name  = $(el).attr('name')  ?? '';
    const value = $(el).attr('value') ?? '';
    if (name) formData.append(name, value);
  });

  // 아이디/비밀번호 설정 (폼 필드명은 사이트에 따라 다를 수 있음)
  // 실제 필드명 확인 필요 — 보통 'id', 'pw' 또는 'userid', 'userpw'
  formData.set('id', SITE_ID);
  formData.set('pw', SITE_PW);

  // 로그인 POST 요청
  const loginRes = await fetch(`${BASE_URL}/login_ok.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
      'Cookie': loginPageCookie,
      'Referer': `${BASE_URL}/index.asp`,
    },
    body: formData.toString(),
    redirect: 'manual', // 리다이렉트 수동 처리
  });

  const cookie = loginRes.headers.get('set-cookie') ?? loginPageCookie;
  sessionCookie = cookie;
  sessionExpiry = Date.now() + 30 * 60 * 1000; // 30분

  return sessionCookie;
}

export async function searchBarcodeFromSite(barcode: string): Promise<{
  matched: boolean;
  name?: string;
  spec?: string;
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

    // 바코드 검색 페이지 접속
    // 실제 검색 URL 파라미터는 사이트 구조에 따라 수정 필요
    const searchRes = await fetch(
      `${BASE_URL}/dFindDicNor.asp?barcode=${encodeURIComponent(barcode)}&searchType=barcode`,
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
    const $ = cheerio.load(html);

    // 로그인 페이지로 리다이렉트됐는지 확인
    if (html.includes('index.asp') && html.includes('login')) {
      sessionCookie = null; // 세션 초기화
      return { matched: false, error: '세션 만료 — 재시도 필요' };
    }

    // 결과 테이블 파싱
    // 실제 HTML 구조에 따라 선택자 수정 필요
    const rows = $('table tr');
    if (rows.length <= 1) {
      return { matched: false };
    }

    // 첫 번째 결과 행에서 데이터 추출
    // 컬럼 순서는 dFindDicNor.asp 화면 구조에 따라 수정
    const firstRow = rows.eq(1);
    const cols = firstRow.find('td');

    if (cols.length === 0) {
      return { matched: false };
    }

    const name    = cols.eq(1).text().trim(); // 한글상품명
    const spec    = cols.eq(2).text().trim(); // 약품규격
    const company = cols.eq(3).text().trim(); // 업체명
    const form    = cols.eq(4).text().trim(); // 제형

    if (!name) return { matched: false };

    return {
      matched: true,
      name,
      spec,
      company,
      form,
      barcode,
    };

  } catch (error) {
    console.error('바코드 스크래핑 오류:', error);
    return { matched: false, error: '조회 중 오류: ' + String(error) };
  }
}
```

---

## Step 4. lib/barcode.ts 수정

기존 MSSQL 조회 로직을 스크래핑으로 교체:

```ts
import { searchBarcodeFromSite } from './barcode-scraper';

export async function lookupBarcode(barcode: string) {
  // 1. Turso 로컬 DB 조회
  const local = await getMedicineByBarcode(barcode);
  if (local) {
    return { matched: true, source: 'local', medicine: local };
  }

  // 2. 웹 스크래핑으로 조회
  const scraped = await searchBarcodeFromSite(barcode);
  if (scraped.matched) {
    return {
      matched: true,
      source: 'scrape',
      medicine: {
        name: scraped.name,
        spec: scraped.spec,
        company: scraped.company,
        form: scraped.form,
        barcode: scraped.barcode,
      }
    };
  }

  return {
    matched: false,
    source: 'none',
    error: scraped.error ?? '등록되지 않은 바코드입니다.',
  };
}
```

---

## Step 5. HTML 구조 파악 (중요)

스크래핑이 정상 동작하려면 **실제 사이트의 HTML 구조**를 확인해야 합니다.

### 5-1. 로그인 폼 필드명 확인

브라우저에서 `https://as21.net/mr7/index.asp` 접속 후:
- F12 → Elements 탭
- 로그인 폼의 `input` 태그 `name` 속성 확인
- 예: `name="id"`, `name="pw"` 또는 다른 이름일 수 있음

확인한 필드명으로 `lib/barcode-scraper.ts`의 아래 부분 수정:
```ts
formData.set('id', SITE_ID);   // 실제 필드명으로 변경
formData.set('pw', SITE_PW);   // 실제 필드명으로 변경
```

### 5-2. 검색 URL 및 파라미터 확인

브라우저에서 바코드 검색 후:
- 주소창의 URL 파라미터 확인
- 예: `dFindDicNor.asp?SearchText=8802240003559`

확인한 URL로 `barcode-scraper.ts`의 검색 URL 수정.

### 5-3. 결과 테이블 컬럼 순서 확인

검색 결과 페이지에서 F12 → Elements로 테이블 구조 확인 후
`cols.eq(숫자)` 인덱스 수정.

---

## Step 6. Vercel 환경변수 추가

Vercel → Settings → Environment Variables:

| Name | Value |
|------|-------|
| `BARCODE_SITE_URL` | `https://as21.net/mr7` |
| `BARCODE_SITE_ID` | 실제 아이디 (직접 입력) |
| `BARCODE_SITE_PW` | 실제 비밀번호 (직접 입력) |

---

## 최종 작업

```bash
git add .
git commit -m "feat: barcode lookup via web scraping (as21.net)"
git push origin master
```

---

## 검증 항목

- [ ] 로컬에서 바코드 입력 → as21.net 조회 결과 표시
- [ ] 세션 만료 시 자동 재로그인
- [ ] 미등록 바코드 → "등록되지 않은 바코드" 메시지
- [ ] Vercel에서도 정상 조회 확인
- [ ] `.env.local`이 GitHub에 올라가지 않음 확인

---

## 주의사항

- 웹 스크래핑은 사이트 구조가 변경되면 동작하지 않을 수 있음
- as21.net 사이트 이용약관에 자동 접속 금지 조항이 있을 수 있음
- 사이트 서버 부하를 줄이기 위해 세션 30분 캐싱 적용
- 로그인 정보는 반드시 `.env.local`과 Vercel 환경변수에만 저장
