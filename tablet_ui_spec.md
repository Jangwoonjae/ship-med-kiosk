# 태블릿 UI 개선 작업지시서 — 폰트 크기, 레이아웃, 정렬

> 프로젝트: `ship-med-kiosk`
> 작업 위치: `C:\projects\ship_med\ship-med-kiosk`
> 대상: 선원 키오스크 화면 전체 (app/page.tsx, components/crew/*.tsx)

---

## 기본 디자인 규칙

| 요소 | 크기 |
|------|------|
| 기본 글자 | 15px (`text-[15px]`) |
| 중타이틀 | 20px (`text-[20px]`) |
| 대타이틀 | 30px (`text-[30px]`) |
| 상자 내부 패딩 | 5px (`p-[5px]`) |
| 상자 크기 | 글자 크기에 비례하여 자동 조정 |
| 정렬 | 글자, 상자 모두 가운데 정렬 |

---

## #1 — 파란색 배경 복구

`tailwind.config.ts`의 `content` 경로 확인:

```ts
content: [
  './app/**/*.{js,ts,jsx,tsx,mdx}',
  './components/**/*.{js,ts,jsx,tsx,mdx}',
]
```

헤더에 인라인 스타일 강제 적용:

```tsx
<header style={{ backgroundColor: '#1d4ed8' }} className="...">
```

---

## #2 — 이름 입력 창 (NameInput.tsx)

### 전체 컨테이너
```tsx
<div className="flex flex-col items-center justify-center w-full">
```

### 대타이틀 ("이름을 입력하세요")
```tsx
<h1 className="text-[30px] font-bold text-center mb-4">이름을 입력하세요</h1>
```

### 입력 필드
```tsx
<input
  className="text-[15px] text-center p-[5px] border rounded w-full max-w-[400px] mx-auto"
/>
```

### 키보드 버튼 각각
```tsx
<button className="text-[15px] p-[5px] min-w-[44px] min-h-[44px] flex items-center justify-center border rounded mx-auto">
  {key}
</button>
```

### 키보드 그리드 전체
```tsx
<div className="flex flex-col items-center w-full mx-auto">
  <div className="grid grid-cols-10 gap-1 justify-items-center mx-auto">
```

### 확인 버튼
```tsx
<button className="text-[20px] font-semibold p-[5px] w-full max-w-[400px] mx-auto flex items-center justify-center rounded-lg bg-blue-500 text-white mt-4">
  확인 →
</button>
```

---

## #3 — 분류 선택 창 (CategorySelect.tsx)

### 전체 컨테이너
```tsx
<div className="flex flex-col items-center justify-center w-full">
```

### 대타이틀
```tsx
<h1 className="text-[30px] font-bold text-center mb-6">의약품 분류를 선택하세요</h1>
```

### 카테고리 카드 그리드
```tsx
<div className="grid grid-cols-3 gap-4 justify-items-center mx-auto w-full max-w-[700px]">
```

### 각 카드
```tsx
<button className="flex flex-col items-center justify-center p-[5px] min-h-[120px] w-full border-2 rounded-xl text-center">
  <span className="text-[30px] mb-2">{icon}</span>
  <span className="text-[20px] font-semibold">{label}</span>
  <span className="text-[15px] text-gray-500 hidden sm:block">{desc}</span>
</button>
```

---

## #4 — 의약품 선택 창 (MedicineGrid.tsx)

### tailwind.config.ts에 orientation variant 추가

```ts
import plugin from 'tailwindcss/plugin';

plugins: [
  plugin(({ addVariant }) => {
    addVariant('landscape', '@media (orientation: landscape)');
    addVariant('portrait', '@media (orientation: portrait)');
  }),
],
```

### 전체 컨테이너
```tsx
<div className="flex flex-col items-center w-full px-4">
```

### 중타이틀
```tsx
<h2 className="text-[20px] font-semibold text-center mb-4">{catLabel}</h2>
```

### 의약품 그리드
```tsx
<div className="grid portrait:grid-cols-2 landscape:grid-cols-4 gap-4 justify-items-center mx-auto w-full">
```

### 각 의약품 카드
```tsx
<button className="flex flex-col items-center justify-center p-[5px] border-2 rounded-xl w-full text-center min-h-[100px]">
  <span className="text-[15px] font-semibold">{name}</span>
  <span className="text-[15px] text-gray-500">{alias}</span>
  <span className="text-[15px] mt-1">{stockBadge}</span>
</button>
```

### 하단 "수량 확인" 버튼바
```tsx
<div className="fixed bottom-0 left-0 right-0 flex justify-center p-[5px] bg-white border-t">
  <button className="text-[20px] font-semibold p-[5px] px-8 bg-blue-600 text-white rounded-lg">
    수량 확인 →
  </button>
</div>
```

---

## #5 — 수량 확인 창 (ConfirmStep.tsx)

### 대타이틀
```tsx
<h1 className="text-[30px] font-bold text-center mb-4">출고 수량 확인</h1>
```

### 각 품목 행
```tsx
<div className="flex items-center justify-between p-[5px] border-b">
  <span className="text-[15px]">{name}</span>
  <div className="flex items-center gap-2">
    <button className="text-[20px] p-[5px] min-w-[44px] min-h-[44px] flex items-center justify-center border rounded">−</button>
    <span className="text-[20px] font-bold min-w-[30px] text-center">{qty}</span>
    <button className="text-[20px] p-[5px] min-w-[44px] min-h-[44px] flex items-center justify-center border rounded">+</button>
  </div>
</div>
```

### 출고 완료 버튼
```tsx
<button className="text-[20px] font-semibold p-[5px] w-full bg-blue-600 text-white rounded-lg mt-4 flex items-center justify-center">
  출고 완료
</button>
```

---

## 최종 작업

모든 수정 완료 후:

```bash
git add .
git commit -m "feat: tablet UI - font sizes 15/20/30px, center align, proportional box sizing"
git push origin master
```

---

## 검증 항목

- [ ] 기본 글자 15px 적용
- [ ] 중타이틀 20px 적용
- [ ] 대타이틀 30px 적용
- [ ] 상자 내부 패딩 5px
- [ ] 모든 글자/상자 가운데 정렬
- [ ] 태블릿 가로: 의약품 4열
- [ ] 태블릿 세로: 의약품 2열
- [ ] 파란색 배경 표시
- [ ] 터치 버튼 최소 44×44px 유지
