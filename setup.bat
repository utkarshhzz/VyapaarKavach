@echo off
echo ====================================================================
echo  Shielding India's Decentralized Commerce - Vyapaar Kavach Setup
echo ====================================================================
echo.

echo [1/4] Checking Python environment...
python --version
if errorlevel 1 (
    echo Python is not installed or not in PATH. Please install Python 3.10+.
    pause
    exit /b 1
)

echo.
echo [2/4] Installing Backend Dependencies...
cd Backend
if not exist ".env" (
    echo Creating .env from .env.example...
    copy .env.example .env
)
pip install -r requirements.txt
pip install -r tests/requirements-test.txt

echo.
echo [3/4] Initializing Database & Running Tests...
python -m pytest tests/test_vyapaar.py -v
cd ..

echo.
echo [4/4] Installing Frontend Dependencies...
call npm install

echo.
echo ====================================================================
echo  Setup Completed Successfully!
echo  To start the backend: cd Backend && uvicorn main:app --reload --port 8000
echo  To start the frontend: npm run dev
echo ====================================================================
pause
