# 안드로이드 태블릿 서버 실행 작업지시서

> 증상: 크롬에서 http://localhost:3000 → "연결 거부"  
> 원인: 태블릿에 파일만 복사됨. Node.js 서버가 실행되지 않은 상태  
> 파일 위치: 내장메모리/ship_med

---

## Step 1. Termux 설치

태블릿 브라우저에서 아래 주소로 접속하여 Termux APK 다운로드 후 설치:

```
https://f-droid.org/packages/com.termux/
```

> Google Play의 Termux는 구버전이므로 반드시 F-Droid 버전 사용

설치 시 "알 수 없는 소스 허용" 팝업 → 허용

---

## Step 2. Termux 최초 설정

Termux 앱 실행 후 아래 명령어를 순서대로 입력:

```bash
# 패키지 업데이트
pkg update -y && pkg upgrade -y

# Node.js 설치
pkg install nodejs -y

# 설치 확인
node -v
npm -v
```

`v18.x.x` 이상이 출력되면 정상

---

## Step 3. 내장메모리 접근 권한 허용

```bash
termux-setup-storage
```

팝업에서 **"허용"** 선택  
이후 `/sdcard` 경로로 내장메모리 접근 가능

---

## Step 4. 프로젝트 폴더로 이동

```bash
cd /sdcard/ship_med
ls
```

`package.json` 파일이 보이면 정상.  
보이지 않으면 폴더 구조 확인:

```bash
ls /sdcard/
# ship_med 폴더 위치 확인 후 cd 명령으로 이동
```

---

## Step 5. 패키지 설치

```bash
# npm으로 의존성 설치 (pnpm이 없으므로 npm 사용)
npm install
```

> 시간이 2~5분 걸릴 수 있음. 완료까지 대기

에러 없이 완료되면 다음 단계 진행

---

## Step 6. DB 파일 확인

```bash
ls data/
```

`ship-med.db` 파일이 있으면 정상 (기존 재고 데이터 유지).  
없으면 초기화:

```bash
npm run db:migrate
npm run db:seed
```

---

## Step 7. 서버 실행

```bash
npm start
```

아래 메시지가 뜨면 정상:

```
ready - started server on http://localhost:3000
```

또는 Express 서버라면:

```
API Server running on http://localhost:3001
```

---

## Step 8. 크롬 브라우저에서 접속

Termux는 그대로 두고 (닫으면 서버 종료됨)  
크롬 브라우저 주소창에 입력:

```
http://localhost:3000
```

키오스크 화면이 나오면 완료 ✓

---

## 서버가 실행 중인지 확인하는 방법

```bash
# Termux에서 실행 중인 Node 프로세스 확인
ps aux | grep node
```

---

## 자주 발생하는 오류 대처

### "npm install" 중 에러
```bash
# 빌드 도구 설치 후 재시도
pkg install build-essential python -y
npm install
```

### "better-sqlite3" 빌드 에러
```bash
pkg install clang -y
npm rebuild better-sqlite3
```

### 포트 3000 이미 사용 중
```bash
# 기존 프로세스 종료
kill $(lsof -t -i:3000)
npm start
```

---

## 태블릿 재시작 후 서버 다시 켜는 방법

매번 Termux를 열어 아래 명령만 입력하면 됨:

```bash
cd /sdcard/ship_med && npm start
```

> 이 명령을 Termux 바로가기로 등록해두면 편리함

---

## 추후 개선 (자동 시작 설정)

매번 Termux를 수동으로 실행하는 불편함을 없애려면  
다음 세션에서 **Termux:Boot** 앱을 이용한 자동 시작 설정을 추가할 수 있음:

```bash
# Termux:Boot 설치 후
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/start-server.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/sh
cd /sdcard/ship_med
npm start
EOF
chmod +x ~/.termux/boot/start-server.sh
```
