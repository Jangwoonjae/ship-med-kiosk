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

  const handleTouchKey = (e: React.TouchEvent, key: string) => {
    e.preventDefault();
    handleKey(key);
  };

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
    <div style={{
      backgroundColor: '#1d4ed8',
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '32px',
    }}>
      <h1 style={{ color: 'white', fontWeight: 'bold', fontSize: '30px', margin: 0 }}>관리자 인증</h1>
      <p style={{ color: '#bfdbfe', fontSize: '15px', margin: 0 }}>PIN 4자리를 입력하세요</p>

      <div style={{ display: 'flex', gap: '16px' }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              border: '2px solid white',
              backgroundColor: i < pin.length ? 'white' : 'transparent',
            }}
          />
        ))}
      </div>

      {error && <p style={{ color: '#fca5a5', fontSize: '15px', margin: 0 }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 88px)', gap: '12px' }}>
        {['1','2','3','4','5','6','7','8','9'].map(k => (
          <button
            key={k}
            onClick={() => handleKey(k)}
            onTouchEnd={(e) => handleTouchKey(e, k)}
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
          onTouchEnd={(e) => { e.preventDefault(); handleClear(); }}
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
          onTouchEnd={(e) => handleTouchKey(e, '0')}
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
          onTouchEnd={(e) => { e.preventDefault(); handleSubmit(); }}
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
