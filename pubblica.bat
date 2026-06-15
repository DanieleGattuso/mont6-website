@echo off
chcp 65001 > nul
title Mont°6 - Pubblicazione Sito
echo =======================================================
echo           MONT°6 - PUBBLICAZIONE AUTOMATICA             
echo =======================================================
echo.
echo 1. Rilevamento delle modifiche apportate...
git add .
echo.
echo 2. Salvataggio delle modifiche (Commit)...
git commit -m "Aggiornamento tariffe/calendario"
echo.
echo 3. Invio dei file su GitHub (Push)...
git push
echo.
echo =======================================================
echo   COMPLETATO CON SUCCESSO!
echo   Netlify ha rilevato le modifiche e sta aggiornando
echo   il sito online. Tra circa 30 secondi sarà tutto live!
echo =======================================================
echo.
pause
