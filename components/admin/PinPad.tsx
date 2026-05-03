'use client';
import { useState } from 'react';
import TouchButton from '../ui/TouchButton';

interface PinPadProps {
  onSuccess: () => void;
}

export default function PinPad({ onSuccess }: PinPadProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleKey = (key: string) => {
    if (pin.length < 4) setPin(p => p + key);
  };

  const handleClear = () => { setPin(''); setError(''); };

  const handleSubmit = async () => {
    if (pin.length !== 4) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.ok) {
        onSuccess();
      } else {
        setError('PIN이 올바르지 않습니다.');
        setPin('');
      }
    } catch {
      setError('인증 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 gap-6">
      <h1 className="text-white text-3xl font-bold">관리자 인증</h1>
      <p className="text-gray-400">PIN 4자리를 입력하세요</p>

      <div className="flex gap-4 my-2">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${i < pin.length ? 'bg-blue-500 border-blue-500' : 'border-gray-400'}`}
          >
            {i < pin.length && <span className="text-white text-2xl">●</span>}
          </div>
        ))}
      </div>

      {error && <p className="text-red-400">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        {['1','2','3','4','5','6','7','8','9'].map(k => (
          <button
            key={k}
            onClick={() => handleKey(k)}
            className="
              w-20 h-20 rounded-2xl bg-gray-700 text-white
              text-3xl font-bold
              hover:bg-gray-600 active:bg-gray-500 active:scale-95
              transition-all duration-100 touch-manipulation
            "
          >
            {k}
          </button>
        ))}
        <button
          onClick={handleClear}
          className="w-20 h-20 rounded-2xl bg-gray-700 text-gray-300 text-lg font-medium hover:bg-gray-600 active:scale-95 transition-all duration-100 touch-manipulation"
        >취소</button>
        <button
          onClick={() => handleKey('0')}
          className="w-20 h-20 rounded-2xl bg-gray-700 text-white text-3xl font-bold hover:bg-gray-600 active:scale-95 transition-all duration-100 touch-manipulation"
        >0</button>
        <button
          onClick={handleSubmit}
          disabled={pin.length !== 4 || loading}
          className="w-20 h-20 rounded-2xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-500 active:scale-95 disabled:opacity-40 transition-all duration-100 touch-manipulation"
        >확인</button>
      </div>
    </div>
  );
}
