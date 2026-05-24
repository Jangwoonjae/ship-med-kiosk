# 유효기간 관리 + 바코드 검색 작업지시서

> 프로젝트: `ship-med-kiosk`
> 작업 위치: `C:\projects\ship_med\ship-med-kiosk`

---

## ⚠️ Vercel 배포 주의사항 (절대 변경 금지)
- `TURSO_AUTH_TOKEN` — 수정 금지
- `Node.js Version` — 반드시 20.x 유지

---

## 전체 변경 요약

| 항목 | 내용 |
|------|------|
| DB | medicines 테이블에 expiry_date, lot_no 컬럼 추가 |
| 재고현황 | 유효기간 컬럼 추가 + 색상 표시 |
| 입고 처리 | 유효기간 선택 입력 필드 추가 |
| 검색 | 바코드 번호로도 검색 가능 |

---

## #1 — DB 스키마 변경

### 1-1. lib/schema.ts 수정

medicines 테이블에 아래 2개 컬럼 추가:

```ts
expiry_date: text('expiry_date'),   // 유효기간 YYYY-MM-DD (nullable, 선택)
lot_no: text('lot_no'),             // 로트번호 (nullable, 선택)
```

### 1-2. Turso DB 실제 컬럼 추가

app/api/admin/fix-schema/route.ts GET 핸들러에 아래 추가:

```ts
// expiry_date 컬럼 추가 (없으면)
await db.execute(`ALTER TABLE medicines ADD COLUMN expiry_date TEXT`).catch(() => {});
// lot_no 컬럼 추가 (없으면)
await db.execute(`ALTER TABLE medicines ADD COLUMN lot_no TEXT`).catch(() => {});
```

> .catch(() => {}) — 이미 컬럼이 있으면 무시

### 1-3. app/api/medicines/route.ts 수정

GET 핸들러 SELECT에 expiry_date, lot_no 추가:
```sql
SELECT id, category, name_ko, name_en, brand_name, form, strength,
       std_intl, std_dom, current_qty, barcode, expiry_date, lot_no
FROM medicines
```

PATCH 핸들러에 expiry_date, lot_no 업데이트 가능하도록 추가.

---

## #2 — 재고현황 유효기간 표시

### 2-1. 유효기간 상태 판별 함수

```ts
const getExpiryStatus = (expiryDate: string | null) => {
  if (!expiryDate) return { status: 'none', label: '-', color: 'gray' };
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { status: 'expired', label: '만료', color: 'red' };
  if (diffDays < 90) return { status: 'soon', label: '임박', color: 'orange' };
  return { status: 'ok', label: '정상', color: 'green' };
};
```

### 2-2. StockTable.tsx 수정

테이블에 유효기간 컬럼 추가:

```tsx
// 헤더
<th>유효기간</th>

// 데이터 행
<td>
  {(() => {
    const { status, label } = getExpiryStatus(medicine.expiry_date);
    const dateStr = medicine.expiry_date 
      ? new Date(medicine.expiry_date).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit' })
      : '-';
    return (
      <span className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
        ${status === 'expired' ? 'bg-red-100 text-red-700' : ''}
        ${status === 'soon' ? 'bg-orange-100 text-orange-700' : ''}
        ${status === 'ok' ? 'bg-green-100 text-green-700' : ''}
        ${status === 'none' ? 'bg-gray-100 text-gray-500' : ''}
      `}>
        {dateStr !== '-' && dateStr}
        {status !== 'none' && <span>{label}</span>}
      </span>
    );
  })()}
</td>
```

### 2-3. 만료/임박 품목 상단 요약 카드에 추가

재고현황 상단 통계 카드에 추가:

```tsx
// 기존: 전체 / 정상 / 경고 / 긴급
// 추가: 유효기간 만료 / 유효기간 임박

<div className="stat-card">
  <div className="stat-label">유효기간 만료</div>
  <div className="stat-val" style={{ color: 'red' }}>{expiredCount}</div>
</div>
<div className="stat-card">
  <div className="stat-label">유효기간 임박 (3개월)</div>
  <div className="stat-val" style={{ color: 'orange' }}>{soonCount}</div>
</div>
```

### 2-4. 만료/임박 행 배경색 표시

테이블 행에 배경색 추가:

```tsx
<tr className={`
  ${expiryStatus === 'expired' ? 'bg-red-50' : ''}
  ${expiryStatus === 'soon' ? 'bg-orange-50' : ''}
`}>
```

---

## #3 — 입고 처리 유효기간 입력

### 3-1. ReceivePanel.tsx 수정

바코드 조회 결과 표시 후 유효기간 입력 필드 추가:

```tsx
{/* 유효기간 입력 (선택사항) */}
<div className="mt-3">
  <label className="text-sm font-medium text-gray-700 block mb-1">
    유효기간 
    <span className="text-gray-400 text-xs ml-1">(선택)</span>
  </label>
  <div className="flex gap-2 items-center">
    <input
      type="month"
      value={expiryDate}
      onChange={e => setExpiryDate(e.target.value)}
      className="border rounded-lg px-3 py-2 text-base"
      placeholder="YYYY-MM"
    />
    <button
      onClick={() => setExpiryDate('')}
      className="text-gray-400 text-sm"
    >지우기</button>
  </div>
  <p className="text-xs text-gray-400 mt-1">
    2D 바코드 스캔 시 자동 입력됩니다
  </p>
</div>

{/* 로트번호 입력 (선택사항) */}
<div className="mt-2">
  <label className="text-sm font-medium text-gray-700 block mb-1">
    로트번호
    <span className="text-gray-400 text-xs ml-1">(선택)</span>
  </label>
  <input
    type="text"
    value={lotNo}
    onChange={e => setLotNo(e.target.value)}
    className="w-full border rounded-lg px-3 py-2 text-base"
    placeholder="로트번호 입력"
  />
</div>
```

### 3-2. 2D 바코드 자동 파싱

GS1-128 2D 바코드에서 유효기간 자동 추출:

```ts
// GS1 AI(17) = 유효기간 YYMMDD
const parseGS1Expiry = (barcode: string): string | null => {
  // AI 17 다음 6자리가 유효기간 YYMMDD
  const match = barcode.match(/17(\d{6})/);
  if (!match) return null;
  const yy = match[1].slice(0, 2);
  const mm = match[1].slice(2, 4);
  const year = parseInt(yy) < 50 ? '20' + yy : '19' + yy;
  return `${year}-${mm}`;
};
```

바코드 입력 시 자동으로 호출:
```ts
const expiry = parseGS1Expiry(barcode);
if (expiry) setExpiryDate(expiry);
```

### 3-3. 입고 처리 시 유효기간 저장

입고 확정 시 medicines.expiry_date 업데이트:

```ts
// 입고 처리 후 유효기간 업데이트
if (expiryDate) {
  await fetch(`/api/medicines/${medicineId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      expiry_date: expiryDate + '-01', // YYYY-MM-01 형식
      lot_no: lotNo || null
    }),
  });
}
```

---

## #4 — 재고현황 바코드 검색

### 4-1. app/api/medicines/route.ts GET 핸들러 수정

검색 시 barcode 컬럼도 포함:

```ts
// 기존
WHERE name_ko LIKE ? OR name_en LIKE ?

// 수정
WHERE name_ko LIKE ? OR name_en LIKE ? OR barcode LIKE ?
```

args에 `%${search}%` 3번 추가.

### 4-2. StockTable.tsx 검색창 안내 문구 수정

```tsx
<input
  placeholder="성분명, 한글명 또는 바코드 번호 검색..."
  ...
/>
```

---

## #5 — 슬라이드오버에 유효기간 표시 및 수정

품목 상세 슬라이드오버에 유효기간/로트번호 표시:

```tsx
<div className="flex justify-between py-2 border-b">
  <span className="text-sm text-gray-500">유효기간</span>
  <span className={`text-sm font-medium ${
    expiryStatus === 'expired' ? 'text-red-600' :
    expiryStatus === 'soon' ? 'text-orange-600' : 'text-gray-900'
  }`}>
    {selected.expiry_date 
      ? new Date(selected.expiry_date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit' })
      : '미입력'}
  </span>
</div>
<div className="flex justify-between py-2 border-b">
  <span className="text-sm text-gray-500">로트번호</span>
  <span className="text-sm font-medium">{selected.lot_no ?? '미입력'}</span>
</div>
```

품목 수정 폼에도 유효기간/로트번호 수정 필드 추가.

---

## 최종 작업

```bash
# 1. 코드 수정 완료 후
git add .
git commit -m "feat: expiry date management, barcode search"
git push origin master

# 2. Vercel 배포 완료 후 DB 컬럼 추가
# 브라우저에서 접속:
# https://ship-med-kiosk-91vy.vercel.app/api/admin/fix-schema
```

---

## 검증 항목

- [ ] fix-schema 접속 후 expiry_date, lot_no 컬럼 추가 확인
- [ ] 재고현황 테이블에 유효기간 컬럼 표시
- [ ] 만료 품목 빨간색 배경 표시
- [ ] 임박 품목 주황색 배경 표시
- [ ] 상단 요약 카드에 만료/임박 건수 표시
- [ ] 입고 처리 시 유효기간 선택 입력 가능
- [ ] 유효기간 미입력 시 정상 등록 가능
- [ ] 2D 바코드 스캔 시 유효기간 자동 파싱
- [ ] 재고현황 검색창에서 바코드 번호로 검색 가능
- [ ] 슬라이드오버에서 유효기간 표시 및 수정 가능
