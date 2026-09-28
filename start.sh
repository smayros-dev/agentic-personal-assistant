#!/usr/bin/env bash
#
# Legacy entry point, kept for backwards compatibility with existing docs.
# Canonical launcher: ./start-local.sh  (Windows/PowerShell: .\start-local.ps1)

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
exec "$PROJECT_ROOT/start-local.sh" "$@"
