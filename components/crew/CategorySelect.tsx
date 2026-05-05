'use client';
import TouchButton from '../ui/TouchButton';

const CATEGORIES = [
  { key: '내용약', label: '내복약', icon: '💊', desc: '먹는 약' },
  { key: '주사약', label: '주사약', icon: '💉', desc: '주사로 투여' },
  { key: '외용약', label: '외용약', icon: '🩹', desc: '피부·눈·귀 등 외용' },
];

interface CategorySelectProps {
  counts: Record<string, number>;
  onSelect: (category: string) => void;
}

export default function CategorySelect({ counts, onSelect }: CategorySelectProps) {
  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-3xl mx-auto px-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">분류를 선택하세요</h2>
      <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className="
              flex flex-col items-center justify-center gap-2 sm:gap-3
              min-h-[110px] sm:min-h-[160px] p-3 sm:p-6
              bg-white border-2 border-gray-200
              rounded-2xl shadow-sm
              hover:border-blue-400 hover:shadow-md
              active:scale-95 active:bg-blue-50
              transition-all duration-100
              touch-manipulation
            "
          >
            <span className="text-4xl sm:text-5xl">{cat.icon}</span>
            <span className="text-lg sm:text-2xl font-bold text-gray-800">{cat.label}</span>
            <span className="hidden sm:block text-base text-gray-500">{cat.desc}</span>
            <span className="text-xs sm:text-sm font-medium text-blue-600">{counts[cat.key] ?? 0}품목</span>
          </button>
        ))}
      </div>
    </div>
  );
}
