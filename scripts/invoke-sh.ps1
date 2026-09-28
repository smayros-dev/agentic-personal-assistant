# Runs a project shell script through Git Bash (cross-OS entry point).
# Usage: .\scripts\invoke-sh.ps1 -Script start-local.sh [-ScriptArgs '--all']

param(
    [Parameter(Mandatory = $true)][string]$Script,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$ScriptArgs
)

$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$candidates = @(
    (Join-Path $env:ProgramFiles 'Git\bin\bash.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Git\bin\bash.exe'),
    'C:\Program Files\Git\bin\bash.exe'
)
$bash = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $bash) {
    $cmd = Get-Command bash.exe -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source -ne "$env:SystemRoot\system32\bash.exe") { $bash = $cmd.Source }
}

if (-not $bash) {
    Write-Host "Git Bash introuvable. Installe Git for Windows: https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}

$dir = $project -replace '\\', '/'
$extra = ($ScriptArgs | ForEach-Object { "'$_'" }) -join ' '

Write-Host "Git Bash: $bash" -ForegroundColor DarkGray
& $bash -c "cd '$dir' && exec ./$Script $extra"
exit $LASTEXITCODE
