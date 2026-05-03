'use client';
import { useEffect, useRef, useState } from 'react';

interface BarcodeInputProps {
  onScan: (code: string) => void;
  disabled?: boolean;
}

export default function BarcodeInput({ onScan, disabled }: BarcodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = bufferRef.current.trim();
      bufferRef.current = '';
      if (timerRef.current) clearTimeout(timerRef.current);
      if (code) onScan(code);
      e.currentTarget.value = '';
      return;
    }
    bufferRef.current += e.key.length === 1 ? e.key : '';
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      bufferRef.current = '';
    }, 300);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      aria-label="바코드 스캔 입력"
      className="absolute opacity-0 w-0 h-0 pointer-events-none"
      onKeyDown={handleKeyDown}
      onChange={() => {}}
      disabled={disabled}
      tabIndex={-1}
    />
  );
}
