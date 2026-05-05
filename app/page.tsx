'use client';
import { useState, useEffect, useCallback } from 'react';
import NameInput from '@/components/crew/NameInput';
import CategorySelect from '@/components/crew/CategorySelect';
import MedicineGrid from '@/components/crew/MedicineGrid';
import ConfirmStep from '@/components/crew/ConfirmStep';
import { getStockStatus } from '@/lib/stockUtils';

type Step = 1 | 2 | 3 | 4;

interface MedicineRaw {
  id: number;
  name_en: string;
  name_ko: string;
  current_qty: number;
  std_intl: number;
  std_dom: number;
  category: string;
}

export default function CrewKiosk() {
  const [step, setStep] = useState<Step>(1);
  const [actor, setActor] = useState('');
  const [category, setCategory] = useState('');
  const [medicines, setMedicines] = useState<MedicineRaw[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [routeType, setRouteType] = useState('international');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isDone, setIsDone] = useState(false);

  const reset = useCallback(() => {
    setStep(1);
    setActor('');
    setCategory('');
    setSelected(new Set());
    setIsDone(false);
  }, []);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      if (s.route_type) setRouteType(s.route_type);
    }).catch(() => {});
    fetch('/api/medicines')
      .then(r => r.json())
      .then((all: MedicineRaw[]) => {
        const counts = all.reduce<Record<string, number>>((acc, m) => {
          acc[m.category] = (acc[m.category] ?? 0) + 1;
          return acc;
        }, {});
        setCategoryCounts(counts);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (step === 3 && category) {
      fetch(`/api/medicines?category=${encodeURIComponent(category)}`)
        .then(r => r.json())
        .then(setMedicines)
        .catch(() => {});
    }
  }, [step, category]);

  useEffect(() => {
    if (isDone) {
      const t = setTimeout(reset, 5000);
      return () => clearTimeout(t);
    }
  }, [isDone, reset]);

  const getMedicineItems = () =>
    medicines.map(m => ({
      id: m.id,
      name_en: m.name_en,
      name_ko: m.name_ko,
      current_qty: m.current_qty,
      std_qty: routeType === 'international' ? m.std_intl : m.std_dom,
      status: getStockStatus(m.current_qty, routeType === 'international' ? m.std_intl : m.std_dom),
    }));

  const handleDispense = async (items: Array<{ medicine_id: number; quantity: number }>) => {
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, actor }),
    });
    setIsDone(true);
  };

  if (isDone) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-green-50 gap-6">
        <div className="text-8xl">✅</div>
        <h1 className="text-4xl font-bold text-green-700">출고 완료!</h1>
        <p className="text-xl text-gray-600">{actor}님, 처리가 완료되었습니다.</p>
        <p className="text-gray-400">5초 후 자동으로 초기화됩니다.</p>
        <button onClick={reset} className="mt-4 text-blue-500 underline text-lg">바로 초기화</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-blue-700 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">선내 의약품 관리</h1>
          <p className="text-blue-200 text-xs sm:text-sm">선원 출고 시스템</p>
        </div>
        <div className="flex gap-1.5 sm:gap-2">
          {[1, 2, 3, 4].map(s => (
            <span
              key={s}
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full ${step === s ? 'bg-white' : 'bg-blue-400'}`}
            />
          ))}
        </div>
      </header>

      {/* 본문 — overflow-y-auto를 main에, items-center는 내부 div에 */}
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center py-6 sm:py-8">
          {step === 1 && (
            <NameInput onConfirm={name => { setActor(name); setStep(2); }} />
          )}
          {step === 2 && (
            <CategorySelect
              counts={categoryCounts}
              onSelect={cat => { setCategory(cat); setStep(3); }}
            />
          )}
          {step === 3 && (
            <MedicineGrid
              items={getMedicineItems()}
              selected={selected}
              onToggle={id => setSelected(prev => {
                const next = new Set(prev);
                next.has(id) ? next.delete(id) : next.add(id);
                return next;
              })}
              onNext={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <ConfirmStep
              actor={actor}
              items={getMedicineItems().filter(m => selected.has(m.id))}
              onConfirm={handleDispense}
              onBack={() => setStep(3)}
            />
          )}
        </div>
      </main>

      {/* 관리자 링크 */}
      <footer className="text-center py-2">
        <a href="/admin" className="text-gray-300 text-xs hover:text-gray-500">관리자</a>
      </footer>
    </div>
  );
}
