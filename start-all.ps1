# AgroHub — barcha servislarni ishga tushirish (Windows PowerShell)
# Ishlatish: .\start-all.ps1

Write-Host "AgroHub Backend Services" -ForegroundColor Green

$services = @(
    @{ Name = "api-gateway";       Path = "api-gateway";       Port = 7600 },
    @{ Name = "auth-service";      Path = "auth-service";      Port = 3001 },
    @{ Name = "farm-service";      Path = "farm-service";      Port = 3002 },
    @{ Name = "weather-service";   Path = "weather-service";   Port = 3003 },
    @{ Name = "sensor-service";    Path = "sensor-service";    Port = 3004 },
    @{ Name = "irrigation-service";Path = "irrigation-service";Port = 3005 },
    @{ Name = "fintech-service";   Path = "fintech-service";   Port = 3006 },
    @{ Name = "marketplace-service";Path = "marketplace-service";Port = 3007 },
    @{ Name = "logistics-service"; Path = "logistics-service"; Port = 3008 },
    @{ Name = "analytics-service"; Path = "analytics-service"; Port = 3009 }
)

function Stop-ProcessOnPort($port) {
    $existing = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($existing) {
        foreach ($pid in $existing) {
            Write-Host "Stopping existing process on port $port (PID $pid)..." -ForegroundColor Yellow
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 500
        }
    }
}

foreach ($svc in $services) {
    $dir = Join-Path $PSScriptRoot $svc.Path
    if (Test-Path $dir) {
        Stop-ProcessOnPort $svc.Port
        Write-Host "Starting $($svc.Name) on port $($svc.Port)..." -ForegroundColor Cyan
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$dir'; npm run dev" -WindowStyle Minimized
    } else {
        Write-Host "SKIP: $($svc.Name) not found at $dir" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Gateway: http://localhost:7600/health" -ForegroundColor Green
Write-Host "Frontend: cd ../frontend && npm run dev" -ForegroundColor Green
