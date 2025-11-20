# PowerShell script to fix "database does not exist" error
# Run this in the directory with docker-compose.yml

Write-Host "Stopping containers..." -ForegroundColor Yellow
docker-compose down

Write-Host "Removing old data directories..." -ForegroundColor Yellow
if (Test-Path ".\data\acc") {
    Remove-Item -Recurse -Force ".\data\acc"
    Write-Host "Removed .\data\acc" -ForegroundColor Green
}
if (Test-Path ".\data\prod") {
    Remove-Item -Recurse -Force ".\data\prod"
    Write-Host "Removed .\data\prod" -ForegroundColor Green
}

Write-Host "`nVerifying .env file..." -ForegroundColor Yellow
if (Test-Path ".\env") {
    Write-Host "Contents of .env file:" -ForegroundColor Cyan
    Get-Content .env
    Write-Host "`nMake sure POSTGRES_DB_ACC and POSTGRES_DB_PROD are set!" -ForegroundColor Yellow
} else {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Copy docker-compose.env.example to .env and fill in values" -ForegroundColor Red
    exit 1
}

Write-Host "`nChecking if environment variables are being read..." -ForegroundColor Yellow
docker-compose config | Select-String "POSTGRES_DB"

Write-Host "`nStarting containers with fresh data..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "`nWaiting for databases to initialize (10 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "`nChecking if databases were created..." -ForegroundColor Yellow
Write-Host "Acceptance database:" -ForegroundColor Cyan
docker exec postgres-acc psql -U reflectie_user -l 2>&1 | Select-String "reflectie_acc"

Write-Host "`nProduction database:" -ForegroundColor Cyan
docker exec postgres-prod psql -U reflectie_user -l 2>&1 | Select-String "reflectie_prod"

Write-Host "`nDone! Check the output above to verify databases exist." -ForegroundColor Green
Write-Host "If you still see errors, check logs with: docker-compose logs" -ForegroundColor Yellow

