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
echo Verifica dei pagamenti e della lingua...
call npm test
if errorlevel 1 (
    echo *** TEST FALLITI: pubblicazione interrotta. ***
    pause
    exit /b 1
)
echo.
echo 2. Rilevamento delle modifiche apportate...
git add .
if errorlevel 1 goto :errore
echo.
echo 3. Salvataggio delle modifiche (Commit)...
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "Aggiornamento sito Mont6"
    if errorlevel 1 goto :errore
)
echo.
echo 4. Invio dei file su GitHub (Push)...
git push
if errorlevel 1 goto :errore
echo.
echo =======================================================
echo   COMPLETATO CON SUCCESSO!
echo   File inviati a GitHub. Controlla il risultato del deploy
echo   su Cloudflare prima di considerare il sito aggiornato.
echo =======================================================
echo.
pause
exit /b 0

:errore
echo.
echo *** PUBBLICAZIONE INTERROTTA: un comando Git non e' riuscito. ***
echo Controlla l'errore qui sopra. La pubblicazione non e' confermata.
pause
exit /b 1
