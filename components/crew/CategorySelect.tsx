'use client';

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
    <div className="flex flex-col items-center justify-center w-full px-4">
      <h1 className="text-[30px] font-bold text-center mb-6">의약품 분류를 선택하세요</h1>
      <div className="grid grid-cols-3 gap-4 justify-items-center mx-auto w-full max-w-[700px]">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className="flex flex-col items-center justify-center p-[5px] min-h-[120px] w-full border-2 border-gray-200 rounded-xl text-center hover:border-blue-400 hover:shadow-md active:scale-95 active:bg-blue-50 transition-all duration-100 touch-manipulation"
          >
            <span className="text-[30px] mb-2">{cat.icon}</span>
            <span className="text-[20px] font-semibold text-gray-800">{cat.label}</span>
            <span className="text-[15px] text-gray-500 hidden sm:block">{cat.desc}</span>
            <span className="text-[15px] font-medium text-blue-600">{counts[cat.key] ?? 0}품목</span>
          </button>
        ))}
      </div>
    </div>
  );
}
