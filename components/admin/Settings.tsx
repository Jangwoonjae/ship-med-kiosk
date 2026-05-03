'use client';
import { useState, useEffect } from 'react';
import TouchButton from '../ui/TouchButton';

interface SettingsProps {
  onRouteTypeChange: (rt: string) => void;
}

interface MedicineStd {
  id: number;
  name_ko: string;
  name_en: string;
  category: string;
  std_intl: number;
  std_dom: number;
}

export default function Settings({ onRouteTypeChange }: SettingsProps) {
  const [shipName, setShipName] = useState('');
  const [routeType, setRouteType] = useState('international');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const [stdList, setStdList] = useState<MedicineStd[]>([]);
  const [stdEdits, setStdEdits] = useState<Record<number, { std_intl: number; std_dom: number }>>({});
  const [stdSaving, setStdSaving] = useState(false);
  const [stdMsg, setStdMsg] = useState('');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      if (s.ship_name) setShipName(s.ship_name);
      if (s.route_type) { setRouteType(s.route_type); onRouteTypeChange(s.route_type); }
    });
    fetch('/api/medicines').then(r => r.json()).then((list: MedicineStd[]) => setStdList(list));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const body: Record<string, string> = { ship_name: shipName, route_type: routeType };
      if (newPin) {
        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
          setMsg('PIN은 숫자 4자리여야 합니다.'); setSaving(false); return;
        }
        if (newPin !== confirmPin) {
          setMsg('PIN이 일치하지 않습니다.'); setSaving(false); return;
        }
        body.new_pin = newPin;
      }
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMsg('✅ 저장 완료');
        onRouteTypeChange(routeType);
        setNewPin(''); setConfirmPin('');
      } else {
        setMsg('저장 실패');
      }
    } finally {
      setSaving(false);
    }
  };

  const setStdEdit = (id: number, key: 'std_intl' | 'std_dom', val: number) =>
    setStdEdits(prev => ({ ...prev, [id]: { ...(prev[id] ?? { std_intl: stdList.find(m => m.id === id)?.std_intl ?? 0, std_dom: stdList.find(m => m.id === id)?.std_dom ?? 0 }), [key]: val } }));

  const handleSaveStd = async () => {
    setStdSaving(true);
    setStdMsg('');
    const ids = Object.keys(stdEdits).map(Number);
    if (ids.length === 0) { setStdMsg('변경 사항 없음'); setStdSaving(false); return; }
    try {
      await Promise.all(ids.map(id =>
        fetch(`/api/medicines/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stdEdits[id]),
        })
      ));
      setStdList(list => list.map(m => stdEdits[m.id] ? { ...m, ...stdEdits[m.id] } : m));
      setStdEdits({});
      setStdMsg(`✅ ${ids.length}개 품목 기준수량 저장 완료`);
    } catch {
      setStdMsg('저장 실패');
    } finally {
      setStdSaving(false);
    }
  };

  const catOrder = ['주사약', '내용약', '외용약'];
  const grouped = catOrder.map(cat => ({
    cat,
    items: stdList.filter(m => m.category === cat),
  }));

  return (
    <div className="space-y-8 max-w-2xl">
      {/* 선박 정보 + PIN */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3">선박 정보</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 block mb-1">선박명</label>
              <input
                type="text"
                value={shipName}
                onChange={e => setShipName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-base"
                placeholder="예: 한진 서울호"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">항로 구분</label>
              <div className="flex gap-3">
                {[{ val: 'international', label: '국제선' }, { val: 'domestic', label: '국내선' }].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setRouteType(opt.val)}
                    className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${routeType === opt.val ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">관리자 PIN 변경</h3>
          <div className="space-y-3">
            <input
              type="password"
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="새 PIN 4자리"
              className="w-full border rounded-lg px-3 py-2 text-base"
              maxLength={4}
            />
            <input
              type="password"
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="PIN 확인"
              className="w-full border rounded-lg px-3 py-2 text-base"
              maxLength={4}
            />
          </div>
        </div>

        {msg && (
          <div className={`p-3 rounded-lg text-sm ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {msg}
          </div>
        )}

        <TouchButton variant="primary" size="lg" onClick={handleSave} disabled={saving} className="w-full">
          저장
        </TouchButton>
      </div>

      {/* 기준수량 일괄 편집 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">기준수량 일괄 편집</h3>
          <TouchButton variant="secondary" size="sm" onClick={handleSaveStd} disabled={stdSaving || Object.keys(stdEdits).length === 0}>
            변경 저장 ({Object.keys(stdEdits).length}건)
          </TouchButton>
        </div>
        {stdMsg && (
          <div className={`mb-3 p-3 rounded-lg text-sm ${stdMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {stdMsg}
          </div>
        )}
        <div className="space-y-4">
          {grouped.map(({ cat, items }) => (
            <div key={cat}>
              <h4 className="text-sm font-semibold text-gray-500 mb-1">{cat}</h4>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">품목명</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600 w-28">국제선</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600 w-28">국내선</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(m => {
                      const edit = stdEdits[m.id];
                      const intl = edit?.std_intl ?? m.std_intl;
                      const dom = edit?.std_dom ?? m.std_dom;
                      const changed = edit !== undefined;
                      return (
                        <tr key={m.id} className={`border-t ${changed ? 'bg-yellow-50' : ''}`}>
                          <td className="px-3 py-2">
                            <div>{m.name_ko}</div>
                            <div className="text-gray-400 text-xs">{m.name_en}</div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min={0}
                              value={intl}
                              onChange={e => setStdEdit(m.id, 'std_intl', Math.max(0, Number(e.target.value)))}
                              className="w-20 border rounded px-2 py-1 text-center text-sm"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min={0}
                              value={dom}
                              onChange={e => setStdEdit(m.id, 'std_dom', Math.max(0, Number(e.target.value)))}
                              className="w-20 border rounded px-2 py-1 text-center text-sm"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
