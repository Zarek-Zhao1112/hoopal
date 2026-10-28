$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:ProgramFiles 'nodejs/node.exe' }
if (-not (Test-Path -LiteralPath $nodePath)) { throw '请先安装 Node.js 22 或更新版本，再运行此脚本。' }
Write-Host '打开浏览器访问 http://127.0.0.1:4173。按 Ctrl+C 停止。'
& $nodePath scripts/start.mjs
