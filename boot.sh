#!/data/data/com.termux/files/usr/bin/sh
# Termux:Boot 자동 시작 스크립트
# 설치: cp boot.sh ~/.termux/boot/start-kiosk.sh && chmod +x ~/.termux/boot/start-kiosk.sh

# 내장메모리 마운트 대기 (부팅 후 /sdcard 마운트까지 시간이 걸림)
sleep 10

cd /sdcard/ship_med && export DB_PATH=/data/data/com.termux/files/home/ship-med.db && npm start >> /data/data/com.termux/files/home/kiosk.log 2>&1
