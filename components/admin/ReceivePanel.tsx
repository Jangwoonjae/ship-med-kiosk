'use client';
import { useState, useRef, useEffect } from 'react';
import BarcodeInput from '../ui/BarcodeInput';
import TouchButton from '../ui/TouchButton';

interface Medicine {
  id: number;
  name_ko: string;
  name_en: string;
  category: string;
  current_qty: number;
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

export default function ReceivePanel({ onComplete }: ReceivePanelProps) {
  const [manualCode, setManualCode] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [found, setFound] = useState<Medicine | null>(null);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [newForm, setNewForm] = useState<NewMedicineForm | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newMed, setNewMed] = useState({
    category: '내용약', name_ko: '', name_en: '', brand_name: '',
    form: '', strength: '', indication: '',
    std_intl: 0, std_dom: 0, current_qty: 0, barcode: '',
  });
  const [newMedMsg, setNewMedMsg] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const handleBarcode = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch(`/api/barcode/${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      if (data.matched && data.medicine) {
        setFound(data.medicine);
        setNewForm(null);
      } else if (data.matched && data.scrapeData) {
        const sd = data.scrapeData;
        setNewForm({
          ...EMPTY_FORM,
          name_ko: sd.name ?? '',
          name_en: '',
          brand_name: sd.name ?? '',
          form: sd.form ?? '',
          indication: sd.company ?? '',
          barcode: code.trim(),
        });
        setMsg('as21.net에서 조회됨. 아래 정보를 확인하고 신규 등록하세요.');
      } else {
        setMsg(data.error ?? '바코드 미확인 — 수동 입력으로 진행하세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQ) return;
    const res = await fetch(`/api/medicines?search=${encodeURIComponent(searchQ)}`);
    const data = await res.json();
    setSearchResults(data);
  };

  const handleReceive = async () => {
    if (!found) return;
    setLoading(true);
    try {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_id: found.id,
          type: 'in',
          quantity: qty,
          actor: '관리자',
          note: note || '입고',
        }),
      });
      setMsg(`✅ ${found.name_ko} ${qty}개 입고 완료`);
      setFound(null);
      setQty(1);
      setNote('');
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterNew = async () => {
    if (!newForm) return;
    setLoading(true);
    try {
      const res = await fetch('/api/medicines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newForm,
          current_qty: qty,
          barcode: newForm.barcode || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setMsg(`❌ 등록 실패: ${err.error}`);
        return;
      }
      setMsg(`✅ "${newForm.name_ko}" 신규 등록 및 입고(${qty}개) 완료`);
      setNewForm(null);
      setQty(1);
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  const handleNewMedSubmit = async () => {
    if (!newMed.name_ko || !newMed.category) {
      setNewMedMsg('성분명(한글)과 분류는 필수입니다.');
      return;
    }
    const res = await fetch('/api/medicines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newMed, barcode: newMed.barcode || null }),
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

  const setField = (k: keyof NewMedicineForm, v: string | number) =>
    setNewForm(f => f ? { ...f, [k]: v } : f);

  return (
    <div className="space-y-6 max-w-2xl">
      <BarcodeInput onScan={handleBarcode} />

      {/* 신규 품목 등록 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowNewForm(v => !v); setNewMedMsg(''); }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          ➕ 신규 품목 등록
        </button>
      </div>

      {/* 신규 등록 폼 */}
      {showNewForm && (
        <div className="border-2 border-purple-200 rounded-xl p-4 bg-purple-50 space-y-3">
          <h3 className="font-semibold text-purple-800 text-lg">신규 의약품 등록</h3>

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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-gray-600 block mb-1">국제선 기준수량</label>
              <input
                type="number" min={0}
                value={newMed.std_intl}
                onChange={e => setNewMed(p => ({ ...p, std_intl: Number(e.target.value) }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">국내선 기준수량</label>
              <input
                type="number" min={0}
                value={newMed.std_dom}
                onChange={e => setNewMed(p => ({ ...p, std_dom: Number(e.target.value) }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">현재 재고</label>
              <input
                type="number" min={0}
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

      <div>
        <h3 className="text-lg font-semibold mb-2">바코드 입력</h3>
        <div className="flex gap-2">
          <input
            ref={barcodeInputRef}
            type="text"
            placeholder="바코드 번호 직접 입력"
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { handleBarcode(manualCode); setManualCode(''); } }}
            className="border rounded-lg px-3 py-2 text-base flex-1"
          />
          <TouchButton variant="secondary" size="sm" onClick={() => { handleBarcode(manualCode); setManualCode(''); }}>
            조회
          </TouchButton>
        </div>
        <p className="text-gray-400 text-sm mt-1">USB 바코드 리더기로 스캔하거나 직접 입력하세요</p>
      </div>

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
                onClick={() => { setFound(m); setNewForm(null); setSearchResults([]); setSearchQ(''); setMsg(''); }}
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

      {msg && (
        <div className={`p-3 rounded-lg text-sm ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : msg.startsWith('❌') ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
          {msg}
        </div>
      )}

      {/* 기존 품목 입고 */}
      {found && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-blue-800">{found.name_ko}</h3>
          <p className="text-sm text-blue-600">{found.name_en} | 현재고: {found.current_qty}</p>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">수량</label>
            <button className="w-10 h-10 bg-white border rounded-lg text-xl hover:bg-gray-100" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
            <span className="text-xl font-bold w-10 text-center">{qty}</span>
            <button className="w-10 h-10 bg-white border rounded-lg text-xl hover:bg-gray-100" onClick={() => setQty(q => q + 1)}>+</button>
          </div>
          <input
            type="text"
            placeholder="사유 (선택)"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-base"
          />
          <div className="flex gap-2">
            <TouchButton variant="ghost" size="sm" onClick={() => setFound(null)}>취소</TouchButton>
            <TouchButton variant="primary" size="sm" onClick={handleReceive} disabled={loading} className="flex-1">
              입고 확정
            </TouchButton>
          </div>
        </div>
      )}

      {/* 신규 품목 등록 */}
      {newForm && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-orange-800">신규 품목 등록</h3>
          <p className="text-xs text-orange-600">외부 API 조회 결과 — 정보를 확인하고 등록하세요</p>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="block text-gray-600 mb-0.5">한글명 *</label>
              <input className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newForm.name_ko} onChange={e => setField('name_ko', e.target.value)} />
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">영문명 *</label>
              <input className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newForm.name_en} onChange={e => setField('name_en', e.target.value)} />
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">상품명</label>
              <input className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newForm.brand_name} onChange={e => setField('brand_name', e.target.value)} />
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">분류 *</label>
              <select className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newForm.category} onChange={e => setField('category', e.target.value)}>
                <option>내용약</option><option>주사약</option><option>외용약</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">제형</label>
              <input className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newForm.form} onChange={e => setField('form', e.target.value)} placeholder="tab / amp / vial ..." />
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">함량</label>
              <input className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newForm.strength} onChange={e => setField('strength', e.target.value)} placeholder="500mg" />
            </div>
            <div className="col-span-2">
              <label className="block text-gray-600 mb-0.5">효능</label>
              <input className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newForm.indication} onChange={e => setField('indication', e.target.value)} />
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">국제선 기준수량</label>
              <input type="number" min={0} className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newForm.std_intl} onChange={e => setField('std_intl', Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">국내선 기준수량</label>
              <input type="number" min={0} className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newForm.std_dom} onChange={e => setField('std_dom', Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">초기 입고수량</label>
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 bg-white border rounded-lg hover:bg-gray-100" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <span className="text-lg font-bold w-8 text-center">{qty}</span>
                <button className="w-8 h-8 bg-white border rounded-lg hover:bg-gray-100" onClick={() => setQty(q => q + 1)}>+</button>
              </div>
            </div>
            <div>
              <label className="block text-gray-600 mb-0.5">바코드</label>
              <input className="w-full border rounded-lg px-2 py-1.5 text-sm" value={newForm.barcode} onChange={e => setField('barcode', e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <TouchButton variant="ghost" size="sm" onClick={() => setNewForm(null)}>취소</TouchButton>
            <TouchButton
              variant="primary"
              size="sm"
              onClick={handleRegisterNew}
              disabled={loading || !newForm.name_ko || !newForm.name_en}
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
