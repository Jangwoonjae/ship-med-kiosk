'use client';
import { useState, useEffect } from 'react';
import PinPad from '@/components/admin/PinPad';
import StockTable from '@/components/admin/StockTable';
import ReceivePanel from '@/components/admin/ReceivePanel';
import TransactionLog from '@/components/admin/TransactionLog';
import Settings from '@/components/admin/Settings';

type Tab = 'stock' | 'receive' | 'history' | 'settings';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>('stock');
  const [routeType, setRouteType] = useState('international');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (!authed) return <PinPad onSuccess={() => setAuthed(true)} />;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'stock', label: '재고 현황' },
    { key: 'receive', label: '입고 처리' },
    { key: 'history', label: '입출고 이력' },
    { key: 'settings', label: '설정' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" suppressHydrationWarning>
      <header style={{ backgroundColor: '#1e3a5f' }} className="bg-gray-900 text-white px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">선내 의약품 관리 — 관리자</h1>
          <p className="text-gray-400 text-sm">{routeType === 'international' ? '국제선' : '국내선'} 모드</p>
        </div>
        <div className="flex gap-3">
          <a href="/" className="text-gray-400 text-base hover:text-white">← 선원</a>
          <button onClick={() => setAuthed(false)} className="text-gray-400 text-base hover:text-red-400">로그아웃</button>
        </div>
      </header>

      <nav className="bg-white border-b px-2 flex gap-0 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`
              px-6 py-4 text-xl font-medium border-b-2 -mb-px transition-colors whitespace-nowrap
              ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}
            `}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 p-4 overflow-y-auto">
        {tab === 'stock' && <StockTable key={refreshKey} routeType={routeType} />}
        {tab === 'receive' && <ReceivePanel onComplete={() => setRefreshKey(k => k + 1)} />}
        {tab === 'history' && <TransactionLog />}
        {tab === 'settings' && <Settings onRouteTypeChange={rt => setRouteType(rt)} />}
      </main>
    </div>
  );
}
