@echo off
chcp 65001 > nul
title Mont°6 - Pubblicazione Sito
echo =======================================================
echo           MONT°6 - PUBBLICAZIONE AUTOMATICA
echo =======================================================
echo.
echo 1. Aggiornamento della versione inglese...
call npm run build
if errorlevel 1 (
    echo.
    echo *** BUILD FALLITA: non pubblico niente. ***
    echo Il sito online resta come prima. Chiedi aiuto prima di riprovare.
    echo.
    pause
    exit /b 1
)
echo.
echo 2. Rilevamento delle modifiche apportate...
git add .
echo.
echo 3. Salvataggio delle modifiche (Commit)...
git commit -m "Aggiornamento tariffe/calendario"
echo.
echo 4. Invio dei file su GitHub (Push)...
git push
echo.
echo =======================================================
echo   COMPLETATO CON SUCCESSO!
echo   Cloudflare ha rilevato le modifiche e sta aggiornando
echo   il sito online. Tra circa 30 secondi sarà tutto live!
echo =======================================================
echo.
pause
