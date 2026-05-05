'use client';
import { useState } from 'react';

const KO_ROWS = [
  ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'],
  ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'],
  ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ'],
];

const EN_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

interface NameInputProps {
  onConfirm: (name: string) => void;
}

export default function NameInput({ onConfirm }: NameInputProps) {
  const [name, setName] = useState('');
  const [isKo, setIsKo] = useState(true);
  const rows = isKo ? KO_ROWS : EN_ROWS;

  return (
    <div className="flex flex-col items-center justify-center w-full px-4">
      <h1 className="text-[30px] font-bold text-center mb-4">이름을 입력하세요</h1>

      <div className="w-full max-w-[400px] mx-auto flex items-center gap-2 bg-white border-2 border-blue-400 rounded-2xl px-4 py-2 mb-4">
        <span className="text-[15px] flex-1 min-h-[36px] text-center flex items-center justify-center">
          {name || <span className="text-gray-400">홍길동</span>}
        </span>
        <button
          className="text-[15px] p-[5px] min-w-[44px] min-h-[44px] flex items-center justify-center border rounded touch-manipulation"
          onClick={() => setName(n => n.slice(0, -1))}
        >⌫</button>
      </div>

      <div className="flex flex-col items-center w-full mx-auto">
        {rows.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1 mb-1">
            {row.map(key => (
              <button
                key={key}
                className="text-[15px] p-[5px] min-w-[44px] min-h-[44px] flex items-center justify-center border rounded bg-gray-100 hover:bg-gray-200 active:bg-gray-300 touch-manipulation"
                onClick={() => setName(n => n + key)}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
        <div className="flex justify-center gap-1.5 mt-2">
          <button
            className="text-[15px] p-[5px] min-w-[44px] min-h-[44px] flex items-center justify-center border rounded bg-gray-100 hover:bg-gray-200 w-20 touch-manipulation"
            onClick={() => setIsKo(v => !v)}
          >
            {isKo ? 'ENG' : '한글'}
          </button>
          <button
            className="text-[15px] p-[5px] min-w-[44px] min-h-[44px] flex items-center justify-center border rounded bg-gray-100 hover:bg-gray-200 flex-1 touch-manipulation"
            onClick={() => setName(n => n + ' ')}
          >
            공백
          </button>
          <button
            className="text-[15px] p-[5px] min-w-[44px] min-h-[44px] flex items-center justify-center border rounded bg-gray-100 hover:bg-gray-200 w-20 touch-manipulation"
            onClick={() => setName('')}
          >
            전체삭제
          </button>
        </div>
      </div>

      <button
        className="text-[20px] font-semibold p-[5px] w-full max-w-[400px] mx-auto flex items-center justify-center rounded-lg bg-blue-500 text-white mt-4 min-h-[56px] disabled:opacity-40 touch-manipulation"
        disabled={name.trim().length === 0}
        onClick={() => onConfirm(name.trim())}
      >
        확인 →
      </button>
    </div>
  );
}
