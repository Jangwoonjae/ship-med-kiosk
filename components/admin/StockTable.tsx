'use client';
import { useState, useEffect } from 'react';
import StatusBadge from '../ui/StatusBadge';
import TouchButton from '../ui/TouchButton';
import { getStockStatus } from '@/lib/stockUtils';

interface Medicine {
  id: number;
  category: string;
  name_en: string;
  name_ko: string;
  brand_name: string;
  form: string;
  strength: string;
  indication: string;
  current_qty: number;
  std_intl: number;
  std_dom: number;
  barcode: string | null;
  expiry_date: string | null;
  lot_no: string | null;
}

interface TxRow {
  id: number;
  type: string;
  quantity: number;
  actor: string;
  created_at: string;
  name_ko: string | null;
}

interface StockTableProps {
  routeType: string;
}

const getExpiryStatus = (expiryDate: string | null) => {
  if (!expiryDate) return { status: 'none', label: '-', color: 'gray' };
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { status: 'expired', label: '만료', color: 'red' };
  if (diffDays < 90) return { status: 'soon', label: '임박', color: 'orange' };
  return { status: 'ok', label: '정상', color: 'green' };
};

export default function StockTable({ routeType }: StockTableProps) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [summary, setSummary] = useState({ total: 0, normal: 0, warning: 0, critical: 0 });
  const [detail, setDetail] = useState<Medicine | null>(null);
  const [adjDelta, setAdjDelta] = useState(0);
  const [history, setHistory] = useState<TxRow[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Medicine> | null>(null);
  const [editMsg, setEditMsg] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    const q = new URLSearchParams({ routeType });
    if (search) q.set('search', search);
    if (catFilter) q.set('category', catFilter);
    if (statusFilter) q.set('status', statusFilter);
    fetch(`/api/medicines?${q}`).then(r => r.json()).then(setMedicines);
    fetch(`/api/medicines?summary=1&routeType=${routeType}`).then(r => r.json()).then(setSummary);
  };

  useEffect(() => { load(); }, [search, catFilter, statusFilter, routeType]);

  useEffect(() => {
    if (detail) {
      fetch(`/api/transactions?medicineId=${detail.id}`)
        .then(r => r.json())
        .then((rows: TxRow[]) => setHistory(rows.slice(0, 5)))
        .catch(() => setHistory([]));
    } else {
      setHistory([]);
    }
  }, [detail]);

  const handleAdj = async (id: number) => {
    if (adjDelta === 0) return;
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medicine_id: id,
        type: 'adj',
        quantity: adjDelta,
        actor: '관리자',
        note: `직접조정 ${adjDelta > 0 ? '+' : ''}${adjDelta}`,
      }),
    });
    setAdjDelta(0);
    setDetail(null);
    load();
  };

  const handleEditSave = async () => {
    if (!detail || !editData) return;
    const res = await fetch(`/api/medicines/${detail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    });
    if (res.ok) {
      setEditMsg('✅ 저장 완료');
      load();
      setEditMode(false);
    } else {
      setEditMsg('저장 실패');
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    const confirmed = confirm(
      `"${detail.name_ko}" 품목을 삭제하시겠습니까?\n\n` +
      '해당 품목의 입출고 이력도 함께 삭제됩니다.\n' +
      '이 작업은 되돌릴 수 없습니다.'
    );
    if (!confirmed) return;
    setDeleting(true);
    const res = await fetch(`/api/medicines/${detail.id}`, { method: 'DELETE' });
    if (res.ok) {
      setDetail(null);
      setEditMode(false);
      load();
    } else {
      alert('삭제 실패');
    }
    setDeleting(false);
  };

  const handleExportCsv = async () => {
    const res = await fetch(`/api/export/stock-csv?route=${routeType}`);
    if (!res.ok) { alert('CSV 생성 실패'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `재고현황_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportDoc = async () => {
    const res = await fetch(`/api/export/stock-report?route=${routeType}`);
    if (!res.ok) { alert('DOC 생성 실패'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `재고현황_${new Date().toISOString().slice(0, 10)}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stdQty = (m: Medicine) => routeType === 'international' ? m.std_intl : m.std_dom;

  const expiredCount = medicines.filter(m => getExpiryStatus(m.expiry_date).status === 'expired').length;
  const soonCount = medicines.filter(m => getExpiryStatus(m.expiry_date).status === 'soon').length;

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: '전체', value: summary.total, color: 'bg-blue-50 text-blue-700' },
          { label: '정상', value: summary.normal, color: 'bg-green-50 text-green-700' },
          { label: '경고', value: summary.warning, color: 'bg-orange-50 text-orange-700' },
          { label: '긴급', value: summary.critical, color: 'bg-red-50 text-red-700' },
          { label: '유효기간 만료', value: expiredCount, color: 'bg-red-100 text-red-800' },
          { label: '유효기간 임박', value: soonCount, color: 'bg-orange-100 text-orange-800' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 sm:p-4 ${s.color}`}>
            <div className="text-2xl sm:text-3xl font-bold">{s.value}</div>
            <div className="text-sm">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder="성분명, 한글명 또는 바코드 번호 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-base flex-1 min-w-[160px]"
        />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-base">
          <option value="">전체 분류</option>
          <option>주사약</option><option>내용약</option><option>외용약</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-base">
          <option value="">전체 상태</option>
          <option value="normal">정상</option>
          <option value="warning">경고</option>
          <option value="critical">긴급</option>
          <option value="empty">품절</option>
        </select>
      </div>

      {/* 내보내기 버튼 */}
      <div className="flex gap-2 justify-end">
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

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-base">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              {['성분명', '분류', '현재고', '기준수량', '유효기간', '상태', '조정'].map(h => (
                <th key={h} className="px-4 py-4 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {medicines.map(m => {
              const std = stdQty(m);
              const status = getStockStatus(m.current_qty, std);
              const expiry = getExpiryStatus(m.expiry_date);
              return (
                <tr
                  key={m.id}
                  className={`border-t hover:bg-blue-50 cursor-pointer ${
                    expiry.status === 'expired' ? 'bg-red-50' :
                    expiry.status === 'soon' ? 'bg-orange-50' : ''
                  }`}
                  onClick={() => { setDetail(m); setAdjDelta(0); }}
                >
                  <td className="px-4 py-4">
                    <div className="font-medium">{m.name_ko}</div>
                    <div className="text-gray-400 text-sm">{m.name_en}</div>
                  </td>
                  <td className="px-4 py-4">{m.category}</td>
                  <td className="px-4 py-4 font-bold">{m.current_qty}</td>
                  <td className="px-4 py-4">{std}</td>
                  <td className="px-4 py-4">
                    {(() => {
                      const dateStr = m.expiry_date
                        ? new Date(m.expiry_date).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit' })
                        : '-';
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          expiry.status === 'expired' ? 'bg-red-100 text-red-700' :
                          expiry.status === 'soon' ? 'bg-orange-100 text-orange-700' :
                          expiry.status === 'ok' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {dateStr !== '-' && dateStr}
                          {expiry.status !== 'none' && <span>{expiry.label}</span>}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-4"><StatusBadge status={status} /></td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button className="w-10 h-10 bg-gray-200 rounded text-xl hover:bg-gray-300" onClick={e => { e.stopPropagation(); setDetail(m); setAdjDelta(-1); }}>−</button>
                      <button className="w-10 h-10 bg-gray-200 rounded text-xl hover:bg-gray-300" onClick={e => { e.stopPropagation(); setDetail(m); setAdjDelta(1); }}>+</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 상세 슬라이드오버 */}
      {detail && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => { setDetail(null); setEditMode(false); setEditMsg(''); }} />
          <div className="w-full sm:w-[480px] bg-white shadow-2xl p-6 overflow-y-auto flex flex-col gap-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-bold">{detail.name_ko}</h3>
                <p className="text-base text-gray-500">{detail.name_en}</p>
              </div>
              <button onClick={() => { setDetail(null); setEditMode(false); setEditMsg(''); }} className="text-gray-400 text-3xl leading-none">✕</button>
            </div>

            <div className="space-y-2 text-base bg-gray-50 rounded-xl p-4">
              <p><span className="text-gray-500 w-24 inline-block">상품명</span> {detail.brand_name}</p>
              <p><span className="text-gray-500 w-24 inline-block">분류</span> {detail.category}</p>
              <p><span className="text-gray-500 w-24 inline-block">제형/함량</span> {detail.form} {detail.strength}</p>
              <p><span className="text-gray-500 w-24 inline-block">효능</span> {detail.indication}</p>
              <p><span className="text-gray-500 w-24 inline-block">현재고</span> <strong>{detail.current_qty}</strong></p>
              <p><span className="text-gray-500 w-24 inline-block">기준수량</span> 국제 {detail.std_intl} / 국내 {detail.std_dom}</p>
              <p><span className="text-gray-500 w-24 inline-block">바코드</span> {detail.barcode ? <code className="bg-white border rounded px-1">{detail.barcode}</code> : '미등록'}</p>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">유효기간</span>
                <span className={`text-sm font-medium ${
                  getExpiryStatus(detail.expiry_date).status === 'expired' ? 'text-red-600' :
                  getExpiryStatus(detail.expiry_date).status === 'soon' ? 'text-orange-600' : 'text-gray-900'
                }`}>
                  {detail.expiry_date
                    ? new Date(detail.expiry_date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit' })
                    : '미입력'}
                  {detail.expiry_date && ` (${getExpiryStatus(detail.expiry_date).label})`}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">로트번호</span>
                <span className="text-sm font-medium">{detail.lot_no ?? '미입력'}</span>
              </div>
            </div>

            <div>
              <p className="text-base font-semibold mb-2">재고 직접 조정</p>
              <div className="flex items-center gap-2">
                <button className="w-12 h-12 bg-gray-200 rounded-lg text-2xl hover:bg-gray-300" onClick={() => setAdjDelta(d => d - 1)}>−</button>
                <span className={`w-16 text-center text-2xl font-bold ${adjDelta > 0 ? 'text-green-600' : adjDelta < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                  {adjDelta > 0 ? `+${adjDelta}` : adjDelta}
                </span>
                <button className="w-12 h-12 bg-gray-200 rounded-lg text-2xl hover:bg-gray-300" onClick={() => setAdjDelta(d => d + 1)}>+</button>
                <TouchButton variant="primary" size="sm" onClick={() => handleAdj(detail.id)} disabled={adjDelta === 0}>
                  적용
                </TouchButton>
              </div>
            </div>

            <div>
              <p className="text-base font-semibold mb-2">최근 이력</p>
              {history.length === 0 ? (
                <p className="text-sm text-gray-400">이력 없음</p>
              ) : (
                <div className="space-y-1">
                  {history.map(h => (
                    <div key={h.id} className="flex items-center justify-between text-sm border-b pb-1">
                      <span className={h.type === 'in' ? 'text-green-600' : h.type === 'out' ? 'text-red-600' : 'text-blue-600'}>
                        {h.type === 'in' ? '입고' : h.type === 'out' ? '출고' : '조정'}
                      </span>
                      <span className="font-medium">{h.quantity > 0 ? `+${h.quantity}` : h.quantity}</span>
                      <span className="text-gray-500">{h.actor}</span>
                      <span className="text-gray-400 text-xs">
                        {new Date(h.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 수정/삭제 */}
            <div className="border-t pt-4 space-y-2">
              {!editMode ? (
                <>
                  <button
                    onClick={() => {
                      setEditMode(true); setEditMsg('');
                      setEditData({
                        category: detail.category,
                        name_ko: detail.name_ko,
                        name_en: detail.name_en,
                        brand_name: detail.brand_name,
                        form: detail.form,
                        strength: detail.strength,
                        indication: detail.indication,
                        std_intl: detail.std_intl,
                        std_dom: detail.std_dom,
                        barcode: detail.barcode ?? '',
                        expiry_date: detail.expiry_date ?? '',
                        lot_no: detail.lot_no ?? '',
                      });
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-base font-medium"
                  >
                    ✏️ 품목 정보 수정
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg text-base font-medium disabled:opacity-50"
                  >
                    🗑️ 품목 삭제
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700">품목 정보 수정</h4>

                  <div>
                    <label className="text-xs text-gray-500 block mb-1">분류</label>
                    <div className="flex gap-2">
                      {['주사약', '내용약', '외용약'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setEditData(p => ({ ...p, category: cat }))}
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

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">성분명(한글)</label>
                      <input type="text" value={editData?.name_ko ?? ''} onChange={e => setEditData(p => ({ ...p, name_ko: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">성분명(영문)</label>
                      <input type="text" value={editData?.name_en ?? ''} onChange={e => setEditData(p => ({ ...p, name_en: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">상품명</label>
                      <input type="text" value={editData?.brand_name ?? ''} onChange={e => setEditData(p => ({ ...p, brand_name: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">제형</label>
                      <input type="text" value={editData?.form ?? ''} onChange={e => setEditData(p => ({ ...p, form: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">함량</label>
                      <input type="text" value={editData?.strength ?? ''} onChange={e => setEditData(p => ({ ...p, strength: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">바코드</label>
                      <input type="text" value={editData?.barcode ?? ''} onChange={e => setEditData(p => ({ ...p, barcode: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">유효기간 <span className="text-gray-400">(선택)</span></label>
                      <input
                        type="month"
                        value={editData?.expiry_date ? editData.expiry_date.slice(0, 7) : ''}
                        onChange={e => setEditData(p => ({ ...p, expiry_date: e.target.value ? e.target.value + '-01' : '' }))}
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">로트번호 <span className="text-gray-400">(선택)</span></label>
                      <input type="text" value={editData?.lot_no ?? ''} onChange={e => setEditData(p => ({ ...p, lot_no: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="로트번호" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">국제선 기준수량</label>
                      <input type="number" min={0} value={editData?.std_intl ?? 0} onChange={e => setEditData(p => ({ ...p, std_intl: Number(e.target.value) }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">국내선 기준수량</label>
                      <input type="number" min={0} value={editData?.std_dom ?? 0} onChange={e => setEditData(p => ({ ...p, std_dom: Number(e.target.value) }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                    </div>
                  </div>

                  {editMsg && (
                    <div className={`p-2 rounded text-sm ${editMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {editMsg}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={handleEditSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-base font-medium">저장</button>
                    <button onClick={() => { setEditMode(false); setEditMsg(''); }} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg text-base font-medium">취소</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
