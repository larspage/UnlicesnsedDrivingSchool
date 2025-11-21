#requires -Version 7.0

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ports = @(3000, 5000)

function Stop-ProcessesOnPort {
	param(
		[int]$Port
	)

	try {
		$connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
		if ($null -ne $connections) {
			$pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 0 }
			foreach ($processId in $pids) {
				try {
					Write-Host "Stopping process PID $processId on port $Port..." -ForegroundColor Yellow
					Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
				} catch {
					Write-Host "Failed to stop PID $($processId): $($_.Exception.Message)" -ForegroundColor Red
				}
			}
		} else {
			Write-Host "No process found listening on port $Port" -ForegroundColor DarkGray
		}
	} catch {
		Write-Host "Could not query connections for port $($Port): $($_.Exception.Message)" -ForegroundColor Red
	}
}

function Wait-ForPortToBeFree {
	param(
		[int]$Port,
		[int]$TimeoutMs = 10000
	)

	$deadline = [DateTime]::UtcNow.AddMilliseconds($TimeoutMs)
	while ([DateTime]::UtcNow -lt $deadline) {
		$inUse = $false
		try {
			$inUse = Test-NetConnection -ComputerName 'localhost' -Port $Port -InformationLevel Quiet
		} catch {
			$inUse = $false
		}

		if (-not $inUse) { return $true }
		Start-Sleep -Milliseconds 200
	}
	return $false
}

Write-Host "=== Start Clean: Killing dev ports and starting app ===" -ForegroundColor Cyan

foreach ($port in $ports) {
	Stop-ProcessesOnPort -Port $port
	if (Wait-ForPortToBeFree -Port $port -TimeoutMs 10000) {
		Write-Host "Port $port is free." -ForegroundColor Green
	} else {
		Write-Host "Warning: Port $port still appears in use after waiting." -ForegroundColor Yellow
	}
}

$frontendUrl = 'http://localhost:3000/'
$apiHealthUrl = 'http://localhost:5000/health'

Write-Host "\nURLs:" -ForegroundColor Cyan
Write-Host "- Frontend: $frontendUrl" -ForegroundColor Green
Write-Host "- API health: $apiHealthUrl" -ForegroundColor Green
Write-Host "\nStarting dev servers (frontend + backend)..." -ForegroundColor Cyan

# Start both services via existing npm script
npm run dev
