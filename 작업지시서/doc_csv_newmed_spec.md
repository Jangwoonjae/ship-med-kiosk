# DOC 출력 + CSV 출력 + 신규 의약품 등록 작업지시서

> 프로젝트: `ship-med-kiosk`
> 작업 위치: `C:\projects\ship_med\ship-med-kiosk`

---

## ⚠️ Vercel 배포 주의사항 (절대 변경 금지)
- `TURSO_AUTH_TOKEN` — 수정 금지
- `Node.js Version` — 반드시 20.x 유지

---

## #1 — DOC 출력 버튼 추가 + 재고현황 CSV 출력

### 1-1. DOC 출력 버튼 위치 확인 및 추가

`app/api/export/stock-report/route.ts` 파일이 존재하는지 확인.
없으면 아래 내용으로 신규 생성:

```ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  Document, Packer, Paragraph, TextRun,
  Table, TableRow, TableCell,
  AlignmentType, HeadingLevel,
  BorderStyle, WidthType, ShadingType, VerticalAlign,
} from 'docx';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const routeType = searchParams.get('route') ?? 'international';
  const isIntl = routeType !== 'domestic';

  const result = await db.execute(`
    SELECT category, name_ko, brand_name, form, strength,
           current_qty,
           ${isIntl ? 'std_intl' : 'std_dom'} as std_qty
    FROM medicines
    ORDER BY category, name_ko
  `);

  const medicines = result.rows as any[];
  const now = new Date();
  const dateStr = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일`;

  const border = { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const margins = { top: 80, bottom: 80, left: 120, right: 120 };
  const colWidths = [560, 2100, 1800, 800, 1000, 900, 900, 966];
  const headers = ['번호','성분명','상품명','제형','함량','현재고','기준량','상태'];

  const getStatus = (cur: number, std: number) => {
    if (!std) return { text: '-', color: '888888' };
    const r = cur / std;
    if (r <= 0.5) return { text: '긴급', color: 'CC0000' };
    if (r <  0.8) return { text: '경고', color: 'FF6600' };
    return { text: '정상', color: '006600' };
  };

  const makeHeaderRow = () => new TableRow({
    tableHeader: true,
    children: headers.map((text, i) =>
      new TableCell({
        borders, margins,
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: { fill: '1d4ed8', type: ShadingType.CLEAR },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })]
        })]
      })
    )
  });

  const makeDataRow = (m: any, idx: number) => {
    const status = getStatus(Number(m.current_qty), Number(m.std_qty));
    const fill = status.text === '긴급' ? 'FFF0F0'
               : status.text === '경고' ? 'FFF8F0' : 'FFFFFF';
    const cells = [
      String(idx + 1),
      m.name_ko ?? '',
      m.brand_name ?? '',
      m.form ?? '',
      m.strength ?? '',
      String(m.current_qty ?? 0),
      String(m.std_qty ?? 0),
      status.text,
    ];
    return new TableRow({
      children: cells.map((text, i) =>
        new TableCell({
          borders, margins,
          width: { size: colWidths[i], type: WidthType.DXA },
          shading: { fill, type: ShadingType.CLEAR },
          children: [new Paragraph({
            alignment: i === 0 || i >= 5 ? AlignmentType.CENTER : AlignmentType.LEFT,
            children: [new TextRun({
              text, size: 18,
              color: i === 7 ? status.color : '000000',
              bold: i === 7 && status.text !== '정상',
            })]
          })]
        })
      )
    });
  };

  const categories = ['주사약', '내용약', '외용약'];
  const getStatusText = (m: any) => getStatus(Number(m.current_qty), Number(m.std_qty)).text;
  const okCnt     = medicines.filter(m => getStatusText(m) === '정상').length;
  const warnCnt   = medicines.filter(m => getStatusText(m) === '경고').length;
  const dangerCnt = medicines.filter(m => getStatusText(m) === '긴급').length;

  const docChildren: any[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: '선내 의약품 재고현황 보고서', bold: true, size: 40 })]
    }),
    new Paragraph({ children: [new TextRun('')] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: `기준일: ${dateStr}  |  항로: ${isIntl ? '국제선' : '국내선'}`,
        size: 22, color: '555555'
      })]
    }),
    new Paragraph({ children: [new TextRun('')] }),
    new Paragraph({
      children: [new TextRun({
        text: `전체 ${medicines.length}품목  |  정상 ${okCnt}  |  경고 ${warnCnt}  |  긴급 ${dangerCnt}`,
        size: 22, bold: true
      })]
    }),
    new Paragraph({ children: [new TextRun('')] }),
  ];

  for (const cat of categories) {
    const catMeds = medicines.filter(m => m.category === cat);
    if (!catMeds.length) continue;
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: `■ ${cat} (${catMeds.length}품목)`, bold: true, size: 26 })]
      }),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: colWidths,
        rows: [makeHeaderRow(), ...catMeds.map((m, i) => makeDataRow(m, i))]
      }),
      new Paragraph({ children: [new TextRun('')] }),
    );
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Malgun Gothic', size: 20 } } },
      paragraphStyles: [{
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal',
        run: { size: 26, bold: true, font: 'Malgun Gothic' },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 }
      }]
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
        }
      },
      children: docChildren
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  const filename = encodeURIComponent(`재고현황_${now.toISOString().slice(0,10)}.docx`);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    }
  });
}
```

### 1-2. 재고현황 CSV 출력 API Route

**`app/api/export/stock-csv/route.ts`** 신규 생성:

```ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const routeType = searchParams.get('route') ?? 'international';
  const isIntl = routeType !== 'domestic';

  const result = await db.execute(`
    SELECT category, name_ko, name_en, brand_name, form, strength,
           current_qty,
           ${isIntl ? 'std_intl' : 'std_dom'} as std_qty,
           barcode
    FROM medicines
    ORDER BY category, name_ko
  `);

  const medicines = result.rows as any[];

  const getStatus = (cur: number, std: number) => {
    if (!std) return '-';
    const r = cur / std;
    if (r <= 0.5) return '긴급';
    if (r < 0.8) return '경고';
    return '정상';
  };

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  // BOM 추가 (한글 깨짐 방지)
  const BOM = '\uFEFF';
  const header = '분류,성분명(한글),성분명(영문),상품명,제형,함량,현재고,기준수량,상태,바코드\n';
  const rows = medicines.map(m => {
    const status = getStatus(Number(m.current_qty), Number(m.std_qty));
    return [
      m.category,
      m.name_ko,
      m.name_en,
      m.brand_name,
      m.form,
      m.strength,
      m.current_qty,
      m.std_qty,
      status,
      m.barcode ?? '',
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
  }).join('\n');

  const csv = BOM + header + rows;
  const filename = encodeURIComponent(`재고현황_${dateStr}.csv`);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    }
  });
}
```

### 1-3. StockTable 컴포넌트에 버튼 추가

**`components/admin/StockTable.tsx`** 상단 툴바에 DOC/CSV 버튼 추가:

```tsx
// 핸들러 함수 추가
const handleExportDoc = async () => {
  const res = await fetch(`/api/export/stock-report?route=${routeType}`);
  if (!res.ok) { alert('DOC 생성 실패'); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `재고현황_${new Date().toISOString().slice(0,10)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
};

const handleExportCsv = async () => {
  const res = await fetch(`/api/export/stock-csv?route=${routeType}`);
  if (!res.ok) { alert('CSV 생성 실패'); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `재고현황_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// JSX 툴바에 추가 (기존 검색/필터 옆)
<div className="flex gap-2">
  <button
    onClick={handleExportCsv}
    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
  >
    📊 CSV 출력
  </button>
  <button
    onClick={handleExportDoc}
    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
  >
    📄 DOC 출력
  </button>
</div>
```

### 1-4. docx 패키지 설치 (미설치 시)

```bash
pnpm add docx
```

---

## #2 — 목록에 없는 의약품 신규 등록

### 2-1. 신규 등록 UI — ReceivePanel에 추가

**`components/admin/ReceivePanel.tsx`** 에 "신규 품목 등록" 섹션 추가:

바코드 스캔/검색 후 미등록 품목일 때 자동으로 신규 등록 폼이 열리도록 처리.
또는 별도 "신규 품목 등록" 버튼으로 폼 직접 열기.

```tsx
// 신규 등록 폼 상태
const [showNewForm, setShowNewForm] = useState(false);
const [newMed, setNewMed] = useState({
  category: '내용약',
  name_ko: '',
  name_en: '',
  brand_name: '',
  form: '',
  strength: '',
  indication: '',
  std_intl: 0,
  std_dom: 0,
  current_qty: 0,
  barcode: '',
});
const [newMedMsg, setNewMedMsg] = useState('');

const handleNewMedSubmit = async () => {
  if (!newMed.name_ko || !newMed.category) {
    setNewMedMsg('성분명(한글)과 분류는 필수입니다.');
    return;
  }
  const res = await fetch('/api/medicines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newMed),
  });
  if (res.ok) {
    setNewMedMsg('✅ 신규 품목이 등록되었습니다.');
    setNewMed({
      category: '내용약', name_ko: '', name_en: '', brand_name: '',
      form: '', strength: '', indication: '',
      std_intl: 0, std_dom: 0, current_qty: 0, barcode: '',
    });
    setShowNewForm(false);
    onComplete();
  } else {
    setNewMedMsg('등록 실패');
  }
};
```

신규 등록 폼 JSX:

```tsx
{/* 신규 품목 등록 버튼 */}
<button
  onClick={() => setShowNewForm(!showNewForm)}
  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
>
  ➕ 신규 품목 등록
</button>

{/* 신규 등록 폼 */}
{showNewForm && (
  <div className="border-2 border-purple-200 rounded-xl p-4 bg-purple-50 space-y-3 mt-4">
    <h3 className="font-semibold text-purple-800 text-lg">신규 의약품 등록</h3>

    {/* 분류 */}
    <div>
      <label className="text-sm text-gray-600 block mb-1">분류 *</label>
      <div className="flex gap-2">
        {['주사약', '내용약', '외용약'].map(cat => (
          <button
            key={cat}
            onClick={() => setNewMed(p => ({ ...p, category: cat }))}
            className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium ${
              newMed.category === cat
                ? 'border-purple-500 bg-purple-100 text-purple-700'
                : 'border-gray-200 text-gray-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>

    {/* 성분명 */}
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-sm text-gray-600 block mb-1">성분명(한글) *</label>
        <input
          type="text"
          value={newMed.name_ko}
          onChange={e => setNewMed(p => ({ ...p, name_ko: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="예: 아세트아미노펜"
        />
      </div>
      <div>
        <label className="text-sm text-gray-600 block mb-1">성분명(영문)</label>
        <input
          type="text"
          value={newMed.name_en}
          onChange={e => setNewMed(p => ({ ...p, name_en: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="예: Acetaminophen"
        />
      </div>
    </div>

    {/* 상품명 / 제형 */}
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-sm text-gray-600 block mb-1">상품명(별칭)</label>
        <input
          type="text"
          value={newMed.brand_name}
          onChange={e => setNewMed(p => ({ ...p, brand_name: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="예: 타이레놀"
        />
      </div>
      <div>
        <label className="text-sm text-gray-600 block mb-1">제형</label>
        <input
          type="text"
          value={newMed.form}
          onChange={e => setNewMed(p => ({ ...p, form: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="예: tab, amp, vial, cream"
        />
      </div>
    </div>

    {/* 함량 / 바코드 */}
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-sm text-gray-600 block mb-1">함량</label>
        <input
          type="text"
          value={newMed.strength}
          onChange={e => setNewMed(p => ({ ...p, strength: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="예: 500mg, 5mg/1mL"
        />
      </div>
      <div>
        <label className="text-sm text-gray-600 block mb-1">바코드</label>
        <input
          type="text"
          value={newMed.barcode}
          onChange={e => setNewMed(p => ({ ...p, barcode: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="바코드 번호"
        />
      </div>
    </div>

    {/* 효능효과 */}
    <div>
      <label className="text-sm text-gray-600 block mb-1">효능·효과</label>
      <input
        type="text"
        value={newMed.indication}
        onChange={e => setNewMed(p => ({ ...p, indication: e.target.value }))}
        className="w-full border rounded-lg px-3 py-2 text-sm"
        placeholder="예: 해열, 진통"
      />
    </div>

    {/* 기준수량 / 현재고 */}
    <div className="grid grid-cols-3 gap-3">
      <div>
        <label className="text-sm text-gray-600 block mb-1">국제선 기준수량</label>
        <input
          type="number"
          min={0}
          value={newMed.std_intl}
          onChange={e => setNewMed(p => ({ ...p, std_intl: Number(e.target.value) }))}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-sm text-gray-600 block mb-1">국내선 기준수량</label>
        <input
          type="number"
          min={0}
          value={newMed.std_dom}
          onChange={e => setNewMed(p => ({ ...p, std_dom: Number(e.target.value) }))}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-sm text-gray-600 block mb-1">현재 재고</label>
        <input
          type="number"
          min={0}
          value={newMed.current_qty}
          onChange={e => setNewMed(p => ({ ...p, current_qty: Number(e.target.value) }))}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
      </div>
    </div>

    {newMedMsg && (
      <div className={`p-3 rounded-lg text-sm ${newMedMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
        {newMedMsg}
      </div>
    )}

    <div className="flex gap-2">
      <button
        onClick={handleNewMedSubmit}
        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium"
      >
        등록
      </button>
      <button
        onClick={() => { setShowNewForm(false); setNewMedMsg(''); }}
        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-medium"
      >
        취소
      </button>
    </div>
  </div>
)}
```

### 2-2. POST API 확인

**`app/api/medicines/route.ts`** 의 POST 핸들러가 아래 필드를 받도록 확인:

```ts
// POST 핸들러 확인 — 없으면 추가
export async function POST(req: Request) {
  const body = await req.json();
  const {
    category, name_ko, name_en, brand_name, form, strength,
    indication, std_intl, std_dom, current_qty, barcode
  } = body;

  if (!name_ko || !category) {
    return Response.json({ error: '성분명과 분류는 필수입니다.' }, { status: 400 });
  }

  await db.execute({
    sql: `INSERT INTO medicines
          (category, name_ko, name_en, brand_name, form, strength,
           indication, std_intl, std_dom, current_qty, barcode, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    args: [category, name_ko, name_en ?? '', brand_name ?? '', form ?? '',
           strength ?? '', indication ?? '', std_intl ?? 0, std_dom ?? 0,
           current_qty ?? 0, barcode ?? null]
  });

  return Response.json({ success: true });
}
```

---

## 최종 작업

```bash
pnpm add docx
git add .
git commit -m "feat: stock DOC/CSV export, new medicine registration"
git push origin master
```

---

## 검증 항목

- [ ] 재고현황 탭에 CSV/DOC 출력 버튼 표시
- [ ] CSV 다운로드 후 엑셀에서 한글 정상 표시
- [ ] DOC 다운로드 후 Word에서 정상 열림
- [ ] 입고 처리 탭에 "신규 품목 등록" 버튼 표시
- [ ] 신규 품목 등록 후 재고 목록에 추가 확인
- [ ] 필수값(성분명, 분류) 미입력 시 경고 메시지 표시
