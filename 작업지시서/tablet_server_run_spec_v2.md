# 안드로이드 태블릿 서버 실행 가이드 (수정본 v2)

> 원본 v1 대비 변경사항:
> - Step 5 이후 **빌드 단계 삭제** (PC에서 미리 빌드한 `.next` 폴더가 이미 포함됨)
> - **`start.sh` 스크립트** 사용으로 단순화
> - **DB 경로** 문제 해결 (Termux 홈에 저장)
> - 에러 대처 보강

---

## PC 준비 작업 (태블릿에 복사하기 전)

> 이 단계는 **Windows PC**에서 먼저 완료해야 합니다.

프로젝트 폴더 `C:\projects\ship_med\ship-med-kiosk` 에 다음이 모두 존재하는지 확인:

```
ship-med-kiosk/
├── .next/          ← 프로덕션 빌드 (npm start에 필수)
├── data/
│   └── ship-med.db ← 기존 재고 데이터 (없으면 태블릿에서 생성)
├── package.json
├── start.sh        ← 태블릿 시작 스크립트
└── ...
```

`.next` 폴더가 없으면 PC에서 실행:
```powershell
cd C:\projects\ship_med\ship-med-kiosk
pnpm build
```

---

## 태블릿으로 복사

파일 관리자 또는 USB 연결로 아래 폴더 전체를 복사:

```
복사 원본: C:\projects\ship_med\ship-med-kiosk\
복사 대상: 내장메모리/ship_med/

※ node_modules 폴더는 복사 제외 (태블릿에서 새로 설치)
```

복사 후 태블릿 내장메모리 구조:
```
/sdcard/ship_med/
├── .next/          ← 반드시 포함
├── data/
│   └── ship-med.db (있으면 기존 데이터 유지, 없어도 됨)
├── package.json
├── start.sh
└── ...
```

---

## Step 1. Termux 설치

태블릿 브라우저에서 접속 후 APK 다운로드:

```
https://f-droid.org/packages/com.termux/
```

> Google Play의 Termux는 구버전 — 반드시 F-Droid 버전 사용

---

## Step 2. Termux 최초 설정

```bash
pkg update -y && pkg upgrade -y
pkg install nodejs -y

# 확인 (v18 이상)
node -v
npm -v
```

---

## Step 3. 내장메모리 접근 허용

```bash
termux-setup-storage
```

팝업에서 **허용** 선택

---

## Step 4. 프로젝트 폴더 이동 및 패키지 설치

```bash
cd /sdcard/ship_med

# 의존성 설치 (better-sqlite3 컴파일 포함, 3~10분 소요)
npm install
```

### better-sqlite3 빌드 에러 시:

```bash
pkg install clang python -y
npm rebuild better-sqlite3
```

---

## Step 5. 서버 시작

```bash
sh start.sh
```

`start.sh`가 자동으로:
1. DB 파일 존재 여부 확인 → 없으면 `db:migrate + db:seed` 실행
2. DB를 Termux 홈(`~/ship-med.db`)에 저장 (파일시스템 호환성)
3. `npm start` 실행

아래 메시지가 나오면 정상:
```
[시작] 서버를 시작합니다... (http://localhost:3000)
 ▲ Next.js 16.2.4
 - Local:   http://localhost:3000
 ✓ Ready in Xms
```

---

## Step 6. 크롬 브라우저 접속

Termux는 그대로 두고 크롬에서:

```
http://localhost:3000
```

---

## 재시작 방법 (태블릿 재부팅 후)

```bash
cd /sdcard/ship_med && sh start.sh
```

---

## 부팅 시 자동 시작 (선택사항)

Termux:Boot 앱 설치 후:

```bash
mkdir -p ~/.termux/boot
cp /sdcard/ship_med/boot.sh ~/.termux/boot/start-kiosk.sh
chmod +x ~/.termux/boot/start-kiosk.sh
```

---

## 자주 발생하는 오류

### "Cannot find module '.next/...'"
→ `.next` 폴더가 복사되지 않은 것. PC에서 `pnpm build` 후 다시 복사.

### "better-sqlite3" 빌드 에러
```bash
pkg install clang python -y
npm rebuild better-sqlite3
```

### DB 관련 오류 (WAL mode error)
```bash
# DB_PATH를 Termux 홈으로 재설정
export DB_PATH=/data/data/com.termux/files/home/ship-med.db
npm run db:migrate
npm run db:seed
npm start
```

### 포트 3000 이미 사용 중
```bash
kill $(lsof -t -i:3000) 2>/dev/null
sh start.sh
```

### 재고 데이터 초기화
```bash
export DB_PATH=/data/data/com.termux/files/home/ship-med.db
npm run db:setup
```

---

## 데이터 백업

DB 파일을 USB로 복사하면 됩니다:

```bash
# Termux 홈의 DB를 내장메모리로 복사
cp ~/ship-med.db /sdcard/ship_med_backup_$(date +%Y%m%d).db
```
