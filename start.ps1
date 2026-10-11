# One-command local start (Windows PowerShell):  .\start.ps1  [-Offline]
# Starts the API on :8000 and the web client on :5180. No API keys or accounts needed.
param([switch]$Offline)
$root = $PSScriptRoot
if ($Offline) { $env:SANKET_OFFLINE = "1" }
if (-not (Test-Path "$root\web\node_modules")) { Push-Location "$root\web"; npm install; Pop-Location }
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root'; python -m uvicorn module1.api.main:app --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root\web'; npm run dev"
Write-Host "API: http://localhost:8000/docs   Web: http://localhost:5180"
