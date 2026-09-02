@echo off
REM =====================================================================
REM  reset-system.cmd — مشغّل أداة تصفير بيانات نظام الأصيل على ويندوز
REM
REM  الاستخدام (من نافذة الأوامر داخل هذا المجلد):
REM     reset-system.cmd report
REM     reset-system.cmd apply --dry-run
REM     reset-system.cmd apply --yes
REM     reset-system.cmd verify
REM
REM  يشغّل reset-system.js بـ Node.js إن كان مثبتاً، وإلا بنواة Node
REM  المدمجة داخل تطبيق الأصيل نفسه (ELECTRON_RUN_AS_NODE) — بدون أي تثبيت.
REM =====================================================================

setlocal EnableDelayedExpansion
chcp 65001 >nul 2>nul
set "SCRIPT=%~dp0reset-system.js"

if not exist "%SCRIPT%" (
  echo [خطأ] لم أجد الملف reset-system.js بجوار هذا المشغّل.
  goto :end
)

REM --- 1) Node.js من مسار النظام -------------------------------------
where node >nul 2>nul
if not errorlevel 1 (
  node "%SCRIPT%" %*
  goto :end
)

REM --- 2) نواة Node المدمجة داخل تطبيق الأصيل -------------------------
set "APPEXE="
for %%D in (
  "%LOCALAPPDATA%\Programs\alaseel-pms"
  "%LOCALAPPDATA%\Programs\Alaseel PMS"
  "%LOCALAPPDATA%\Programs\alaseel pms"
  "%ProgramFiles%\Alaseel PMS"
  "%ProgramFiles%\alaseel-pms"
  "%ProgramFiles(x86)%\Alaseel PMS"
  "%ProgramFiles(x86)%\alaseel-pms"
) do (
  if not defined APPEXE (
    for /f "delims=" %%F in ('dir /b "%%~D\*.exe" 2^>nul') do (
      if not defined APPEXE (
        echo %%~nF| findstr /i "unins" >nul || set "APPEXE=%%~D\%%F"
      )
    )
  )
)

REM بحث احتياطي داخل مجلد البرامج الشخصي فقط (سريع ومحدود)
if not defined APPEXE (
  for /f "delims=" %%F in ('dir /b /s "%LOCALAPPDATA%\Programs\*alas*.exe" 2^>nul') do (
    if not defined APPEXE (
      echo %%~nF| findstr /i "unins" >nul || set "APPEXE=%%F"
    )
  )
)

if defined APPEXE (
  echo [معلومة] Node.js غير مثبت — سيتم استخدام نواة Node المدمجة في:
  echo          !APPEXE!
  echo.
  set "ELECTRON_RUN_AS_NODE=1"
  "!APPEXE!" "%SCRIPT%" %*
  goto :end
)

echo [خطأ] لم أجد Node.js ولا ملف تشغيل تطبيق الأصيل.
echo.
echo الحل الأول : افتح التطبيق مرة، ثم انسخ مسار ملف التشغيل (Alaseel PMS.exe) وشغّل:
echo              set ELECTRON_RUN_AS_NODE=1
echo              "المسار\Alaseel PMS.exe" "%SCRIPT%" report
echo.
echo الحل الثاني: ثبّت Node.js LTS من nodejs.org ثم أعد تشغيل هذا الملف.

:end
echo.
pause
endlocal
