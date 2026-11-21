# One-command local start (Windows PowerShell):  .\start.ps1
# Starts the API on :8000 and the web client on :5180. All data is live (Open-Meteo, Copernicus,
# OpenStreetMap); Sentinel-2 NDVI needs COPERNICUS_CLIENT_ID / COPERNICUS_CLIENT_SECRET in .env.
$root = $PSScriptRoot
if (-not (Test-Path "$root\web\node_modules")) { Push-Location "$root\web"; npm install; Pop-Location }
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root'; python -m uvicorn module1.api.main:app --port 8000 --reload --timeout-graceful-shutdown 5"
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root\web'; npm run dev"
Write-Host "API: http://localhost:8000/docs   Web: http://localhost:5180"
