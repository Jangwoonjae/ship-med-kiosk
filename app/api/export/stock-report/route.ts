import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
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

  const { medicines: med } = schema;
  const stdCol = isIntl ? med.std_intl : med.std_dom;

  const rows = await db.select({
    category: med.category,
    name_ko: med.name_ko,
    brand_name: med.brand_name,
    form: med.form,
    strength: med.strength,
    current_qty: med.current_qty,
    std_qty: stdCol,
  }).from(med)
    .orderBy(asc(med.category), asc(med.name_ko))
    .all();

  const medicines = rows as Array<{
    category: string; name_ko: string; brand_name: string;
    form: string; strength: string; current_qty: number; std_qty: number;
  }>;

  const now = new Date();
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;

  const border = { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const margins = { top: 80, bottom: 80, left: 120, right: 120 };
  const colWidths = [560, 2100, 1800, 800, 1000, 900, 900, 966];
  const headers = ['번호', '성분명', '상품명', '제형', '함량', '현재고', '기준량', '상태'];

  const getStatus = (cur: number, std: number) => {
    if (!std) return { text: '-', color: '888888' };
    const r = cur / std;
    if (r <= 0.5) return { text: '긴급', color: 'CC0000' };
    if (r < 0.8) return { text: '경고', color: 'FF6600' };
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
          children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })],
        })],
      })
    ),
  });

  const makeDataRow = (m: typeof medicines[0], idx: number) => {
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
            })],
          })],
        })
      ),
    });
  };

  const categories = ['주사약', '내용약', '외용약'];
  const getStatusText = (m: typeof medicines[0]) =>
    getStatus(Number(m.current_qty), Number(m.std_qty)).text;
  const okCnt = medicines.filter(m => getStatusText(m) === '정상').length;
  const warnCnt = medicines.filter(m => getStatusText(m) === '경고').length;
  const dangerCnt = medicines.filter(m => getStatusText(m) === '긴급').length;

  const docChildren: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: '선내 의약품 재고현황 보고서', bold: true, size: 40 })],
    }),
    new Paragraph({ children: [new TextRun('')] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: `기준일: ${dateStr}  |  항로: ${isIntl ? '국제선' : '국내선'}`,
        size: 22, color: '555555',
      })],
    }),
    new Paragraph({ children: [new TextRun('')] }),
    new Paragraph({
      children: [new TextRun({
        text: `전체 ${medicines.length}품목  |  정상 ${okCnt}  |  경고 ${warnCnt}  |  긴급 ${dangerCnt}`,
        size: 22, bold: true,
      })],
    }),
    new Paragraph({ children: [new TextRun('')] }),
  ];

  for (const cat of categories) {
    const catMeds = medicines.filter(m => m.category === cat);
    if (!catMeds.length) continue;
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: `■ ${cat} (${catMeds.length}품목)`, bold: true, size: 26 })],
      }),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: colWidths,
        rows: [makeHeaderRow(), ...catMeds.map((m, i) => makeDataRow(m, i))],
      }),
      new Paragraph({ children: [new TextRun('')] }),
    );
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        },
      },
      children: docChildren,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const filename = encodeURIComponent(`재고현황_${now.toISOString().slice(0, 10)}.docx`);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
