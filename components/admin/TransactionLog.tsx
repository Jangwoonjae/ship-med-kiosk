'use client';
import { useState, useEffect } from 'react';

interface TxRow {
  id: number;
  type: string;
  quantity: number;
  actor: string;
  note: string;
  created_at: string;
  name_ko: string | null;
  name_en: string | null;
  category: string | null;
}

export default function TransactionLog() {
  const [rows, setRows] = useState<TxRow[]>([]);
  const [type, setType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    const q = new URLSearchParams();
    if (type) q.set('type', type);
    if (dateFrom) q.set('dateFrom', dateFrom);
    if (dateTo) q.set('dateTo', dateTo);
    if (search) q.set('search', search);
    fetch(`/api/transactions?${q}`).then(r => r.json()).then(setRows);
  };

  useEffect(() => { load(); }, [type, dateFrom, dateTo, search]);

  const handleCsvDownload = () => {
    const q = new URLSearchParams({ csv: '1' });
    if (type) q.set('type', type);
    if (dateFrom) q.set('dateFrom', dateFrom);
    if (dateTo) q.set('dateTo', dateTo);
    if (search) q.set('search', search);
    window.open(`/api/transactions?${q}`);
  };

  const typeLabel = (t: string) => ({ in: '입고', out: '출고', adj: '조정' }[t] ?? t);
  const typeColor = (t: string) => ({ in: 'text-green-600', out: 'text-red-600', adj: 'text-blue-600' }[t] ?? '');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">시작일</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">종료일</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        <select value={type} onChange={e => setType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm self-end">
          <option value="">전체 유형</option>
          <option value="in">입고</option>
          <option value="out">출고</option>
          <option value="adj">조정</option>
        </select>
        <input
          type="text"
          placeholder="품목 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[120px] self-end"
        />
        <button
          onClick={handleCsvDownload}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 self-end"
        >
          CSV 내보내기
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['일시', '유형', '품목명', '수량', '처리자', '메모'].map(h => (
                <th key={h} className="px-3 py-3 text-left font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className={`px-3 py-2 font-medium ${typeColor(r.type)}`}>{typeLabel(r.type)}</td>
                <td className="px-3 py-2">
                  <div>{r.name_ko}</div>
                  <div className="text-gray-400 text-xs">{r.name_en}</div>
                </td>
                <td className="px-3 py-2 font-bold">{r.type === 'out' ? '-' : '+'}{r.quantity}</td>
                <td className="px-3 py-2">{r.actor}</td>
                <td className="px-3 py-2 text-gray-500">{r.note}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">이력이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
