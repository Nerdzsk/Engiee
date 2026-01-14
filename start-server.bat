@echo off
echo Starting localhost server on port 3000...
echo.
echo IMPORTANT: DO NOT CLOSE THIS WINDOW!
echo Press Ctrl+C to stop the server.
echo.
python -m http.server 3000
pause
