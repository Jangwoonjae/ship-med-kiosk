# 바코드 표시 + 신규등록 개선 작업지시서

> 프로젝트: `ship-med-kiosk`
> 작업 위치: `C:\projects\ship_med\ship-med-kiosk`

---

## ⚠️ Vercel 배포 주의사항 (절대 변경 금지)
- `TURSO_AUTH_TOKEN` — 수정 금지
- `Node.js Version` — 반드시 20.x 유지

---

## #1 — 재고현황 품목에 바코드 번호 표시

### 1-1. StockTable 테이블에 바코드 컬럼 추가

**`components/admin/StockTable.tsx`** 수정:

재고현황 테이블에 바코드 컬럼 추가:

```tsx
// 테이블 헤더에 추가
<th>바코드</th>

// 테이블 행에 추가
<td className="text-sm text-gray-600">
  {medicine.barcode ?? '-'}
</td>
```

### 1-2. 슬라이드오버 상세 패널에 바코드 표시

슬라이드오버에서 품목 상세 정보 표시 시 바코드 항목 추가:

```tsx
<div className="flex justify-between py-2 border-b">
  <span className="text-sm text-gray-500">바코드</span>
  <span className="text-sm font-medium">{selected.barcode ?? '미등록'}</span>
</div>
```

### 1-3. API에서 barcode 컬럼 포함 확인

**`app/api/medicines/route.ts`** GET 핸들러에서
barcode 컬럼이 SELECT에 포함되어 있는지 확인:

```ts
SELECT id, category, name_ko, name_en, brand_name, 
       form, strength, indication,
       std_intl, std_dom, current_qty, barcode
FROM medicines
```

포함되지 않았으면 추가.

---

## #2 — 입고 처리 신규등록 시 영문명 선택사항으로 변경

### 2-1. ReceivePanel 신규등록 폼 수정

**`components/admin/ReceivePanel.tsx`** 에서
신규 등록 폼의 영문명 필드를 필수 → 선택사항으로 변경:

```tsx
// 수정 전
<label className="text-sm text-gray-600 block mb-1">성분명(영문) *</label>

// 수정 후
<label className="text-sm text-gray-600 block mb-1">
  성분명(영문) 
  <span className="text-gray-400 text-xs ml-1">(선택)</span>
</label>
```

### 2-2. 유효성 검사에서 영문명 필수 조건 제거

```ts
// 수정 전
if (!newMed.name_ko || !newMed.name_en || !newMed.category) {
  setNewMedMsg('성분명(한글), 성분명(영문), 분류는 필수입니다.');
  return;
}

// 수정 후
if (!newMed.name_ko || !newMed.category) {
  setNewMedMsg('성분명(한글)과 분류는 필수입니다.');
  return;
}
```

### 2-3. API POST 핸들러 확인

**`app/api/medicines/route.ts`** POST 핸들러에서
name_en이 없어도 등록되도록 확인:

```ts
// name_en은 선택사항으로 처리
const name_en = body.name_en ?? '';
```

### 2-4. 바코드 스캔으로 신규등록 시 자동 입력

바코드 스캔 후 미등록 품목일 때 신규등록 폼에
스크래핑으로 가져온 정보를 자동 입력:

```tsx
// 바코드 조회 결과가 matched=true이지만 Turso에 없는 경우
// 신규등록 폼에 자동 입력
if (result.matched && result.source === 'scrape') {
  setNewMed(prev => ({
    ...prev,
    brand_name: result.medicine.name ?? '',
    barcode: result.medicine.barcode ?? barcodeInput,
    form: result.medicine.form ?? '',
    strength: result.medicine.spec ?? '',
  }));
  setShowNewForm(true);
}
```

---

## 최종 작업

```bash
git add .
git commit -m "feat: show barcode in stock table, optional english name in new medicine form"
git push origin master
```

---

## 검증 항목

- [ ] 재고현황 테이블에 바코드 컬럼 표시
- [ ] 바코드 미등록 품목은 '-' 표시
- [ ] 슬라이드오버 상세에 바코드 번호 표시
- [ ] 신규등록 폼에서 영문명 없이 등록 가능
- [ ] 바코드 스캔 시 미등록 품목이면 신규등록 폼 자동 열림
- [ ] 스크래핑 정보(품명, 제형, 바코드)가 폼에 자동 입력
