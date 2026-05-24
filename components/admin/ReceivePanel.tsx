'use client';
import { useState, useRef, useEffect } from 'react';
import BarcodeInput from '../ui/BarcodeInput';
import BarcodeCamera from '../ui/BarcodeCamera';
import TouchButton from '../ui/TouchButton';

interface Medicine {
  id: number;
  name_ko: string;
  name_en: string | null;
  brand_name: string;
  category: string;
  current_qty: number;
  barcode: string | null;
}

interface NewMedicineForm {
  name_ko: string;
  name_en: string;
  brand_name: string;
  category: string;
  form: string;
  strength: string;
  indication: string;
  std_intl: number;
  std_dom: number;
  barcode: string;
}

interface ReceivePanelProps {
  onComplete: () => void;
}

const EMPTY_FORM: NewMedicineForm = {
  name_ko: '', name_en: '', brand_name: '', category: '내용약',
  form: '', strength: '', indication: '', std_intl: 0, std_dom: 0, barcode: '',
};

const parseGS1Expiry = (barcode: string): string | null => {
  const clean = barcode.replace(/[^0-9]/g, '');
  if (clean.startsWith('01') && clean.slice(16, 18) === '17') {
    const dateStr = clean.slice(18, 24);
    const yy = dateStr.slice(0, 2);
    const mm = dateStr.slice(2, 4);
    const year = parseInt(yy) < 50 ? '20' + yy : '19' + yy;
    return year + '-' + mm;
  }
  const afterGtin = clean.slice(16);
  const match = afterGtin.match(/^17(\d{6})/);
  if (match) {
    const yy = match[1].slice(0, 2);
    const mm = match[1].slice(2, 4);
    const year = parseInt(yy) < 50 ? '20' + yy : '19' + yy;
    return year + '-' + mm;
  }
  return null;
};

const parseGS1Lot = (barcode: string): string | null => {
  const clean = barcode.replace(/[^0-9a-zA-Z]/g, '');
  const match = clean.match(/10([A-Z0-9]+?)(?=\d{2}[0-9]{6}|$)/i);
  return match ? match[1] : null;
};

const parseGS1 = (barcode: string) => ({
  expiry: parseGS1Expiry(barcode),
  lot: parseGS1Lot(barcode),
});

const extractKeywords = (name: string): string[] => {
  const keywords: string[] = [];

  // 1순위: 괄호 안 성분명
  const parenMatches = name.match(/\(([^)]+)\)/g);
  if (parenMatches) {
    parenMatches.forEach(m => {
      const inner = m.replace(/[()]/g, '').trim();
      const first = inner.split(/[+,·]/)[0].trim();
      if (first.length >= 2) keywords.push(first.slice(0, 6));
    });
  }

  // 2순위: 괄호 앞 상품명 앞 4글자
  const beforeParen = name.split('(')[0].trim();
  if (beforeParen.length >= 2) keywords.push(beforeParen.slice(0, 4));

  // 3순위: 전체 앞 4글자
  keywords.push(name.slice(0, 4));

  return [...new Set(keywords.filter(k => k.length >= 2))];
};

const detectCategory = (name: string, form: string): '내용약' | '주사약' | '외용약' => {
  const text = (name + ' ' + form).toLowerCase();
  if (/주사|injection|amp|vial|iv|infusion|수액|앰플|바이알/.test(text)) return '주사약';
  if (/크림|연고|gel|cream|oint|로션|액|drops|spray|패치|밴드|band|파스|테이프|포비돈|소독|외용|점안|점이|비강/.test(text)) return '외용약';
  return '내용약';
};

export default function ReceivePanel({ onComplete }: ReceivePanelProps) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);

  // 3단계 흐름 상태
  const [directMedicine, setDirectMedicine] = useState<Medicine | null>(null);
  const [similarMedicines, setSimilarMedicines] = useState<Medicine[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newMed, setNewMed] = useState<NewMedicineForm>({ ...EMPTY_FORM });

  const [inboundQty, setInboundQty] = useState(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [lotNo, setLotNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);

  const isHttps = typeof window !== 'undefined' &&
    (window.location.protocol === 'https:' || window.location.hostname === 'localhost');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { barcodeInputRef.current?.focus(); }, []);

  const resetInbound = () => {
    setDirectMedicine(null);
    setSimilarMedicines([]);
    setShowNewForm(false);
    setNewMed({ ...EMPTY_FORM });
    setBarcodeInput('');
    setInboundQty(1);
    setExpiryDate('');
    setLotNo('');
  };

  const handleCameraScan = (code: string) => {
    setCameraOpen(false);
    setBarcodeInput(code);
  };

  // ── 바코드 조회 (3단계 흐름) ──────────────────────────────
  const handleBarcode = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setMsg('');
    setDirectMedicine(null);
    setSimilarMedicines([]);
    setShowNewForm(false);

    const { expiry, lot } = parseGS1(code.trim());
    if (expiry) setExpiryDate(expiry);
    if (lot) setLotNo(lot);

    try {
      const res = await fetch('/api/barcode/' + encodeURIComponent(code.trim()));
      const data = await res.json();

      if (!data.matched) {
        setMsg(data.error ?? '등록되지 않은 바코드입니다. 수동으로 품목을 검색하세요.');
        return;
      }

      console.log('barcode result:', data);

      // 1단계: DB에 바코드 직접 매칭
      if (data.source === 'local' && data.directInbound) {
        console.log('직접 입고 모드:', data.medicine);
        setDirectMedicine(data.medicine as Medicine);
        return;
      }

      // 2단계: 스크래핑 결과 → 유사 성분명 검색
      const scrapedName = (data.medicine as any)?.name ?? '';

      const baseForm: NewMedicineForm = {
        ...EMPTY_FORM,
        name_ko: scrapedName,
        brand_name: (data.medicine as any)?.name ?? '',
        barcode: code.trim(),
        form: (data.medicine as any)?.form ?? '',
        strength: (data.medicine as any)?.packQty ?? '',
        indication: (data.medicine as any)?.company ?? '',
        category: detectCategory(scrapedName, (data.medicine as any)?.form ?? ''),
      };

      const keywords = extractKeywords(scrapedName);
      let simList: Medicine[] = [];
      for (const kw of keywords) {
        const simRes = await fetch('/api/medicines?search=' + encodeURIComponent(kw) + '&limit=5');
        simList = await simRes.json();
        if (simList.length > 0) break;
      }

      if (simList.length > 0) {
        // 3-A: 유사 성분명 발견
        setSimilarMedicines(simList);
        setNewMed(baseForm);
        return;
      }

      // 3-B: 유사 성분명 없음 → 신규 등록 폼
      setNewMed(baseForm);
      setShowNewForm(true);
    } finally {
      setLoading(false);
    }
  };

  // ── 1단계: 직접 입고 ──────────────────────────────────────
  const handleDirectInbound = async (medicineId: number) => {
    setLoading(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_id: medicineId,
          type: 'in',
          quantity: inboundQty,
          actor: '관리자',
          note: '입고',
        }),
      });

      if (expiryDate) {
        await fetch('/api/medicines/' + medicineId, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expiry_date: expiryDate + '-01',
            lot_no: lotNo || null,
          }),
        });
      }

      if (res.ok) {
        setMsg('✅ 입고 완료');
        resetInbound();
        onComplete();
      }
    } finally {
      setLoading(false);
    }
  };

  // ── 3-A: 유사 성분명 매핑 후 입고 ────────────────────────
  const handleMappingInbound = async (med: Medicine) => {
    setLoading(true);
    try {
      // 기존 바코드에 추가 (덮어쓰지 않고 append)
      const existingBarcode = med.barcode ?? '';
      const newBarcode = existingBarcode
        ? existingBarcode + ',' + barcodeInput
        : barcodeInput;

      await fetch('/api/medicines/' + med.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: newBarcode,
          expiry_date: expiryDate ? expiryDate + '-01' : null,
          lot_no: lotNo || null,
        }),
      });

      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_id: med.id,
          type: 'in',
          quantity: inboundQty,
          actor: '관리자',
          note: '입고',
        }),
      });

      setMsg('✅ 입고 완료 (바코드 연결됨)');
      resetInbound();
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  // ── 3-B: 신규 등록 + 입고 ────────────────────────────────
  const handleRegisterNew = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/medicines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMed,
          current_qty: inboundQty,
          barcode: newMed.barcode || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setMsg(`❌ 등록 실패: ${err.error}`);
        return;
      }
      const created = await res.json();
      if (expiryDate && created?.id) {
        await fetch('/api/medicines/' + created.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expiry_date: expiryDate + '-01',
            lot_no: lotNo || null,
          }),
        });
      }
      setMsg(`✅ "${newMed.name_ko}" 신규 등록 및 입고(${inboundQty}개) 완료`);
      resetInbound();
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQ) return;
    const res = await fetch('/api/medicines?search=' + encodeURIComponent(searchQ));
    setSearchResults(await res.json());
  };

  const setField = (k: keyof NewMedicineForm, v: string | number) =>
    setNewMed(f => ({ ...f, [k]: v }));

  // ── 공통: 유효기간/로트 입력 섹션 ────────────────────────
  const ExpiryLotSection = () => (
    <div className="space-y-2 pt-1">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">
          유효기간 <span className="text-gray-400 text-xs">(선택)</span>
        </label>
        {expiryDate && (
          <div className="text-sm text-blue-600 mb-1">📅 자동 인식: {expiryDate}</div>
        )}
        <div className="flex gap-2 items-center">
          <input
            type="month"
            value={expiryDate}
            onChange={e => setExpiryDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-base bg-white"
          />
          {expiryDate && (
            <button onClick={() => setExpiryDate('')} className="text-gray-400 text-sm">지우기</button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">2D 바코드 스캔 시 자동 입력됩니다</p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">
          로트번호 <span className="text-gray-400 text-xs">(선택)</span>
        </label>
        <input
          type="text"
          value={lotNo}
          onChange={e => setLotNo(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-base bg-white"
          placeholder="로트번호 입력"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <BarcodeInput onScan={handleBarcode} />

      {/* 바코드 입력 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">바코드 입력</h3>
        <div className="flex gap-2">
          <input
            ref={barcodeInputRef}
            type="text"
            placeholder="바코드 번호 직접 입력"
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { handleBarcode(barcodeInput); setBarcodeInput(''); } }}
            className="border rounded-lg px-3 py-2 text-base flex-1"
          />
          <TouchButton variant="secondary" size="sm" onClick={() => { handleBarcode(barcodeInput); setBarcodeInput(''); }}>
            조회
          </TouchButton>
          <button
            onClick={() => setCameraOpen(true)}
            disabled={!isHttps}
            className="border rounded-lg px-3 py-2 text-base bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            title={!isHttps ? 'HTTPS 환경에서만 사용 가능' : '카메라로 스캔'}
          >
            📷 카메라
          </button>
        </div>
        <p className="text-gray-400 text-sm mt-1">USB 바코드 리더기로 스캔하거나 직접 입력하세요</p>
      </div>

      {cameraOpen && (
        <BarcodeCamera onScan={handleCameraScan} onClose={() => setCameraOpen(false)} />
      )}

      {/* 품목 검색 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">품목 검색</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="성분명 또는 한글명"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="border rounded-lg px-3 py-2 text-base flex-1"
          />
          <TouchButton variant="secondary" size="sm" onClick={handleSearch}>검색</TouchButton>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto">
            {searchResults.map(m => (
              <button
                key={m.id}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 flex justify-between items-center"
                onClick={() => {
                  setDirectMedicine(m);
                  setSimilarMedicines([]);
                  setShowNewForm(false);
                  setSearchResults([]);
                  setSearchQ('');
                  setMsg('');
                }}
              >
                <div>
                  <span className="font-medium">{m.name_ko}</span>
                  <span className="text-gray-400 text-sm ml-2">{m.name_en}</span>
                </div>
                <span className="text-gray-500 text-sm">재고: {m.current_qty}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 메시지 */}
      {msg && (
        <div className={`p-3 rounded-lg text-sm ${
          msg.startsWith('✅') ? 'bg-green-50 text-green-700' :
          msg.startsWith('❌') ? 'bg-red-50 text-red-700' :
          'bg-yellow-50 text-yellow-700'
        }`}>
          {msg}
        </div>
      )}

      {/* 1단계: 직접 입고 UI */}
      {directMedicine && (
        <div className="border-2 border-green-200 rounded-xl p-4 bg-green-50 space-y-3">
          <h3 className="font-semibold text-green-800 text-lg">✅ 등록된 품목</h3>
          <div>
            <div className="font-medium text-lg">{directMedicine.name_ko}</div>
            <div className="text-sm text-gray-500">{directMedicine.brand_name}</div>
            <div className="text-sm text-gray-500">현재고: {directMedicine.current_qty}</div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">입고 수량:</label>
            <button
              onClick={() => setInboundQty(q => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-lg border bg-white text-lg font-bold hover:bg-gray-100"
            >−</button>
            <span className="text-xl font-bold w-12 text-center">{inboundQty}</span>
            <button
              onClick={() => setInboundQty(q => q + 1)}
              className="w-10 h-10 rounded-lg border bg-white text-lg font-bold hover:bg-gray-100"
            >+</button>
          </div>

          <ExpiryLotSection />

          <div className="flex gap-2 pt-1">
            <TouchButton variant="ghost" size="sm" onClick={resetInbound}>취소</TouchButton>
            <button
              onClick={() => handleDirectInbound(directMedicine.id)}
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold text-lg disabled:opacity-50"
            >
              입고 처리
            </button>
          </div>
        </div>
      )}

      {/* 3-A: 유사 성분명 매핑 UI */}
      {similarMedicines.length > 0 && !showNewForm && (
        <div className="border-2 border-yellow-200 rounded-xl p-4 bg-yellow-50 space-y-3">
          <h3 className="font-semibold text-yellow-800 text-lg">🔍 유사 성분명 발견</h3>
          <p className="text-sm text-gray-600">아래 기존 성분명에 입고하시겠습니까?</p>

          <div className="space-y-2">
            {similarMedicines.map(med => (
              <div key={med.id} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                <div>
                  <div className="font-medium">{med.name_ko}</div>
                  <div className="text-sm text-gray-500">현재고: {med.current_qty}</div>
                </div>
                <button
                  onClick={() => handleMappingInbound(med)}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
                >
                  이 성분에 입고
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 py-1">
            <label className="text-sm font-medium">입고 수량:</label>
            <button onClick={() => setInboundQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-lg border bg-white text-lg font-bold hover:bg-gray-100">−</button>
            <span className="text-lg font-bold w-8 text-center">{inboundQty}</span>
            <button onClick={() => setInboundQty(q => q + 1)} className="w-8 h-8 rounded-lg border bg-white text-lg font-bold hover:bg-gray-100">+</button>
          </div>

          <ExpiryLotSection />

          <button
            onClick={() => { setSimilarMedicines([]); setShowNewForm(true); }}
            className="w-full border-2 border-gray-300 text-gray-600 py-3 rounded-xl font-medium"
          >
            신규 성분으로 등록
          </button>
        </div>
      )}

      {/* 3-B: 신규 등록 폼 */}
      {showNewForm && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-orange-800">신규 의약품 등록</h3>
          <p className="text-xs text-orange-600">외부 조회 결과 — 정보를 확인하고 등록하세요</p>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="block text-gray-600 mb-0.5">한글명 *</label>
              <input className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newMed.name_ko} onChange={e => setField('name_ko', e.target.value)} />
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">영문명 <span className="text-gray-400 text-xs">(선택)</span></label>
              <input className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newMed.name_en} onChange={e => setField('name_en', e.target.value)} />
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">상품명</label>
              <input className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newMed.brand_name} onChange={e => setField('brand_name', e.target.value)} />
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">분류 *</label>
              <select className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newMed.category} onChange={e => setField('category', e.target.value)}>
                <option>내용약</option><option>주사약</option><option>외용약</option>
              </select>
              <span className="text-xs text-blue-500 mt-0.5 block">
                자동 감지: {detectCategory(newMed.name_ko + ' ' + newMed.brand_name, newMed.form)}
              </span>
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">제형</label>
              <input className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newMed.form} onChange={e => setField('form', e.target.value)} placeholder="tab / amp / vial ..." />
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">함량</label>
              <input className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newMed.strength} onChange={e => setField('strength', e.target.value)} placeholder="500mg" />
            </div>
            <div className="col-span-2">
              <label className="block text-gray-600 mb-0.5">효능</label>
              <input className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newMed.indication} onChange={e => setField('indication', e.target.value)} />
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">국제선 기준수량</label>
              <input type="number" min={0} className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newMed.std_intl} onChange={e => setField('std_intl', Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">국내선 기준수량</label>
              <input type="number" min={0} className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newMed.std_dom} onChange={e => setField('std_dom', Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">초기 입고수량</label>
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 bg-white border rounded-lg hover:bg-gray-100" onClick={() => setInboundQty(q => Math.max(1, q - 1))}>−</button>
                <span className="text-lg font-bold w-8 text-center">{inboundQty}</span>
                <button className="w-8 h-8 bg-white border rounded-lg hover:bg-gray-100" onClick={() => setInboundQty(q => q + 1)}>+</button>
              </div>
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">바코드</label>
              <input className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newMed.barcode} onChange={e => setField('barcode', e.target.value)} />
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">유효기간 <span className="text-gray-400 text-xs">(선택)</span></label>
              {expiryDate && <div className="text-xs text-blue-600 mb-1">📅 자동 인식: {expiryDate}</div>}
              <div className="flex gap-1 items-center">
                <input
                  type="month"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                />
                {expiryDate && <button onClick={() => setExpiryDate('')} className="text-gray-400 text-xs whitespace-nowrap">지우기</button>}
              </div>
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">로트번호 <span className="text-gray-400 text-xs">(선택)</span></label>
              <input type="text" value={lotNo} onChange={e => setLotNo(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="로트번호" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <TouchButton variant="ghost" size="sm" onClick={resetInbound}>취소</TouchButton>
            <TouchButton
              variant="primary"
              size="sm"
              onClick={handleRegisterNew}
              disabled={loading || !newMed.name_ko}
              className="flex-1"
            >
              신규 등록 + 입고
            </TouchButton>
          </div>
        </div>
      )}
    </div>
  );
}
