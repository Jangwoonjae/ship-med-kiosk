'use client';
import { useState } from 'react';
import TouchButton from '../ui/TouchButton';

interface SelectedItem {
  id: number;
  name_ko: string;
  name_en: string;
  current_qty: number;
}

interface ConfirmStepProps {
  actor: string;
  items: SelectedItem[];
  onConfirm: (items: Array<{ medicine_id: number; quantity: number }>) => void;
  onBack: () => void;
}

export default function ConfirmStep({ actor, items, onConfirm, onBack }: ConfirmStepProps) {
  const [quantities, setQuantities] = useState<Record<number, number>>(
    Object.fromEntries(items.map(i => [i.id, 1]))
  );

  const setQty = (id: number, delta: number) => {
    setQuantities(prev => {
      const next = (prev[id] ?? 1) + delta;
      const item = items.find(i => i.id === id);
      return { ...prev, [id]: Math.min(Math.max(1, next), item?.current_qty ?? 99) };
    });
  };

  const handleConfirm = () => {
    onConfirm(items.map(i => ({ medicine_id: i.id, quantity: quantities[i.id] ?? 1 })));
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 gap-4">
      <h2 className="text-2xl font-bold text-gray-800">수량을 확인하세요</h2>
      <p className="text-gray-500">이름: <strong>{actor}</strong></p>

      <div className="space-y-3 mb-4">
        {items.map(item => (
          <div key={item.id} className="flex items-center bg-white border border-gray-200 rounded-xl p-4 gap-3">
            <div className="flex-1">
              <div className="font-bold text-gray-800">{item.name_ko}</div>
              <div className="text-sm text-gray-500">{item.name_en}</div>
            </div>
            <div className="flex items-center gap-2">
              <TouchButton
                variant="secondary"
                size="sm"
                className="min-w-[48px] min-h-[48px] text-xl"
                onClick={() => setQty(item.id, -1)}
                disabled={quantities[item.id] <= 1}
              >−</TouchButton>
              <span className="w-10 text-center text-xl font-bold">{quantities[item.id]}</span>
              <TouchButton
                variant="secondary"
                size="sm"
                className="min-w-[48px] min-h-[48px] text-xl"
                onClick={() => setQty(item.id, 1)}
                disabled={quantities[item.id] >= item.current_qty}
              >+</TouchButton>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <TouchButton variant="ghost" size="lg" onClick={onBack} className="flex-1">← 뒤로</TouchButton>
        <TouchButton variant="primary" size="lg" onClick={handleConfirm} className="flex-1">
          출고 완료
        </TouchButton>
      </div>
    </div>
  );
}
