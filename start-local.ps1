# Windows entry point for start-local.sh
# Usage: .\start-local.ps1

& "$PSScriptRoot\scripts\invoke-sh.ps1" -Script 'start-local.sh' @args
exit $LASTEXITCODE
