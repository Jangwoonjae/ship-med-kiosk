# UI 개선 및 시스템 초기화 기능 통합 작업지시서 v2

> 프로젝트: `ship-med-kiosk`
> 작업 위치: `C:\projects\ship_med\ship-med-kiosk`

---

## #1 — 파란색 배경 복구

`tailwind.config.ts`의 `content` 경로가 모든 컴포넌트를 포함하는지 확인:

```ts
content: [
  './app/**/*.{js,ts,jsx,tsx,mdx}',
  './components/**/*.{js,ts,jsx,tsx,mdx}',
]
```

태블릿에서 Tailwind 클래스가 purge되어 배경색이 안 보이는 경우
헤더 컴포넌트에 인라인 스타일 강제 적용:

```tsx
<header style={{ backgroundColor: '#1d4ed8' }} className="...">
```

관리자 헤더도 동일하게 적용:
```tsx
<header style={{ backgroundColor: '#1e3a5f' }} className="...">
```

---

## #2 — 이름 입력 창 / 분류 선택 창 가운데 정렬

**`components/crew/NameInput.tsx`**:
- 전체 컨테이너: `flex flex-col items-center justify-center`
- 제목 텍스트: `text-center`
- 키보드 그리드: `mx-auto justify-center`
- 입력 필드: `text-center`
- 확인 버튼: `mx-auto`

**`components/crew/CategorySelect.tsx`**:
- 전체 컨테이너: `flex flex-col items-center`
- 제목: `text-center`
- 카테고리 카드 그리드: `mx-auto justify-center`
- 각 카드 내 텍스트: `text-center`

---

## #3 — 의약품 선택 창 반응형 그리드

**`tailwind.config.ts`**에 orientation variant 추가:

```ts
import plugin from 'tailwindcss/plugin';

plugins: [
  plugin(({ addVariant }) => {
    addVariant('landscape', '@media (orientation: landscape)');
    addVariant('portrait', '@media (orientation: portrait)');
  }),
],
```

**`components/crew/MedicineGrid.tsx`** 그리드 클래스:

```tsx
<div className="grid portrait:grid-cols-2 landscape:grid-cols-4 gap-4 justify-items-center mx-auto w-full">
```

전체 컨테이너:
```tsx
<div className="flex flex-col items-center w-full px-4">
```

---

## #4 — 시스템 초기화 기능 (관리자 설정 탭)

### 초기화 동작

초기화 버튼 클릭 시:
1. 입출고 이력(`transactions` 테이블) 전체 삭제
2. 현재 설정된 항로 타입(`route_type`)에 따라 재고 복원:
   - `route_type = 'international'` → `current_qty = std_intl` (국제선 기준수량)
   - `route_type = 'domestic'` → `current_qty = std_dom` (국내선 기준수량)

### 4-1. API Route 추가

**`app/api/reset/route.ts`** 신규 생성:

```ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    // 현재 항로 타입 조회
    const settingResult = await db.execute(
      "SELECT value FROM settings WHERE key = 'route_type'"
    );
    const routeType = settingResult.rows[0]?.value ?? 'international';

    // 입출고 이력 전체 삭제
    await db.execute('DELETE FROM transactions');

    // 항로 타입에 따라 재고 복원
    if (routeType === 'domestic') {
      await db.execute('UPDATE medicines SET current_qty = std_dom');
    } else {
      await db.execute('UPDATE medicines SET current_qty = std_intl');
    }

    return NextResponse.json({
      success: true,
      message: `시스템 초기화 완료 (${routeType === 'domestic' ? '국내선' : '국제선'} 기준수량으로 복원)`,
      routeType,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
```

### 4-2. 관리자 설정 탭에 초기화 버튼 추가

**`components/admin/Settings.tsx`** 설정 항목 맨 아래에 추가:

```tsx
{/* 시스템 초기화 */}
<div className="mt-8 border border-red-200 rounded-lg p-4 bg-red-50">
  <h3 className="text-red-700 font-semibold text-lg mb-2">⚠️ 시스템 초기화</h3>
  <p className="text-sm text-red-600 mb-1">
    아래 항목이 초기화됩니다:
  </p>
  <ul className="text-sm text-red-600 mb-4 list-disc list-inside">
    <li>입출고 이력 전체 삭제</li>
    <li>재고를 현재 항로 설정 기준수량으로 복원<br/>
      (국제선 설정 시 국제선 기준수량 / 국내선 설정 시 국내선 기준수량)
    </li>
  </ul>
  <p className="text-xs text-red-500 mb-4">
    ⚠️ 이 작업은 되돌릴 수 없습니다.
  </p>
  <button
    onClick={handleReset}
    className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium w-full sm:w-auto"
  >
    🔄 시스템 초기화
  </button>
</div>
```

초기화 핸들러:

```ts
const handleReset = async () => {
  const confirmed = confirm(
    '시스템을 초기화하시겠습니까?\n\n' +
    '• 입출고 이력 전체 삭제\n' +
    '• 재고를 현재 항로 기준수량으로 복원\n\n' +
    '이 작업은 되돌릴 수 없습니다.'
  );
  if (!confirmed) return;

  const reconfirmed = confirm('정말로 초기화하시겠습니까?');
  if (!reconfirmed) return;

  try {
    const res = await fetch('/api/reset', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert(`초기화가 완료되었습니다.\n${data.message}`);
      window.location.reload();
    } else {
      alert('초기화 실패: ' + data.error);
    }
  } catch {
    alert('오류가 발생했습니다.');
  }
};
```

---

## ⚠️ Vercel 배포 주의사항

**절대 건드리지 말 것:**
- Vercel → Settings → Environment Variables → `TURSO_AUTH_TOKEN` 값을 수정하거나 재발급하지 말 것
- 이 값을 변경하면 DB 연결이 끊어져 전체 서비스가 중단됨
- Redeploy 시에도 환경변수는 그대로 유지됨 (별도 조작 불필요)
- Vercel → Settings → General → **Node.js Version은 반드시 20.x 유지**
- Node.js 버전을 변경하면 API Routes 실행 오류 발생

---

## 최종 작업

모든 수정 완료 후:

```bash
git add .
git commit -m "feat: fix UI layout, responsive grid, center align, system reset by route type"
git push origin master
```

---

## 검증 항목

- [ ] 태블릿 헤더 파란색 배경 표시
- [ ] 이름 입력 / 분류 선택 화면 가운데 정렬
- [ ] 태블릿 가로: 의약품 4열
- [ ] 태블릿 세로: 의약품 2열
- [ ] 관리자 설정 탭 하단 "시스템 초기화" 버튼 표시
- [ ] 초기화 클릭 시 2단계 확인 모달
- [ ] 국제선 설정 상태에서 초기화 → 재고가 std_intl 값으로 복원
- [ ] 국내선 설정 상태에서 초기화 → 재고가 std_dom 값으로 복원
- [ ] 초기화 후 이력 0건 확인
