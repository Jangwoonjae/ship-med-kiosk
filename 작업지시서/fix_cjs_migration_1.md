# DB 마이그레이션 오류 수정 작업지시서

> 증상: `npm run db:migrate` 실행 시 "Top-level await is currently not supported with the cjs output format" 에러
> 원인: `tsx`가 CJS 모드로 실행되어 top-level await 불가
> 파일 위치: `C:\projects\ship_med\ship-med-kiosk`

---

## Step 1. package.json에 "type": "module" 추가

`package.json` 파일을 열어 아래와 같이 수정한다.

```json
{
  "name": "ship-med-kiosk",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  ...
}
```

> `"type": "module"` 한 줄 추가가 핵심. 이렇게 하면 tsx가 ESM 모드로 실행되어 top-level await 허용됨.

---

## Step 2. tsconfig.json 수정

`tsconfig.json`의 `compilerOptions`에 아래 항목을 확인하고 수정한다:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    ...
  }
}
```

> `target`을 `ES2017` → `ES2022`로 변경 (top-level await 지원)
> `module`이 `esnext`인지 확인

---

## Step 3. drizzle/migrate.ts 상단에 주석 추가

`drizzle/migrate.ts` 파일 최상단에 아래 한 줄 추가:

```ts
#!/usr/bin/env tsx
```

---

## Step 4. 마이그레이션 실행 확인

```bash
npm run db:migrate
```

성공 메시지 확인 후:

```bash
npm run db:seed
```

---

## Step 5. 서버 재시작 및 동작 확인

```bash
npm start
```

브라우저에서 확인:
- `http://localhost:3000` — 선원 키오스크 정상 동작
- `http://localhost:3000/admin` — PIN `1234` 로그인 확인
