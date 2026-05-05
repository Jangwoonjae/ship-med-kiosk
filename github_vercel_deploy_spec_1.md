# 선내 의약품 키오스크 — GitHub + Vercel + Turso 클라우드 배포 작업지시서

> 목표: 윈도우/안드로이드 구분 없이 브라우저 URL 하나로 접속  
> 방식: GitHub → Vercel (Next.js 호스팅) + Turso (SQLite 클라우드 DB)  
> 비용: 모두 무료 플랜으로 가능

---

## 왜 이 방식인가

| 기존 문제 | 해결 |
|-----------|------|
| `better-sqlite3` 윈도우 바이너리 → 안드로이드 실행 불가 | Turso(libsql) 클라우드 DB로 교체 → OS 무관 |
| `npm start` 전에 `npm run build` 필요 | Vercel이 자동 빌드 |
| Termux + 수동 서버 실행 필요 | URL 하나로 접속 끝 |
| `package.json`에 `@libsql/client` 이미 설치됨 | DB 전환 작업량 최소화 |

---

## 사전 준비 (Claude Code 작업 전 사람이 직접)

아래 3개 계정을 미리 만들어 둔다. 모두 무료.

1. **GitHub** — https://github.com/signup
2. **Vercel** — https://vercel.com/signup (GitHub 계정으로 가입)
3. **Turso** — https://turso.tech (GitHub 계정으로 가입)

---

## Step 1. GitHub 저장소 생성 및 업로드

### 1-1. GitHub에서 저장소 생성 (사람이 직접)

- https://github.com/new 접속
- Repository name: `ship-med-kiosk`
- **Private** 선택 (선박 운항 정보 보호)
- README 체크 해제
- "Create repository" 클릭

### 1-2. 로컬에서 GitHub에 업로드 (Claude Code 실행)

```bash
cd ship-med-kiosk

# git 초기화 (이미 되어 있으면 skip)
git init

# 현재 .gitignore 확인 — 아래 항목이 반드시 포함되어야 함
# .env* / node_modules / .next / data/*.db / *.tsbuildinfo
cat .gitignore

# 전체 파일 스테이징
git add .

# 민감 파일이 스테이징되었는지 반드시 확인
git status | grep -E "\.env|\.db|secret|password|api.key"
# 위 명령 결과가 아무것도 없어야 함 — 있으면 즉시 중단

# 커밋
git commit -m "feat: initial ship-med-kiosk"

# GitHub 원격 저장소 연결 (URL은 본인 GitHub ID로 변경)
git remote add origin https://github.com/Jangwoonjae/ship-med-kiosk.git

# 업로드
git push -u origin main
```

---

## Step 2. Turso 클라우드 DB 설정 (Claude Code 실행)

### 2-1. Turso CLI 설치 및 로그인

```bash
# Turso CLI 설치
curl -sSfL https://get.tur.so/install.sh | bash

# 로그인
turso auth login
```

### 2-2. DB 생성 및 기존 데이터 마이그레이션

```bash
# 클라우드 DB 생성
turso db create ship-med-kiosk

# 접속 URL 확인 (나중에 환경변수에 사용)
turso db show ship-med-kiosk --url

# 인증 토큰 발급
turso db tokens create ship-med-kiosk
```

출력된 URL과 토큰을 기록해 둔다.

### 2-3. 기존 SQLite 데이터를 Turso로 이전

```bash
# 로컬 DB → Turso로 데이터 복사
turso db shell ship-med-kiosk < data/ship-med.db
```

또는 마이그레이션 + 시드를 클라우드에서 새로 실행 (아래 Step 3 완료 후):

```bash
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run db:migrate
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run db:seed
```

---

## Step 3. DB 클라이언트 코드 전환 (Claude Code 실행)

`better-sqlite3` → `@libsql/client` (Turso) 로 전환한다.  
`package.json`에 `@libsql/client`가 이미 설치되어 있으므로 코드만 수정.

### 3-1. `lib/db.ts` 수정

```ts
// 수정 전 (better-sqlite3)
import Database from 'better-sqlite3';
const db = new Database(process.env.DB_PATH ?? './data/ship-med.db');

// 수정 후 (libsql/Turso — 로컬/클라우드 자동 전환)
import { createClient } from '@libsql/client';

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? 'file:./data/ship-med.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});
```

> `TURSO_DATABASE_URL`이 없으면 로컬 파일로 폴백 → 로컬 개발 환경 그대로 유지

### 3-2. 쿼리 문법 변환

libsql은 비동기 방식이므로 기존 동기 쿼리를 async/await로 전환한다.

```ts
// 수정 전 (동기)
const rows = db.prepare('SELECT * FROM medicines').all();

// 수정 후 (비동기)
const result = await db.execute('SELECT * FROM medicines');
const rows = result.rows;
```

모든 API Route 파일의 DB 쿼리를 위 패턴으로 일괄 변환할 것.

### 3-3. Drizzle ORM을 libsql 어댑터로 전환

`drizzle/migrate.ts` 및 `lib/schema.ts`:

```ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? 'file:./data/ship-med.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client);
```

---

## Step 4. 환경변수 파일 정리 (Claude Code 실행)

### 4-1. `.env.local` 수정 (로컬 개발용 — GitHub에 올라가지 않음)

```env
# 공공데이터포털 의약품 API 키
DRUG_API_KEY=발급받은_키

# 관리자 PIN 기본값
ADMIN_PIN_DEFAULT=1234

# Turso 클라우드 DB (로컬 개발 시 비워두면 file: 폴백 사용)
TURSO_DATABASE_URL=libsql://ship-med-kiosk-[계정].turso.io
TURSO_AUTH_TOKEN=발급받은_토큰
```

### 4-2. `.env.local.example` 업데이트 (GitHub에 올라감 — 값은 비움)

```env
# 공공데이터포털 의약품 API 키 (data.go.kr에서 발급)
DRUG_API_KEY=

# 관리자 PIN 초기값
ADMIN_PIN_DEFAULT=1234

# Turso 클라우드 DB 접속 정보 (turso.tech에서 발급)
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=
```

### 4-3. `.gitignore` 최종 확인

아래 항목이 모두 포함되어 있는지 확인:

```gitignore
.env*
data/
*.db
*.tsbuildinfo
```

---

## Step 5. Vercel 배포 (사람이 직접 + Claude Code)

### 5-1. Vercel에서 프로젝트 연결 (사람이 직접)

1. https://vercel.com/new 접속
2. "Import Git Repository" → `ship-med-kiosk` 선택
3. Framework Preset: **Next.js** 자동 감지
4. "Deploy" 클릭 (첫 배포, 환경변수 없이)

### 5-2. Vercel 환경변수 설정 (사람이 직접)

Vercel 대시보드 → 프로젝트 → Settings → Environment Variables:

| 이름 | 값 | 환경 |
|------|-----|------|
| `TURSO_DATABASE_URL` | `libsql://ship-med-kiosk-....turso.io` | Production, Preview |
| `TURSO_AUTH_TOKEN` | 발급받은 토큰 | Production, Preview |
| `DRUG_API_KEY` | 발급받은 키 | Production, Preview |
| `ADMIN_PIN_DEFAULT` | `1234` | Production, Preview |

입력 완료 후 "Redeploy" 클릭.

### 5-3. 배포 URL 확인

배포 완료 후 Vercel이 URL을 제공:

```
https://ship-med-kiosk.vercel.app
```

이 URL을 안드로이드 태블릿 크롬에서 열면 바로 실행됨.

---

## Step 6. 최종 검증 (Claude Code 실행)

```bash
# 로컬에서 클라우드 DB 연결 테스트
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run dev

# 브라우저에서 확인
# http://localhost:3000 — 선원 키오스크
# http://localhost:3000/admin — 관리자 화면 (PIN: 1234)
```

---

## 완료 후 접속 방법

| 기기 | 방법 |
|------|------|
| 윈도우 PC | 크롬에서 `https://ship-med-kiosk.vercel.app` |
| 안드로이드 태블릿 | 크롬에서 `https://ship-med-kiosk.vercel.app` |
| 로컬 개발 | `npm run dev` → `http://localhost:3000` |

Termux, USB 복사, `npm start` 모두 불필요.

---

## 보안 체크리스트

- [ ] GitHub 저장소가 **Private**인지 확인
- [ ] `git status`에서 `.env.local` 파일이 없는지 확인
- [ ] `git status`에서 `data/ship-med.db` 파일이 없는지 확인
- [ ] Vercel 환경변수에 실제 값이 입력되었는지 확인
- [ ] 배포 후 관리자 PIN 변경 권장 (설정 탭에서)
