'use client';
import StatusBadge from '../ui/StatusBadge';
import TouchButton from '../ui/TouchButton';

interface MedicineItem {
  id: number;
  name_en: string;
  name_ko: string;
  current_qty: number;
  std_qty: number;
  status: 'normal' | 'warning' | 'critical' | 'empty';
}

interface MedicineGridProps {
  items: MedicineItem[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onNext: () => void;
}

export default function MedicineGrid({ items, selected, onToggle, onNext }: MedicineGridProps) {
  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto px-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-3">의약품을 선택하세요 (복수 선택 가능)</h2>

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="grid grid-cols-2 gap-3">
          {items.map(item => {
            const isSelected = selected.has(item.id);
            const isEmpty = item.status === 'empty';
            return (
              <button
                key={item.id}
                disabled={isEmpty}
                onClick={() => onToggle(item.id)}
                className={`
                  flex flex-col gap-1.5 p-4 min-h-[90px]
                  rounded-xl border-2 text-left
                  transition-all duration-100
                  touch-manipulation
                  ${isEmpty
                    ? 'opacity-40 bg-gray-100 border-gray-200 cursor-not-allowed'
                    : isSelected
                    ? 'bg-blue-50 border-blue-500 shadow-md'
                    : 'bg-white border-gray-200 hover:border-blue-300 active:scale-95'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-base font-bold text-gray-800 leading-tight">{item.name_ko}</span>
                  <StatusBadge status={item.status} />
                </div>
                <span className="text-sm text-gray-500">{item.name_en}</span>
                <span className="text-sm font-medium text-gray-700">재고: {item.current_qty}</span>
                {isSelected && (
                  <span className="text-xs text-blue-600 font-semibold">✓ 선택됨</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t-2 border-gray-200 flex justify-end max-w-4xl mx-auto">
        <TouchButton
          variant="primary"
          size="lg"
          disabled={selected.size === 0}
          onClick={onNext}
          className="min-w-[200px]"
        >
          수량 확인 → ({selected.size}종)
        </TouchButton>
      </div>
    </div>
  );
}
