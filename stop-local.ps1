# Windows entry point for stop-local.sh
# Usage: .\stop-local.ps1 [--all]

& "$PSScriptRoot\scripts\invoke-sh.ps1" -Script 'stop-local.sh' @args
exit $LASTEXITCODE
