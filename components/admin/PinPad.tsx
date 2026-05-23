'use client';
import { useState } from 'react';

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
      setError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#1d4ed8' }} className="flex flex-col items-center justify-center min-h-screen gap-8">
      <h1 className="text-white font-bold" style={{ fontSize: '30px' }}>관리자 인증</h1>
      <p className="text-blue-200" style={{ fontSize: '15px' }}>PIN 4자리를 입력하세요</p>

      <div className="flex gap-4 my-2">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            style={{ width: '56px', height: '56px' }}
            className={`rounded-full border-2 flex items-center justify-center ${
              i < pin.length ? 'bg-white border-white' : 'border-white border-opacity-60'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-red-300" style={{ fontSize: '15px' }}>{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        {['1','2','3','4','5','6','7','8','9'].map(k => (
          <button
            key={k}
            onClick={() => handleKey(k)}
            style={{
              width: '88px',
              height: '88px',
              fontSize: '28px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              borderRadius: '16px',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {k}
          </button>
        ))}
        <button
          onClick={handleClear}
          style={{
            width: '88px',
            height: '88px',
            fontSize: '15px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            borderRadius: '16px',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer',
          }}
        >취소</button>
        <button
          onClick={() => handleKey('0')}
          style={{
            width: '88px',
            height: '88px',
            fontSize: '28px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            borderRadius: '16px',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer',
          }}
        >0</button>
        <button
          onClick={handleSubmit}
          disabled={pin.length !== 4 || loading}
          style={{
            width: '88px',
            height: '88px',
            fontSize: '15px',
            backgroundColor: pin.length === 4 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
            color: pin.length === 4 ? '#1d4ed8' : 'white',
            borderRadius: '16px',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer',
          }}
        >확인</button>
      </div>
    </div>
  );
}
