'use client';
import StatusBadge from '../ui/StatusBadge';

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
    <div className="flex flex-col items-center w-full px-4">
      <h2 className="text-[20px] font-semibold text-center mb-4 self-start">의약품을 선택하세요 (복수 선택 가능)</h2>

      <div className="w-full overflow-y-auto pb-24">
        <div className="grid portrait:grid-cols-2 landscape:grid-cols-4 gap-4 justify-items-center mx-auto w-full">
          {items.map(item => {
            const isSelected = selected.has(item.id);
            const isEmpty = item.status === 'empty';
            return (
              <button
                key={item.id}
                disabled={isEmpty}
                onClick={() => onToggle(item.id)}
                className={`
                  flex flex-col items-center justify-center p-[5px] border-2 rounded-xl w-full text-center min-h-[100px]
                  transition-all duration-100 touch-manipulation
                  ${isEmpty
                    ? 'opacity-40 bg-gray-100 border-gray-200 cursor-not-allowed'
                    : isSelected
                    ? 'bg-blue-50 border-blue-500 shadow-md'
                    : 'bg-white border-gray-200 hover:border-blue-300 active:scale-95'
                  }
                `}
              >
                <span className="text-[15px] font-semibold text-gray-800 leading-tight">{item.name_ko}</span>
                <span className="text-[15px] text-gray-500">{item.name_en}</span>
                <span className="text-[15px] mt-1"><StatusBadge status={item.status} /></span>
                <span className="text-[15px] font-medium text-gray-700">재고: {item.current_qty}</span>
                {isSelected && (
                  <span className="text-[15px] text-blue-600 font-semibold">✓ 선택됨</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 flex justify-center p-[5px] bg-white border-t">
        <button
          disabled={selected.size === 0}
          onClick={onNext}
          className="text-[20px] font-semibold p-[5px] px-8 bg-blue-600 text-white rounded-lg disabled:opacity-40 min-h-[56px] touch-manipulation"
        >
          수량 확인 → ({selected.size}종)
        </button>
      </div>
    </div>
  );
}
