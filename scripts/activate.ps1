# Dot-source: . ./scripts/activate.ps1
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$projectRoot/.tools/node/node.exe")) {
  throw 'Run node scripts/bootstrap.mjs first.'
}
$env:PATH = "$projectRoot/.tools/node;$projectRoot/.tools/flutter/bin;$env:PATH"
node --version
npm --version
