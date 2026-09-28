#!/usr/bin/env bash
#
# scripts/lib/common.sh - Multi-OS helpers (Windows/Git Bash, macOS, Linux)
#
# Source it from any script:
#   . "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/scripts/lib/common.sh"
#
# Provides: OS detection, python/docker discovery, HTTP & port checks,
#           process kill, terminal opening, portable sed -i, temp dirs.

[ -n "${PA_COMMON_LOADED:-}" ] && return 0
PA_COMMON_LOADED=1

# --------------------------------------------------------------------------
# OS detection
# --------------------------------------------------------------------------
PA_OS="unknown"
case "$(uname -s 2>/dev/null)" in
  MINGW*|MSYS*|CYGWIN*) PA_OS="windows" ;;
  Darwin)               PA_OS="macos" ;;
  Linux)                PA_OS="linux" ;;
esac
if [ "$PA_OS" = "linux" ] && grep -qi microsoft /proc/version 2>/dev/null; then
  PA_OS="wsl"
fi

pa_is_windows() { [ "$PA_OS" = "windows" ] || [ "$PA_OS" = "wsl" ]; }

pa_os_label() {
  case "$PA_OS" in
    windows) echo "Windows (Git Bash)" ;;
    wsl)     echo "Windows (WSL)" ;;
    macos)   echo "macOS" ;;
    linux)   echo "Linux" ;;
    *)       echo "Unknown" ;;
  esac
}

# --------------------------------------------------------------------------
# Output
# --------------------------------------------------------------------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

ok()      { echo -e "  ${GREEN}OK${NC}  $1"; }
info()    { echo -e "  ${CYAN}..${NC}  $1"; }
warn()    { echo -e "  ${YELLOW}!!${NC}  $1"; }
fail()    { echo -e "  ${RED}ERR${NC} $1"; }
step()    { echo -e "${BLUE}->${NC} $1"; }
hr()      { echo -e "${BLUE}==========================================================${NC}"; }

# --------------------------------------------------------------------------
# Paths / logs
# --------------------------------------------------------------------------
pa_tmp() {
  if [ -n "${TMPDIR:-}" ]; then echo "$TMPDIR"; else echo "/tmp"; fi
}

pa_log_dir() {
  local d
  d="$(pa_tmp)/agentic-assistant-logs"
  mkdir -p "$d"
  echo "$d"
}

pa_win_path() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$1" | sed 's#\\#/#g'
  elif command -v wslpath >/dev/null 2>&1; then
    wslpath -w "$1"
  else
    printf '%s\n' "$1" | sed -E 's#^/([a-zA-Z])/#\1:/#'
  fi
}

# --------------------------------------------------------------------------
# Tool discovery
# --------------------------------------------------------------------------
pa_python() {
  local c
  for c in python3 python py; do
    if command -v "$c" >/dev/null 2>&1; then
      if [ "$c" = "py" ]; then echo "py -3"; else echo "$c"; fi
      return 0
    fi
  done
  return 1
}

pa_python_has() { # module
  local py
  py="$(pa_python)" || return 1
  $py -c "import $1" >/dev/null 2>&1
}

pa_chroma_bin() {
  local c f
  c="$(command -v chroma 2>/dev/null)" && [ -n "$c" ] && { echo "$c"; return 0; }
  if pa_is_windows; then
    for f in "${APPDATA:-}"/Python/*/Scripts/chroma.exe /c/Python*/Scripts/chroma.exe; do
      if [ -x "$f" ]; then echo "$f"; return 0; fi
    done
  fi
  if command -v chromadb >/dev/null 2>&1; then command -v chromadb; return 0; fi
  return 1
}

pa_compose() {
  if command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
  elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  else
    return 1
  fi
}

pa_docker_running() { docker info >/dev/null 2>&1; }

pa_docker_hint() {
  case "$PA_OS" in
    macos)   echo "Start Docker Desktop (or install: brew install --cask docker)" ;;
    windows) echo "Start Rancher Desktop or Docker Desktop" ;;
    wsl)     echo "Start Docker Desktop with WSL integration" ;;
    *)       echo "Start the daemon: sudo systemctl start docker" ;;
  esac
}

# --------------------------------------------------------------------------
# HTTP checks
# --------------------------------------------------------------------------
pa_http_ok() { curl -s -o /dev/null -m 5 "$1" 2>/dev/null; }

pa_wait_for() { # url label [tries]
  local url="$1" label="$2" tries="${3:-30}" i
  for i in $(seq 1 "$tries"); do
    if pa_http_ok "$url"; then ok "$label ready ($url)"; return 0; fi
    sleep 1
  done
  fail "$label not reachable after ${tries}s ($url)"
  return 1
}

pa_chroma_ok() { # chroma answers on /api/v2/heartbeat (1.x) or /api/v1 (0.x)
  pa_http_ok "${PA_CHROMA_URL:-http://localhost:8000}/api/v2/heartbeat" ||
    pa_http_ok "${PA_CHROMA_URL:-http://localhost:8000}/api/v1"
}

pa_wait_chroma() { # [tries]
  local tries="${1:-30}" i
  for i in $(seq 1 "$tries"); do
    if pa_chroma_ok; then ok "Chroma ready (${PA_CHROMA_URL:-http://localhost:8000})"; return 0; fi
    sleep 1
  done
  fail "Chroma not reachable after ${tries}s"
  return 1
}

# --------------------------------------------------------------------------
# Ports
# --------------------------------------------------------------------------
pa_port_busy() { # port -> 0 if something listens on it
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | grep -q LISTEN && return 0
    return 1
  fi
  if command -v netstat >/dev/null 2>&1; then
    netstat -an 2>/dev/null | grep -E "[:.]$port[[:space:]]" | grep -qi listen && return 0
    return 1
  fi
  # Last resort: HTTP probe (works for our HTTP services)
  pa_http_ok "http://localhost:$port"
}

pa_pid_on_port() { # port -> first pid (may be empty)
  local port="$1" pids=""
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | head -1
  elif command -v netstat >/dev/null 2>&1; then
    netstat -ano 2>/dev/null | grep -E "LISTENING" | grep -E "[:.]$port[[:space:]]" \
      | awk '{print $NF}' | head -1
  fi
}

pa_kill_port() { # port
  local port="$1" pid
  pa_port_busy "$port" || return 0
  if pa_is_windows; then
    local pids
    pids="$(netstat -ano 2>/dev/null | grep -E 'LISTENING' | grep -E "[:.]$port[[:space:]]" | awk '{print $NF}' | sort -u)"
    for pid in $pids; do
      [ "$pid" = "0" ] && continue
      MSYS_NO_PATHCONV=1 taskkill //PID "$pid" //F >/dev/null 2>&1 || true
    done
  else
    pid="$(pa_pid_on_port "$port")"
    if [ -n "$pid" ]; then
      kill -9 "$pid" 2>/dev/null || true
    elif command -v fuser >/dev/null 2>&1; then
      fuser -k "${port}/tcp" >/dev/null 2>&1 || true
    fi
  fi
  sleep 1
  if pa_port_busy "$port"; then fail "could not free port $port"; return 1; fi
  ok "port $port freed"
}

pa_kill_pattern() { # regex matched against process command line
  local pat="$1"
  if pa_is_windows; then
    MSYS_NO_PATHCONV=1 powershell.exe -NoProfile -Command \
      "Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -like '*${pat}*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" \
      >/dev/null 2>&1 || true
  elif command -v pkill >/dev/null 2>&1; then
    pkill -f "$pat" 2>/dev/null || true
  fi
  return 0
}

# --------------------------------------------------------------------------
# Service startup (detached)
# --------------------------------------------------------------------------
pa_chroma_start() { # [persistence_path]
  local persist="${1:-}" bin psargs
  bin="$(pa_chroma_bin)" || { fail "chroma binary not found -> pip install chromadb (or start Docker)"; return 1; }
  if pa_is_windows; then
    [ -n "$persist" ] && persist="$(pa_win_path "$persist")"
    psargs="'run','--host','localhost','--port','8000'"
    [ -n "$persist" ] && psargs="$psargs,'--path','$persist'"
    rm -f "$(pa_tmp)/chroma.log" "$(pa_tmp)/chroma.err.log"
    MSYS_NO_PATHCONV=1 powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \
      "Start-Process -FilePath '$bin' -ArgumentList $psargs -WindowStyle Hidden -RedirectStandardOutput '$(pa_win_path "$(pa_tmp)")/chroma.log' -RedirectStandardError '$(pa_win_path "$(pa_tmp)")/chroma.err.log'" \
      >/dev/null 2>&1
  else
    if [ -n "$persist" ]; then
      "$bin" run --host localhost --port 8000 --path "$persist" > "$(pa_tmp)/chroma.log" 2>&1 &
    else
      "$bin" run --host localhost --port 8000 > "$(pa_tmp)/chroma.log" 2>&1 &
    fi
    disown 2>/dev/null || true
  fi
}

pa_ollama_start() {
  if pa_is_windows; then
    MSYS_NO_PATHCONV=1 powershell.exe -NoProfile -Command \
      "Start-Process -FilePath 'ollama' -ArgumentList 'serve' -WindowStyle Hidden" >/dev/null 2>&1
  else
    ollama serve > "$(pa_tmp)/ollama.log" 2>&1 &
    disown 2>/dev/null || true
  fi
}

pa_kill_chroma() {
  if pa_is_windows; then
    pa_kill_pattern "chroma"
  elif command -v pkill >/dev/null 2>&1; then
    pkill -f "chroma run" 2>/dev/null || true
  fi
  return 0
}

# --------------------------------------------------------------------------
# Terminal windows
# --------------------------------------------------------------------------
pa_open_terminal() { # title workdir command
  local title="$1" dir="$2" cmd="$3"
  case "$PA_OS" in
    windows)
      MSYS_NO_PATHCONV=1 powershell.exe -NoProfile -Command \
        "Start-Process cmd -ArgumentList '/k','$cmd' -WorkingDirectory '$(pa_win_path "$dir")'" \
        >/dev/null 2>&1
      ;;
    wsl)
      if command -v powershell.exe >/dev/null 2>&1; then
        powershell.exe -NoProfile -Command \
          "Start-Process cmd -ArgumentList '/k','$cmd' -WorkingDirectory '$(pa_win_path "$dir")'" \
          >/dev/null 2>&1
      elif command -v gnome-terminal >/dev/null 2>&1; then
        gnome-terminal -- bash -c "cd '$dir' && $cmd; exec bash"
      elif command -v xterm >/dev/null 2>&1; then
        xterm -e "cd '$dir' && $cmd; bash" &
      else
        warn "No terminal emulator found - run manually: cd '$dir' && $cmd"
      fi
      ;;
    macos)
      osascript <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "cd \"$dir\" && $cmd"
end tell
APPLESCRIPT
      ;;
    *)
      if command -v gnome-terminal >/dev/null 2>&1; then
        gnome-terminal -- bash -c "cd '$dir' && $cmd; exec bash"
      elif command -v konsole >/dev/null 2>&1; then
        konsole -e bash -c "cd '$dir' && $cmd; exec bash"
      elif command -v xterm >/dev/null 2>&1; then
        xterm -e "cd '$dir' && $cmd; bash" &
      else
        warn "No terminal emulator found - run manually: cd '$dir' && $cmd"
      fi
      ;;
  esac
}

# --------------------------------------------------------------------------
# Portable sed -i (GNU vs BSD)
# --------------------------------------------------------------------------
pa_sed_i() { # file expression...   (expressions: s/RE/RE/[g])
  local file="$1"
  shift
  if sed --version >/dev/null 2>&1; then
    sed -i "$@" "$file" 2>/dev/null && return 0     # GNU (Linux, Git Bash)
  else
    sed -i '' "$@" "$file" 2>/dev/null && return 0   # BSD (macOS)
  fi
  # Fallback: Windows "Controlled Folder Access" can block sed.exe from
  # creating its temp file next to the target -> delegate the edit to
  # PowerShell (usually allowed through CFA).
  pa_sed_i_fallback "$file" "$@"
}

pa_sed_i_fallback() {
  local file="$1"
  shift
  if ! command -v powershell.exe >/dev/null 2>&1; then
    fail "sed -i failed on $file and no PowerShell fallback available"
    return 1
  fi
  local psfile expr re rep
  psfile="$(pa_tmp)/pa_sed_$$.ps1"
  {
    printf "\$p = '%s'\n" "$(pa_win_path "$file")"
    printf "\$c = [IO.File]::ReadAllText(\$p)\n"
    for expr in "$@"; do
      case "$expr" in
        s*/*/*) ;;
        *) fail "unsupported expression for fallback: $expr"; return 1 ;;
      esac
      re="${expr#s}"; re="${re#/}"; re="${re%%/*}"
      rep="${expr#s}"; rep="${rep#/}"; rep="${rep#*/}"; rep="${rep%%/*}"
      re="${re//\'/\'\'}"
      rep="${rep//\'/\'\'}"
      # (?m) = multiline so ^ and $ match per line, as sed does
      printf "\$c = \$c -replace '(?m)%s','%s'\n" "$re" "$rep"
    done
    printf "[IO.File]::WriteAllText(\$p, \$c, (New-Object Text.UTF8Encoding(\$false)))\n"
  } > "$psfile"

  if MSYS_NO_PATHCONV=1 powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(pa_win_path "$psfile")" >/dev/null 2>&1; then
    rm -f "$psfile"
    return 0
  fi
  rm -f "$psfile"
  fail "could not edit $file"
  return 1
}

# --------------------------------------------------------------------------
# Service URLs (override via env if needed)
# --------------------------------------------------------------------------
PA_CHROMA_URL="${PA_CHROMA_URL:-http://localhost:8000}"
PA_BACKEND_URL="${PA_BACKEND_URL:-http://localhost:3001}"
PA_FRONTEND_URL="${PA_FRONTEND_URL:-http://localhost:5173}"
PA_OLLAMA_URL="${PA_OLLAMA_URL:-http://localhost:11434}"
