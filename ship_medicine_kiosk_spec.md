# 선내 의약품 재고관리 키오스크 — Claude Code 작업지시서

> 작성일: 2026-05-02  
> 대상: Claude Code (CLI AI)  
> 프로젝트명: `ship-med-kiosk`

---

## 1. 프로젝트 개요

선박 내 의약품을 관리하는 태블릿 키오스크 웹앱.  
**선원**은 이름만 입력하고 필요한 의약품을 터치로 출고 기록하며,  
**관리자**는 PIN 인증 후 입고 처리·재고 관리·이력 조회를 수행한다.

---

## 2. 기술 스택

| 항목 | 선택 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS |
| DB | SQLite (`better-sqlite3`) — 로컬 파일 저장 |
| ORM | Drizzle ORM |
| 바코드 입력 | USB HID 바코드 리더기 (키보드 이벤트 처리) |
| 의약품 정보 | 의약품관리종합정보포털 API (`https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail`) |
| 배포 | `next start` — 태블릿 로컬 브라우저 (크롬 키오스크 모드) |
| 패키지 매니저 | pnpm |

---

## 3. 화면 구성 (2개 화면)

### 3-1. 선원 키오스크 화면 (기본 화면, `/`)

**목적**: 선원이 직접 터치해 의약품 출고를 기록한다.  
인증 없음. 이름 입력만 요구.

#### 흐름 (4단계 스텝)

```
[Step 1] 이름 입력
    → 대형 터치 키패드 (한글/영문 전환 가능)
    → "확인" 버튼

[Step 2] 분류 선택
    → 3개 대형 카드: 내복약 / 주사약 / 외용약
    → 각 카드에 해당 품목 수 표시

[Step 3] 의약품 선택
    → 2열 그리드, 카드당 높이 최소 80px
    → 성분명(대) + 한글명(소) + 재고 상태 뱃지
    → 다중 선택 가능 (토글)
    → 하단 고정 "수량 확인 →" 버튼

[Step 4] 수량 확인 및 출고 완료
    → 선택 품목별 − / + 수량 조절 (버튼 크기 최소 48px)
    → "출고 완료" 버튼 → DB 기록 → 완료 화면
    → 5초 후 자동으로 Step 1로 초기화
```

#### UI 요구사항

- 전체 가로(landscape) 고정: `viewport` meta `width=device-width, initial-scale=1` + CSS `touch-action: manipulation`
- 최소 터치 타겟: **48×48px** (WCAG 기준)
- 폰트 크기: 본문 16px 이상, 버튼 레이블 18px 이상
- 재고 상태 뱃지: 정상(초록) / 경고(주황, 기준 80% 미만) / 긴급(빨강, 기준 50% 미만)
- 재고 0인 품목: 카드 비활성화 (선택 불가, 흐리게 표시)

---

### 3-2. 관리자 화면 (`/admin`)

**목적**: 재고 관리자가 입고 처리, 재고 현황, 이력 조회를 수행한다.  
PIN 4자리 인증 필요 (기본값 `1234`, 설정에서 변경 가능).

#### 탭 구성

**[탭 1] 재고 현황**
- 상단 요약 카드: 전체 / 정상 / 경고 / 긴급 품목 수
- 검색 (성분명·한글명) + 분류 필터 + 상태 필터
- 테이블: 성분명 / 분류 / 현재고 / 기준수량 / 상태 / 직접±조정
- 행 클릭 → 상세 슬라이드오버 (품목 정보, 바코드, 이력 미리보기)

**[탭 2] 입고 처리**
- 바코드 입력 방식 (우선순위 순):
  1. USB 바코드 리더기 → 자동 인식 (포커스 트랩)
  2. 화면 내 수동 입력 필드 → 바코드 번호 직접 타이핑
  3. 성분명/한글명으로 검색 후 선택
- 바코드 조회 순서:
  1. 로컬 DB에 등록된 바코드인지 확인
  2. 없으면 **의약품관리종합정보포털 API** 호출 → 품명·성분 매칭
  3. 매칭 성공 시 팝업으로 품목 확인 후 입고 수량·사유 입력
  4. 미등록 바코드 → "신규 품목 등록" 흐름으로 연결
- 입고 확정 시 DB 저장 + 이력 기록

**[탭 3] 입출고 이력**
- 날짜 범위 필터 + 품목 검색
- 유형별 필터: 입고 / 출고 / 조정
- 각 행: 시각 / 유형 / 품목명 / 수량 / 사유 / 처리자(선원명 or "관리자")
- CSV 내보내기 버튼

**[탭 4] 설정**
- 관리자 PIN 변경
- 선박 정보 입력 (선박명, 항로 구분: 국제선/국내선)
- 기준수량 일괄 편집 (국제선 ↔ 국내선 전환 시 자동 재계산)

---

## 4. 데이터베이스 스키마 (SQLite / Drizzle ORM)

### `medicines` 테이블

```ts
{
  id:          integer (PK, autoincrement)
  category:    text      // '주사약' | '내용약' | '외용약'
  name_en:     text      // 성분명 영문
  name_ko:     text      // 성분명 한글
  brand_name:  text      // 상품명·별칭
  form:        text      // 제형 (vial, amp, tab, cap, cream ...)
  strength:    text      // 함량
  indication:  text      // 효능효과
  std_intl:    integer   // 국제선 기준수량
  std_dom:     integer   // 국내선 기준수량
  current_qty: integer   // 현재 재고
  barcode:     text      // 의약품 바코드 번호 (nullable)
  created_at:  text      // ISO8601
  updated_at:  text
}
```

### `transactions` 테이블

```ts
{
  id:          integer (PK, autoincrement)
  medicine_id: integer   // FK → medicines.id
  type:        text      // 'in' | 'out' | 'adj'
  quantity:    integer   // 입고(+) / 출고(-) 절댓값
  actor:       text      // 선원 이름 or '관리자'
  note:        text      // 사유·메모
  created_at:  text      // ISO8601
}
```

### `settings` 테이블

```ts
{
  key:   text (PK)
  value: text
}
// 초기값: admin_pin='1234', ship_name='', route_type='international'
```

---

## 5. 바코드 처리 상세 명세

### 5-1. USB 바코드 리더기 연동

바코드 리더기는 키보드 HID로 동작한다 (별도 드라이버 불필요).  
입력 감지 로직:

```
1. 관리자 입고 화면 진입 시 숨김 <input id="barcode-trap"> 에 자동 focus
2. keydown 이벤트 누적 → Enter 키 수신 시 스캔 완료로 판단
3. 누적 문자열을 바코드 번호로 처리
4. 300ms 타임아웃: 그 안에 Enter 없으면 버퍼 초기화
5. 수동 입력과 같은 조회 함수로 연결
```

### 5-2. 의약품관리종합정보포털 API 연동

**API 엔드포인트**: `https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail`  
**공공데이터포털 API**: `https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService04/getDrugPrdtPrmsnDtlInq03`

Next.js API Route (`/api/barcode/[code]`)에서 서버사이드로 호출:

```
GET /api/barcode/[barcode]
→ 로컬 DB 조회
→ 없으면 공공데이터포털 API 호출 (serviceKey 환경변수)
→ 응답: { matched: boolean, medicine?: {...}, rawData?: {...} }
```

환경변수 (`.env.local`):
```
DRUG_API_KEY=발급받은_공공데이터포털_서비스키
ADMIN_PIN_DEFAULT=1234
```

> **주의**: API 키는 식품의약품안전처 공공데이터포털(data.go.kr)에서 발급.  
> 오프라인 환경 대비: API 호출 실패 시 "바코드 미확인 — 수동 입력" 폴백 제공.

---

## 6. 초기 데이터 시드

별표 1 기준 62개 품목을 `prisma/seed.ts` (또는 `drizzle/seed.ts`)로 초기 삽입.  
아래는 일부 예시:

```ts
const seedData = [
  { category:'주사약', name_en:'Lidocaine 1%', name_ko:'리도카인', brand_name:'휴온스리도카인염산염수화물주1%', form:'vial', strength:'0.2g/20mL', indication:'local anesthesia 국소마취', std_intl:5, std_dom:0, current_qty:5 },
  { category:'주사약', name_en:'Dexamethasone', name_ko:'덱사메타손', brand_name:'제일제약덱사메타손주사액', form:'amp', strength:'5mg/1mL', indication:'Severe asthma, anaphylaxis', std_intl:5, std_dom:0, current_qty:5 },
  { category:'내용약', name_en:'Dimenhydrinate', name_ko:'디메칠하이드리네이트', brand_name:'보나링에이정', form:'tab', strength:'50mg', indication:'vomiting, sea-sickness', std_intl:90, std_dom:30, current_qty:90 },
  // ... 전체 62품목
];
```

전체 62품목 데이터는 첨부된 `별표1_선내의약품.pdf` 내용을 기준으로 작성할 것.

---

## 7. 프로젝트 디렉터리 구조

```
ship-med-kiosk/
├── app/
│   ├── page.tsx                  # 선원 키오스크 (루트)
│   ├── admin/
│   │   └── page.tsx              # 관리자 화면
│   ├── api/
│   │   ├── medicines/
│   │   │   ├── route.ts          # GET 목록, POST 신규 등록
│   │   │   └── [id]/route.ts     # GET 상세, PATCH 수량, DELETE
│   │   ├── transactions/
│   │   │   └── route.ts          # GET 이력, POST 출고·입고·조정
│   │   ├── barcode/
│   │   │   └── [code]/route.ts   # 바코드 조회 (로컬 + 외부 API)
│   │   └── settings/
│   │       └── route.ts          # GET/PATCH 설정
│   └── layout.tsx
├── components/
│   ├── crew/
│   │   ├── NameInput.tsx         # 한글 키패드 포함 이름 입력
│   │   ├── CategorySelect.tsx
│   │   ├── MedicineGrid.tsx
│   │   └── ConfirmStep.tsx
│   ├── admin/
│   │   ├── PinPad.tsx
│   │   ├── StockTable.tsx
│   │   ├── ReceivePanel.tsx      # 입고 처리 (바코드 + 수동)
│   │   ├── TransactionLog.tsx
│   │   └── Settings.tsx
│   └── ui/
│       ├── TouchButton.tsx       # 최소 48px 터치 버튼
│       ├── StatusBadge.tsx
│       └── BarcodeInput.tsx      # 리더기 포커스 트랩
├── lib/
│   ├── db.ts                     # better-sqlite3 + Drizzle 초기화
│   ├── schema.ts                 # Drizzle 스키마 정의
│   ├── medicines.ts              # DB 쿼리 함수
│   ├── transactions.ts
│   └── barcode.ts                # 외부 API 호출 로직
├── drizzle/
│   ├── migrate.ts
│   └── seed.ts                   # 62품목 초기 데이터
├── public/
├── .env.local.example
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 8. 구현 순서 (Claude Code 실행 순서)

Claude Code는 아래 순서대로 단계별로 구현한다.  
각 단계 완료 후 `pnpm dev`로 동작 확인.

```
Step 1. 프로젝트 초기화
  - pnpm create next-app ship-med-kiosk --typescript --tailwind --app
  - pnpm add better-sqlite3 drizzle-orm
  - pnpm add -D drizzle-kit @types/better-sqlite3

Step 2. DB 스키마 & 마이그레이션
  - lib/schema.ts 작성
  - drizzle/migrate.ts 실행
  - drizzle/seed.ts 작성 (62품목 전체)

Step 3. API Routes 구현
  - /api/medicines (CRUD)
  - /api/transactions (POST 출고·입고·조정, GET 이력)
  - /api/barcode/[code] (로컬 조회 → 외부 API 폴백)
  - /api/settings

Step 4. 선원 키오스크 화면 (`/`)
  - 4단계 스텝 컴포넌트 구현
  - 한글 이름 입력 키패드
  - 의약품 카드 그리드 (터치 최적화)
  - 출고 완료 → 5초 자동 초기화

Step 5. 관리자 화면 (`/admin`)
  - PIN 패드 (4자리)
  - 재고 현황 탭
  - 입고 처리 탭 (바코드 리더기 + 수동)
  - 이력 조회 + CSV 내보내기
  - 설정 탭

Step 6. 바코드 리더기 연동
  - BarcodeInput 컴포넌트 (포커스 트랩, 버퍼 로직)
  - 외부 API 연동 테스트

Step 7. 태블릿 UX 최적화
  - 가로 고정 레이아웃 (landscape lock CSS)
  - 터치 타겟 전수 검토 (min 48px)
  - 크롬 키오스크 모드 확인
```

---

## 9. 키오스크 모드 실행 방법 (최종 배포)

태블릿에서 아래 명령으로 크롬 키오스크 모드 실행:

```bash
# 빌드 & 시작
pnpm build
pnpm start

# 크롬 키오스크 모드 (별도 터미널)
google-chrome --kiosk --app=http://localhost:3000 \
  --disable-pinch --overscroll-historynavigation=0
```

Android 태블릿의 경우 Fully Kiosk Browser 앱 사용 권장.

---

## 10. 비기능 요구사항

- **오프라인 우선**: 외부 API(바코드 조회) 실패 시 앱 전체가 멈추면 안 됨. 폴백 처리 필수.
- **데이터 백업**: SQLite 파일(`data/ship-med.db`)을 USB 복사로 백업 가능하도록 경로 노출.
- **보안**: 관리자 PIN은 bcrypt 해시로 DB 저장 (평문 저장 금지).
- **반응성**: 터치 후 200ms 이내 시각 피드백 (버튼 상태 변경).
- **에러 처리**: API 에러, DB 에러 모두 사용자 친화적 한국어 메시지 표시.
- **로그**: 모든 트랜잭션은 `transactions` 테이블에 영구 보존 (삭제 기능 없음).

---

## 11. 참고 문서

- 의약품 기준: `별표1_선내의약품.pdf` (첨부, 62품목)
- 의약품안전나라 API 문서: `https://nedrug.mfds.go.kr/pbp/CCBBB01`
- 공공데이터포털 의약품 API: `https://www.data.go.kr` 검색어: "의약품 제품 허가"
- Drizzle ORM 공식 문서: `https://orm.drizzle.team`
- Next.js App Router: `https://nextjs.org/docs/app`
