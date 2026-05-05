'use client';
import { useState } from 'react';
import TouchButton from '../ui/TouchButton';

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
    <div className="flex flex-col items-center gap-3 sm:gap-4 w-full max-w-2xl mx-auto px-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center">이름을 입력하세요</h2>

      <div className="w-full flex items-center gap-2 bg-white border-2 border-blue-400 rounded-2xl px-4 py-2 sm:py-3">
        <span className="text-xl sm:text-2xl font-semibold flex-1 min-h-[36px] sm:min-h-[40px] text-center">{name || <span className="text-gray-400">홍길동</span>}</span>
        <TouchButton variant="ghost" size="sm" onClick={() => setName(n => n.slice(0, -1))}>⌫</TouchButton>
      </div>

      <div className="w-full space-y-1.5 sm:space-y-2">
        {rows.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1">
            {row.map(key => (
              <TouchButton
                key={key}
                variant="secondary"
                size="sm"
                className="flex-1 max-w-[52px] sm:max-w-[60px] !px-1 !min-h-[44px]"
                onClick={() => setName(n => n + key)}
              >
                {key}
              </TouchButton>
            ))}
          </div>
        ))}
        <div className="flex justify-center gap-1.5 sm:gap-2 mt-1">
          <TouchButton variant="secondary" size="sm" className="w-20 sm:w-24" onClick={() => setIsKo(v => !v)}>
            {isKo ? 'ENG' : '한글'}
          </TouchButton>
          <TouchButton variant="secondary" size="sm" className="flex-1" onClick={() => setName(n => n + ' ')}>
            공백
          </TouchButton>
          <TouchButton variant="secondary" size="sm" className="w-20 sm:w-24" onClick={() => setName('')}>
            전체삭제
          </TouchButton>
        </div>
      </div>

      <TouchButton
        variant="primary"
        size="lg"
        className="w-full mt-1"
        disabled={name.trim().length === 0}
        onClick={() => onConfirm(name.trim())}
      >
        확인 →
      </TouchButton>
    </div>
  );
}
