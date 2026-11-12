param([switch]$SkipBuild)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$map = Join-Path $repo 'tools\hajin-map'
$logs = Join-Path $repo '.local\service-logs'
New-Item -ItemType Directory -Path $logs -Force | Out-Null

function Test-Page([string]$url) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Wait-Page([string]$url, [string]$name) {
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        if (Test-Page $url) { return }
        Start-Sleep -Milliseconds 500
    }
    throw "$name did not start at $url. See $logs."
}

$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$node = (Get-Command node.exe -ErrorAction Stop).Source

if (-not (Test-Page 'http://127.0.0.1:4173/')) {
    if (-not $SkipBuild) {
        Push-Location $repo
        try {
            & $npm run build
            if ($LASTEXITCODE -ne 0) { throw 'Guide build failed.' }
        } finally {
            Pop-Location
        }
    }
    if (-not (Test-Path -LiteralPath (Join-Path $repo 'dist\index.html'))) {
        throw 'Guide build is missing. Run without -SkipBuild.'
    }
    $guide = Start-Process -FilePath $node -ArgumentList @('scripts/serve.mjs', '--port', '4173') -WorkingDirectory $repo -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'guide.out.log') -RedirectStandardError (Join-Path $logs 'guide.err.log') -PassThru
    Wait-Page 'http://127.0.0.1:4173/' 'Guide'
    Write-Host "Guide started (PID $($guide.Id))."
} else {
    Write-Host 'Guide already running on port 4173.'
}

if (-not (Test-Page 'http://127.0.0.1:5175/x01-workspace.html')) {
    if (-not (Test-Path -LiteralPath (Join-Path $map 'node_modules'))) {
        Push-Location $map
        try {
            & $npm ci
            if ($LASTEXITCODE -ne 0) { throw 'Map dependencies could not be installed.' }
        } finally {
            Pop-Location
        }
    }
    $mapProcess = Start-Process -FilePath $npm -ArgumentList @('run', 'dev') -WorkingDirectory $map -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'map.out.log') -RedirectStandardError (Join-Path $logs 'map.err.log') -PassThru
    Wait-Page 'http://127.0.0.1:5175/x01-workspace.html' 'Map'
    Write-Host "Map started (PID $($mapProcess.Id))."
} else {
    Write-Host 'Map already running on port 5175.'
}

Write-Host 'Guide: http://127.0.0.1:4173/'
Write-Host 'Hajin map: http://127.0.0.1:5175/'
Write-Host 'X01 map: http://127.0.0.1:5175/x01-workspace.html'
