'use client';
import { useState } from 'react';

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
      <h1 className="text-[30px] font-bold text-center mb-4">출고 수량 확인</h1>
      <p className="text-[15px] text-gray-500 text-center">이름: <strong>{actor}</strong></p>

      <div className="max-h-[55vh] overflow-y-auto pr-1">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-[5px] border-b">
            <div>
              <div className="text-[15px] font-bold text-gray-800">{item.name_ko}</div>
              <div className="text-[15px] text-gray-500">{item.name_en}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="text-[20px] p-[5px] min-w-[44px] min-h-[44px] flex items-center justify-center border rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 touch-manipulation"
                onClick={() => setQty(item.id, -1)}
                disabled={quantities[item.id] <= 1}
              >−</button>
              <span className="text-[20px] font-bold min-w-[30px] text-center">{quantities[item.id]}</span>
              <button
                className="text-[20px] p-[5px] min-w-[44px] min-h-[44px] flex items-center justify-center border rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 touch-manipulation"
                onClick={() => setQty(item.id, 1)}
                disabled={quantities[item.id] >= item.current_qty}
              >+</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          className="text-[20px] font-semibold p-[5px] flex-1 border border-gray-300 text-gray-700 rounded-lg flex items-center justify-center min-h-[56px] hover:bg-gray-50 touch-manipulation"
          onClick={onBack}
        >← 뒤로</button>
        <button
          className="text-[20px] font-semibold p-[5px] flex-1 bg-blue-600 text-white rounded-lg flex items-center justify-center min-h-[56px] hover:bg-blue-700 touch-manipulation"
          onClick={handleConfirm}
        >출고 완료</button>
      </div>
    </div>
  );
}
