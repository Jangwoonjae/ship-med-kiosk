'use client';
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface BarcodeCameraProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeCamera({ onScan, onClose }: BarcodeCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromVideoDevice(null, videoRef.current!, (result, err) => {
        if (result) {
          onScan(result.getText());
          onClose();
        }
        if (err && !(err instanceof NotFoundException)) {
          // NotFoundException은 매 프레임마다 발생하는 정상 상태
        }
      })
      .catch(() => {
        setError('카메라 접근 권한이 없거나 사용할 수 없습니다.');
      });

    return () => {
      reader.reset();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* 헤더 */}
      <div className="flex justify-between items-center px-4 py-3 bg-black/80">
        <span className="text-white font-semibold text-lg">바코드 스캔</span>
        <button
          onClick={onClose}
          className="text-white text-3xl leading-none w-10 h-10 flex items-center justify-center"
        >
          ✕
        </button>
      </div>

      {/* 카메라 뷰 */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
        />

        {/* 가이드 오버레이 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* 어두운 배경 마스크 */}
          <div className="absolute inset-0 bg-black/40" />

          {/* 스캔 영역 */}
          <div className="relative w-72 h-40 sm:w-96 sm:h-52">
            {/* 모서리 장식 */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br" />

            {/* 빨간 스캔 라인 */}
            <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_6px_2px_rgba(239,68,68,0.7)]" />
          </div>
        </div>

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 mx-4 text-center space-y-3">
              <p className="text-gray-800">{error}</p>
              <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                닫기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 안내 문구 */}
      <div className="px-4 py-3 bg-black/80 text-center">
        <p className="text-white/70 text-sm">바코드를 가이드 안에 맞춰주세요</p>
      </div>
    </div>
  );
}
