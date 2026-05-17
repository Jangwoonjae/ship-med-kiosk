# PIN 인증 오류 수정 작업지시서

> 프로젝트: `ship-med-kiosk`  
> 증상: 관리자 화면에서 PIN `1234` 입력 시 "올바르지 않음" 오류  
> 원인 추정: DB에 저장된 해시값과 비교 로직 불일치, 또는 초기 시드 미적용

---

## Step 1. 현재 DB 상태 확인

터미널에서 아래 명령을 실행하고 출력 결과를 확인한다.

```bash
cd ship-med-kiosk
pnpm tsx -e "
import Database from 'better-sqlite3';
const db = new Database('./data/ship-med.db');
const rows = db.prepare('SELECT * FROM settings').all();
console.log(JSON.stringify(rows, null, 2));
"
```

### 결과에 따른 분기

| 출력 결과 | 원인 | 이동 |
|-----------|------|------|
| `admin_pin` 행이 아예 없음 | 시드가 안 들어간 것 | Step 2-A |
| `admin_pin` 값이 `1234` 평문 | 평문 저장인데 bcrypt 비교 중 | Step 2-B |
| `admin_pin` 값이 `$2b$...` 해시 | 해시 저장인데 비교 오류 | Step 2-C |

---

## Step 2-A. settings 테이블에 admin_pin이 없는 경우

PIN을 bcrypt 해시로 새로 삽입한다.

```bash
pnpm tsx -e "
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
const db = new Database('./data/ship-med.db');
const hash = bcrypt.hashSync('1234', 10);
db.prepare(\"INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_pin', ?)\").run(hash);
console.log('삽입 완료:', hash);
"
```

> bcrypt 패키지가 없으면 먼저 설치:
> ```bash
> pnpm add bcryptjs
> pnpm add -D @types/bcryptjs
> ```

---

## Step 2-B. admin_pin이 평문 '1234'로 저장된 경우

### 방법 1 — 평문 비교로 통일 (간단, 빠른 수정)

`lib/auth.ts` 또는 PIN 검증 API Route 파일을 찾아 아래와 같이 수정한다.

```ts
// 수정 전 (bcrypt 비교)
const isValid = await bcrypt.compare(inputPin, storedPin);

// 수정 후 (평문 비교)
const isValid = inputPin === storedPin;
```

### 방법 2 — 해시로 통일 (권장)

DB의 평문값을 해시로 교체하고, 비교 로직은 bcrypt.compare 유지.

```bash
pnpm tsx -e "
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
const db = new Database('./data/ship-med.db');
const hash = bcrypt.hashSync('1234', 10);
db.prepare(\"UPDATE settings SET value = ? WHERE key = 'admin_pin'\").run(hash);
console.log('해시 교체 완료');
"
```

---

## Step 2-C. 해시는 올바른데 비교에서 실패하는 경우

API Route에서 PIN 검증하는 파일을 찾아 아래 사항을 점검한다.

```bash
# PIN 검증 로직이 있는 파일 위치 확인
grep -r "admin_pin\|bcrypt\|compare" app/api --include="*.ts" -l
```

찾은 파일을 열어 아래 패턴으로 수정한다.

```ts
// app/api/settings/route.ts 또는 app/api/admin/auth/route.ts

import bcrypt from 'bcryptjs';   // ← bcrypt 대신 bcryptjs 사용
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const { pin } = await req.json();
  
  const row = db.prepare("SELECT value FROM settings WHERE key = 'admin_pin'").get() as { value: string };
  
  if (!row) {
    return Response.json({ success: false, message: 'PIN 설정 없음' }, { status: 401 });
  }

  // 해시 여부 자동 판별하여 비교
  let isValid = false;
  if (row.value.startsWith('$2')) {
    // bcrypt 해시
    isValid = bcrypt.compareSync(pin, row.value);
  } else {
    // 평문
    isValid = pin === row.value;
  }

  if (!isValid) {
    return Response.json({ success: false, message: 'PIN이 올바르지 않습니다' }, { status: 401 });
  }

  return Response.json({ success: true });
}
```

---

## Step 3. 수정 후 동작 확인

```bash
# 서버 재시작
pkill -f "next" && pnpm dev
```

브라우저에서 `http://localhost:3000/admin` 접속 후 PIN `1234` 입력 확인.

---

## Step 4. 추가 — PIN 변경 기능도 같은 방식으로 통일

설정 탭의 PIN 변경 로직도 동일한 파일에서 아래와 같이 확인한다.

```ts
// PIN 저장 시 항상 bcryptjs로 해시화
const hash = bcrypt.hashSync(newPin, 10);
db.prepare("UPDATE settings SET value = ? WHERE key = 'admin_pin'").run(hash);
```

---

## 참고: bcrypt vs bcryptjs

| 패키지 | 특징 | 권장 여부 |
|--------|------|-----------|
| `bcrypt` | 네이티브 바이너리 필요 → Node 버전 바뀌면 재컴파일 필요 | 주의 |
| `bcryptjs` | 순수 JS → 어느 환경에서나 동작 | **권장** |

`bcrypt`를 쓰고 있다면 `bcryptjs`로 교체 권장:

```bash
pnpm remove bcrypt
pnpm add bcryptjs
pnpm add -D @types/bcryptjs
```

코드 내 import 경로만 `bcrypt` → `bcryptjs`로 변경하면 API는 동일.
