# 의약품 수정 및 삭제 기능 작업지시서

> 프로젝트: `ship-med-kiosk`
> 작업 위치: `C:\projects\ship_med\ship-med-kiosk`

---

## ⚠️ Vercel 배포 주의사항 (절대 변경 금지)
- `TURSO_AUTH_TOKEN` — 수정 금지
- `Node.js Version` — 반드시 20.x 유지

---

## 기능 설계

### 수정
- 재고현황 탭 → 품목 행 클릭 → 슬라이드오버 패널 열림
- 슬라이드오버 하단에 **"품목 정보 수정"** 버튼 추가
- 버튼 클릭 시 수정 폼 펼쳐짐 (성분명, 상품명, 제형, 함량, 바코드, 기준수량 등)
- "저장" 클릭 시 PATCH API 호출

### 삭제
- 슬라이드오버 하단에 **"품목 삭제"** 버튼 추가 (빨간색)
- 클릭 시 확인 모달 → 확인 시 DELETE API 호출
- 삭제 후 목록에서 즉시 제거

---

## #1 — API Route 수정/삭제 핸들러 확인 및 추가

**`app/api/medicines/[id]/route.ts`** 파일 확인 후
PATCH와 DELETE 핸들러가 없으면 아래 내용 추가:

```ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 수정
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  const body = await req.json();

  const fields = [
    'category', 'name_ko', 'name_en', 'brand_name',
    'form', 'strength', 'indication',
    'std_intl', 'std_dom', 'current_qty', 'barcode'
  ];

  const updates = fields.filter(f => body[f] !== undefined);
  if (updates.length === 0) {
    return NextResponse.json({ error: '수정할 항목 없음' }, { status: 400 });
  }

  const sql = `UPDATE medicines SET ${updates.map(f => `${f} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`;
  const args = [...updates.map(f => body[f]), id];

  await db.execute({ sql, args });
  return NextResponse.json({ success: true });
}

// 삭제
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);

  // 해당 품목의 입출고 이력도 함께 삭제
  await db.execute({ sql: 'DELETE FROM transactions WHERE medicine_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM medicines WHERE id = ?', args: [id] });

  return NextResponse.json({ success: true });
}
```

---

## #2 — StockTable 슬라이드오버에 수정/삭제 추가

**`components/admin/StockTable.tsx`** 수정:

### 2-1. 상태 추가

```tsx
const [editMode, setEditMode] = useState(false);
const [editData, setEditData] = useState<any>(null);
const [editMsg, setEditMsg] = useState('');
const [deleting, setDeleting] = useState(false);
```

### 2-2. 수정 핸들러

```tsx
const handleEditSave = async () => {
  if (!selected) return;
  const res = await fetch(`/api/medicines/${selected.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(editData),
  });
  if (res.ok) {
    setEditMsg('✅ 저장 완료');
    // 목록 새로고침
    fetchMedicines();
    setEditMode(false);
  } else {
    setEditMsg('저장 실패');
  }
};
```

### 2-3. 삭제 핸들러

```tsx
const handleDelete = async () => {
  if (!selected) return;
  const confirmed = confirm(
    `"${selected.name_ko}" 품목을 삭제하시겠습니까?\n\n` +
    '해당 품목의 입출고 이력도 함께 삭제됩니다.\n' +
    '이 작업은 되돌릴 수 없습니다.'
  );
  if (!confirmed) return;

  setDeleting(true);
  const res = await fetch(`/api/medicines/${selected.id}`, { method: 'DELETE' });
  if (res.ok) {
    setSelected(null);
    fetchMedicines();
  } else {
    alert('삭제 실패');
  }
  setDeleting(false);
};
```

### 2-4. 슬라이드오버 JSX에 수정/삭제 버튼 및 폼 추가

슬라이드오버 하단 버튼 영역:

```tsx
{/* 수정/삭제 버튼 */}
<div className="border-t pt-4 mt-4 space-y-2">
  {!editMode ? (
    <>
      <button
        onClick={() => {
          setEditMode(true);
          setEditData({
            category: selected.category,
            name_ko: selected.name_ko,
            name_en: selected.name_en,
            brand_name: selected.brand_name,
            form: selected.form,
            strength: selected.strength,
            indication: selected.indication,
            std_intl: selected.std_intl,
            std_dom: selected.std_dom,
            barcode: selected.barcode ?? '',
          });
        }}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium"
      >
        ✏️ 품목 정보 수정
      </button>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium"
      >
        🗑️ 품목 삭제
      </button>
    </>
  ) : (
    <div className="space-y-3">
      <h4 className="font-semibold text-gray-700">품목 정보 수정</h4>

      {/* 분류 */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">분류</label>
        <div className="flex gap-2">
          {['주사약', '내용약', '외용약'].map(cat => (
            <button
              key={cat}
              onClick={() => setEditData((p: any) => ({ ...p, category: cat }))}
              className={`flex-1 py-1.5 rounded-lg border text-sm ${
                editData?.category === cat
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 성분명 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 block mb-1">성분명(한글)</label>
          <input
            type="text"
            value={editData?.name_ko ?? ''}
            onChange={e => setEditData((p: any) => ({ ...p, name_ko: e.target.value }))}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">성분명(영문)</label>
          <input
            type="text"
            value={editData?.name_en ?? ''}
            onChange={e => setEditData((p: any) => ({ ...p, name_en: e.target.value }))}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* 상품명 / 제형 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 block mb-1">상품명</label>
          <input
            type="text"
            value={editData?.brand_name ?? ''}
            onChange={e => setEditData((p: any) => ({ ...p, brand_name: e.target.value }))}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">제형</label>
          <input
            type="text"
            value={editData?.form ?? ''}
            onChange={e => setEditData((p: any) => ({ ...p, form: e.target.value }))}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* 함량 / 바코드 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 block mb-1">함량</label>
          <input
            type="text"
            value={editData?.strength ?? ''}
            onChange={e => setEditData((p: any) => ({ ...p, strength: e.target.value }))}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">바코드</label>
          <input
            type="text"
            value={editData?.barcode ?? ''}
            onChange={e => setEditData((p: any) => ({ ...p, barcode: e.target.value }))}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* 기준수량 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 block mb-1">국제선 기준수량</label>
          <input
            type="number"
            min={0}
            value={editData?.std_intl ?? 0}
            onChange={e => setEditData((p: any) => ({ ...p, std_intl: Number(e.target.value) }))}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">국내선 기준수량</label>
          <input
            type="number"
            min={0}
            value={editData?.std_dom ?? 0}
            onChange={e => setEditData((p: any) => ({ ...p, std_dom: Number(e.target.value) }))}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {editMsg && (
        <div className={`p-2 rounded text-sm ${editMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {editMsg}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleEditSave}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium"
        >
          저장
        </button>
        <button
          onClick={() => { setEditMode(false); setEditMsg(''); }}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium"
        >
          취소
        </button>
      </div>
    </div>
  )}
</div>
```

---

## 최종 작업

```bash
git add .
git commit -m "feat: medicine edit and delete in slideover panel"
git push origin master
```

---

## 검증 항목

- [ ] 재고현황 탭 품목 행 클릭 → 슬라이드오버 열림
- [ ] 슬라이드오버 하단 "✏️ 품목 정보 수정" 버튼 표시
- [ ] 수정 폼에서 값 변경 후 저장 → 목록 즉시 반영
- [ ] "🗑️ 품목 삭제" 클릭 → 확인 모달 → 삭제 후 목록에서 제거
- [ ] 기본 60품목도 수정/삭제 가능
- [ ] 삭제 시 해당 품목 입출고 이력도 함께 삭제 확인
