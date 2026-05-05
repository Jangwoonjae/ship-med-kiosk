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

export default function StockTable({ routeType }: StockTableProps) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [summary, setSummary] = useState({ total: 0, normal: 0, warning: 0, critical: 0 });
  const [detail, setDetail] = useState<Medicine | null>(null);
  const [adjDelta, setAdjDelta] = useState(0);
  const [history, setHistory] = useState<TxRow[]>([]);

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

  const stdQty = (m: Medicine) => routeType === 'international' ? m.std_intl : m.std_dom;

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '전체', value: summary.total, color: 'bg-blue-50 text-blue-700' },
          { label: '정상', value: summary.normal, color: 'bg-green-50 text-green-700' },
          { label: '경고', value: summary.warning, color: 'bg-orange-50 text-orange-700' },
          { label: '긴급', value: summary.critical, color: 'bg-red-50 text-red-700' },
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
          placeholder="검색 (성분명·한글명)"
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

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              {['성분명', '분류', '현재고', '기준수량', '상태', '조정'].map(h => (
                <th key={h} className="px-3 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {medicines.map(m => {
              const std = stdQty(m);
              const status = getStockStatus(m.current_qty, std);
              return (
                <tr
                  key={m.id}
                  className="border-t hover:bg-blue-50 cursor-pointer"
                  onClick={() => { setDetail(m); setAdjDelta(0); }}
                >
                  <td className="px-3 py-3">
                    <div className="font-medium">{m.name_ko}</div>
                    <div className="text-gray-400 text-xs">{m.name_en}</div>
                  </td>
                  <td className="px-3 py-3">{m.category}</td>
                  <td className="px-3 py-3 font-bold">{m.current_qty}</td>
                  <td className="px-3 py-3">{std}</td>
                  <td className="px-3 py-3"><StatusBadge status={status} /></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button className="w-8 h-8 bg-gray-200 rounded text-lg hover:bg-gray-300" onClick={e => { e.stopPropagation(); setDetail(m); setAdjDelta(-1); }}>−</button>
                      <button className="w-8 h-8 bg-gray-200 rounded text-lg hover:bg-gray-300" onClick={e => { e.stopPropagation(); setDetail(m); setAdjDelta(1); }}>+</button>
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
          <div className="flex-1 bg-black/40" onClick={() => setDetail(null)} />
          <div className="w-full sm:w-[420px] bg-white shadow-2xl p-4 sm:p-6 overflow-y-auto flex flex-col gap-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold">{detail.name_ko}</h3>
                <p className="text-sm text-gray-500">{detail.name_en}</p>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 text-2xl leading-none">✕</button>
            </div>

            <div className="space-y-1.5 text-sm bg-gray-50 rounded-xl p-4">
              <p><span className="text-gray-500 w-20 inline-block">상품명</span> {detail.brand_name}</p>
              <p><span className="text-gray-500 w-20 inline-block">분류</span> {detail.category}</p>
              <p><span className="text-gray-500 w-20 inline-block">제형/함량</span> {detail.form} {detail.strength}</p>
              <p><span className="text-gray-500 w-20 inline-block">효능</span> {detail.indication}</p>
              <p><span className="text-gray-500 w-20 inline-block">현재고</span> <strong>{detail.current_qty}</strong></p>
              <p><span className="text-gray-500 w-20 inline-block">기준수량</span> 국제 {detail.std_intl} / 국내 {detail.std_dom}</p>
              {detail.barcode && (
                <p><span className="text-gray-500 w-20 inline-block">바코드</span> <code className="bg-white border rounded px-1">{detail.barcode}</code></p>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">재고 직접 조정</p>
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 bg-gray-200 rounded-lg text-xl hover:bg-gray-300" onClick={() => setAdjDelta(d => d - 1)}>−</button>
                <span className={`w-14 text-center text-xl font-bold ${adjDelta > 0 ? 'text-green-600' : adjDelta < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                  {adjDelta > 0 ? `+${adjDelta}` : adjDelta}
                </span>
                <button className="w-10 h-10 bg-gray-200 rounded-lg text-xl hover:bg-gray-300" onClick={() => setAdjDelta(d => d + 1)}>+</button>
                <TouchButton variant="primary" size="sm" onClick={() => handleAdj(detail.id)} disabled={adjDelta === 0}>
                  적용
                </TouchButton>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">최근 이력</p>
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
          </div>
        </div>
      )}
    </div>
  );
}
