param([switch]$SkipBuild, [switch]$Author, [switch]$LegacyMap)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
Push-Location $repo
try {
 if ($LegacyMap) { & npm.cmd run local:legacy-map; exit $LASTEXITCODE }
 $localArgs = @('scripts/local.mjs')
 if ($SkipBuild) { $localArgs += '--skip-build' }
 & node.exe @localArgs
 if ($LASTEXITCODE -ne 0) { throw 'Local startup failed.' }
 if ($Author) { Write-Host 'Run npm run author in another terminal for the optional editor at http://127.0.0.1:4174/' }
} finally { Pop-Location }
