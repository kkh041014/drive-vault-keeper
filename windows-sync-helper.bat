@echo off
chcp 65001 >nul
title Obsidian Drive Vault Keeper (Windows Helper)

echo ========================================================
echo   Obsidian Drive Vault Keeper - Windows 동기화 도구
echo ========================================================
echo.
echo  [1] 지금 구글 드라이브에서 이 PC로 그대로 동기화받기 (Pull)
echo  [2] 지금 이 PC의 보관함을 구글 드라이브에 업로드하기 (Push)
echo  [3] 윈도우 작업 스케줄러에 하루 1번(23:00) 자동 업로드 등록
echo  [4] 브라우저로 Google 계정 1클릭 인증 연결하기
echo.
set /p choice="원하시는 작업 번호를 입력하세요 (1-4): "

set SCRIPT_DIR=%~dp0
set VAULT_DIR=%~dp0..\..\..

if "%choice%"=="1" (
    node "%SCRIPT_DIR%drive-keeper-cli.mjs" pull --vault "%VAULT_DIR%"
    pause
    exit /b
)
if "%choice%"=="2" (
    node "%SCRIPT_DIR%drive-keeper-cli.mjs" push --vault "%VAULT_DIR%"
    pause
    exit /b
)
if "%choice%"=="3" (
    schtasks /Create /SC DAILY /TN "ObsidianDriveVaultKeeper" /TR "node \"%SCRIPT_DIR%drive-keeper-cli.mjs\" push --vault \"%VAULT_DIR%\"" /ST 23:00 /F
    echo.
    echo [완료] 매일 23:00에 자동 백업이 실행되도록 Windows 작업 스케줄러에 등록되었습니다!
    pause
    exit /b
)
if "%choice%"=="4" (
    node "%SCRIPT_DIR%drive-keeper-cli.mjs" auth --vault "%VAULT_DIR%"
    pause
    exit /b
)
