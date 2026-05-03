#!/data/data/com.termux/files/usr/bin/sh
# 선내 의약품 키오스크 서버 시작 스크립트 (Termux/Android)
# 사용법: sh start.sh

PROJ_DIR="/sdcard/ship_med"
DB_HOME="/data/data/com.termux/files/home"

cd "$PROJ_DIR" || { echo "[오류] $PROJ_DIR 폴더를 찾을 수 없습니다."; exit 1; }

# DB_PATH를 Termux 홈으로 설정 (내장메모리 파일시스템 호환 문제 방지)
export DB_PATH="$DB_HOME/ship-med.db"

# DB 파일이 없으면 마이그레이션 + 시드 실행
if [ ! -f "$DB_PATH" ]; then
  echo "[정보] DB 파일이 없습니다. 초기화를 시작합니다..."
  npm run db:migrate && npm run db:seed
  echo "[완료] DB 초기화 완료"
fi

echo "[시작] 서버를 시작합니다... (http://localhost:3000)"
npm start
