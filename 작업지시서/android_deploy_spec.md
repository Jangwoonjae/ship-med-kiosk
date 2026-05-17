# 선내 의약품 키오스크 — 안드로이드 APK 패키징 작업지시서

> 프로젝트: `ship-med-kiosk`  
> 목표: Next.js 웹앱을 안드로이드 APK로 패키징 → USB로 태블릿에 설치  
> 방식: **Capacitor** (웹앱 → 네이티브 Android 래퍼)

---

## 전제 조건 (개발 PC에 미리 설치 필요)

| 도구 | 버전 | 설치 방법 |
|------|------|-----------|
| Node.js | 18 이상 | https://nodejs.org |
| pnpm | 최신 | `npm i -g pnpm` |
| Java JDK | 17 | https://adoptium.net |
| Android Studio | 최신 | https://developer.android.com/studio |
| Android SDK | API 33 이상 | Android Studio → SDK Manager |

> Android Studio 설치 후 **SDK Manager**에서 아래 항목 체크 설치:
> - Android SDK Platform 33
> - Android SDK Build-Tools
> - Android Emulator
> - Android SDK Platform-Tools

---

## 아키텍처 결정: Capacitor 선택 이유

```
Next.js 웹앱
    ↓ next build → out/ (정적 파일)
Capacitor 래퍼
    ↓ npx cap sync
Android 프로젝트 (android/)
    ↓ gradle assembleRelease
ship-med-kiosk.apk
    ↓ USB 복사
안드로이드 태블릿 설치
```

> **주의**: Next.js의 API Routes (서버사이드) 는 정적 빌드에 포함되지 않는다.  
> SQLite DB 접근을 클라이언트 사이드로 전환하거나,  
> API 서버를 별도 로컬 Express 서버로 분리해야 한다.  
> → **아래 Step 2에서 Express 분리 방식으로 처리한다.**

---

## Step 1. 프로젝트 구조 재편성

현재 구조에서 백엔드(API + DB)를 분리한다.

```
ship-med-kiosk/          ← 기존 Next.js (프론트만 남김)
ship-med-server/         ← 신규 Express 로컬 API 서버
```

### 1-1. Express 서버 생성

```bash
mkdir ship-med-server && cd ship-med-server
pnpm init -y
pnpm add express better-sqlite3 bcryptjs cors
pnpm add -D typescript ts-node @types/express @types/better-sqlite3 @types/bcryptjs @types/cors @types/node
```

### 1-2. `ship-med-server/src/index.ts` 작성

기존 `ship-med-kiosk/app/api/` 하위의 모든 Route Handler를 Express 라우터로 이전한다.

```ts
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';

const app = express();
const PORT = 3001;

// DB 경로: USB 또는 내부 저장소 경로로 변경 가능
const DB_PATH = path.join(process.cwd(), 'data', 'ship-med.db');
const db = new Database(DB_PATH);

app.use(cors({ origin: '*' }));
app.use(express.json());

// 기존 API Routes를 모두 이전:
// GET  /api/medicines
// POST /api/medicines
// GET  /api/medicines/:id
// PATCH /api/medicines/:id
// GET  /api/transactions
// POST /api/transactions
// GET  /api/barcode/:code
// GET  /api/settings
// POST /api/settings

app.listen(PORT, () => console.log(`API Server running on http://localhost:${PORT}`));
```

### 1-3. 기존 `ship-med-kiosk`의 API 호출 URL 수정

모든 `fetch('/api/...')` 호출을 `fetch('http://localhost:3001/api/...')` 로 변경한다.

환경변수로 관리:

```ts
// lib/api.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
```

`.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Step 2. Next.js 정적 빌드 설정

### 2-1. `next.config.ts` 수정

```ts
const nextConfig = {
  output: 'export',      // 정적 HTML/CSS/JS 출력
  trailingSlash: true,   // Capacitor 라우팅 호환
  images: {
    unoptimized: true,   // 정적 빌드에서 next/image 최적화 비활성화
  },
};

export default nextConfig;
```

### 2-2. 정적 빌드 실행

```bash
cd ship-med-kiosk
pnpm build
# → out/ 폴더에 정적 파일 생성 확인
ls out/
```

---

## Step 3. Capacitor 설치 및 Android 프로젝트 생성

```bash
cd ship-med-kiosk

# Capacitor 설치
pnpm add @capacitor/core @capacitor/android
pnpm add -D @capacitor/cli

# Capacitor 초기화
npx cap init "선내의약품키오스크" "com.shipmed.kiosk" --web-dir out

# Android 플랫폼 추가
npx cap add android
```

### 3-1. `capacitor.config.ts` 설정

```ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shipmed.kiosk',
  appName: '선내의약품키오스크',
  webDir: 'out',
  server: {
    androidScheme: 'http',
    cleartext: true,          // localhost HTTP 허용 (API 서버 통신용)
  },
  android: {
    allowMixedContent: true,  // http://localhost:3001 접근 허용
  },
};

export default config;
```

### 3-2. 웹 빌드 → Android 동기화

```bash
pnpm build
npx cap sync android
```

---

## Step 4. Android 앱 설정 (키오스크 모드)

### 4-1. AndroidManifest.xml 수정

`android/app/src/main/AndroidManifest.xml` 에 아래 항목 추가:

```xml
<manifest ...>
  <!-- 인터넷 권한 (localhost API 통신) -->
  <uses-permission android:name="android.permission.INTERNET" />
  <!-- 화면 항상 켜짐 -->
  <uses-permission android:name="android.permission.WAKE_LOCK" />

  <application ...>
    <activity
      android:name=".MainActivity"
      android:exported="true"
      android:screenOrientation="landscape"      <!-- 가로 고정 -->
      android:keepScreenOn="true"                 <!-- 화면 꺼짐 방지 -->
      android:theme="@style/AppTheme.NoActionBar"
      android:windowSoftInputMode="adjustResize">

      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
        <!-- 부팅 시 자동 시작 (선택) -->
        <category android:name="android.intent.category.HOME" />
        <category android:name="android.intent.category.DEFAULT" />
      </intent-filter>
    </activity>
  </application>
</manifest>
```

### 4-2. 화면 가로 고정 확인

`android/app/src/main/res/values/styles.xml`:

```xml
<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.NoActionBar">
  <item name="android:windowFullscreen">true</item>
  <item name="android:windowKeepScreenOn">true</item>
</style>
```

---

## Step 5. API 서버 자동 시작 설정

안드로이드 앱 실행 시 Express 서버도 함께 시작되어야 한다.  
두 가지 방식 중 선택:

### 방식 A — Termux 사용 (권장, 설치 불필요)

태블릿에 **Termux** 앱을 함께 설치하고, 앱 실행 전 서버를 수동 시작한다.

```bash
# 태블릿 Termux에서
pkg install nodejs
node /sdcard/ship-med-server/dist/index.js &
```

### 방식 B — Capacitor Plugin으로 백그라운드 서버 내장 (고급)

`@capacitor-community/http` 또는 커스텀 Native Plugin으로 Node 서버를 앱 내에서 실행.  
구현 복잡도가 높으므로 **방식 A를 우선 적용**하고, 추후 개선한다.

---

## Step 6. APK 빌드

### 6-1. Android Studio로 빌드

```bash
# Android Studio로 프로젝트 열기
npx cap open android
```

Android Studio에서:
1. `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
2. 빌드 완료 후 경로 확인:
   `android/app/build/outputs/apk/debug/app-debug.apk`

### 6-2. 커맨드라인으로 빌드 (Android Studio 없이)

```bash
cd android
./gradlew assembleDebug

# APK 위치
ls app/build/outputs/apk/debug/app-debug.apk
```

### 6-3. APK 이름 변경

```bash
cp android/app/build/outputs/apk/debug/app-debug.apk \
   ../ship-med-kiosk-v1.0.apk
```

---

## Step 7. USB로 태블릿에 설치

### 7-1. USB에 담을 파일 목록

```
USB/
├── ship-med-kiosk-v1.0.apk      ← 키오스크 앱
├── ship-med-server/              ← Express API 서버 전체
│   ├── dist/                     ← tsc 컴파일 결과
│   ├── data/
│   │   └── ship-med.db           ← SQLite DB (재고 데이터 포함)
│   ├── package.json
│   └── .env
└── README_설치방법.txt
```

### 7-2. `README_설치방법.txt` 내용

```
[선내 의약품 키오스크 설치 방법]

1. Termux 앱 설치 (Google Play 또는 F-Droid)
2. USB의 ship-med-server 폴더를 태블릿 내부 저장소(/sdcard/)에 복사
3. Termux 실행 후 아래 명령 입력:
   pkg install nodejs
   cd /sdcard/ship-med-server
   node dist/index.js &

4. USB의 ship-med-kiosk-v1.0.apk 파일을 태블릿에 복사
5. 태블릿 파일 관리자에서 APK 파일 터치 → 설치
   (설정 → 알 수 없는 소스 허용 필요)
6. 앱 실행

[관리자 PIN 초기값]
1234
```

---

## Step 8. 빌드 자동화 스크립트 작성

`package.json`에 스크립트 추가:

```json
{
  "scripts": {
    "build:android": "pnpm build && npx cap sync android && cd android && ./gradlew assembleDebug",
    "open:android": "npx cap open android",
    "server:build": "cd ../ship-med-server && pnpm tsc"
  }
}
```

한 번에 APK 빌드:

```bash
pnpm build:android
```

---

## 전체 작업 순서 요약

```
1. ship-med-server/ 생성 — Express로 API 이전
2. ship-med-kiosk/ fetch URL → localhost:3001 변경
3. next.config.ts → output: 'export' 설정
4. pnpm build → out/ 확인
5. Capacitor 설치 및 초기화
6. npx cap add android
7. capacitor.config.ts 설정 (cleartext, landscape)
8. AndroidManifest.xml 수정 (가로 고정, 화면 켜짐 유지)
9. ./gradlew assembleDebug → APK 생성
10. USB에 APK + server 폴더 + DB 파일 담기
11. 태블릿에서 Termux + APK 설치
```

---

## 주의사항

- `data/ship-med.db` 파일에 현재 재고 데이터가 들어있으므로 반드시 포함할 것
- 태블릿 안드로이드 버전 **8.0 이상** 필요 (Capacitor 최소 요구사항)
- APK 설치 시 태블릿 설정에서 **"알 수 없는 소스 허용"** 활성화 필요
  - 설정 → 보안 → 알 수 없는 소스 (제조사마다 메뉴 위치 다름)
- Termux는 Google Play보다 **F-Droid**에서 설치하는 것이 최신 버전 유지에 유리
- 바코드 USB 리더기는 태블릿의 **USB OTG** 지원 여부 확인 필요
