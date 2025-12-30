@echo off
echo ========================================
echo Deploiement FindConnect Afrique
echo ========================================
echo.

echo [1/3] Deploiement des regles Firestore...
firebase deploy --only firestore:rules
if %errorlevel% neq 0 (
    echo ERREUR: Echec du deploiement des regles Firestore
    pause
    exit /b %errorlevel%
)
echo ✓ Regles Firestore deployees avec succes
echo.

echo [2/3] Deploiement des index Firestore...
firebase deploy --only firestore:indexes
if %errorlevel% neq 0 (
    echo ERREUR: Echec du deploiement des index Firestore
    pause
    exit /b %errorlevel%
)
echo ✓ Index Firestore deployes avec succes
echo.

echo [3/3] Deploiement des regles Storage...
firebase deploy --only storage
if %errorlevel% neq 0 (
    echo ERREUR: Echec du deploiement des regles Storage
    pause
    exit /b %errorlevel%
)
echo ✓ Regles Storage deployees avec succes
echo.

echo ========================================
echo Deploiement termine avec succes!
echo ========================================
echo.
echo Pour deployer les Cloud Functions, executez:
echo   cd functions
echo   npm install @google-cloud/vision
echo   firebase deploy --only functions
echo.
pause
