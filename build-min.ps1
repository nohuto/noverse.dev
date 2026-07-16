$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceDir = Join-Path $root 'main'
$outDir = Join-Path $sourceDir 'min'

Set-Location $root
New-Item -ItemType Directory -Force $outDir | Out-Null

Get-ChildItem -Path (Join-Path $sourceDir '*.js') -File |
  Where-Object { $_.Name -notlike '*.min.js' } |
  ForEach-Object {
    npx --yes terser $_.FullName -c -m --comments false -o "main/min/$($_.BaseName).min.js"
  }

Get-ChildItem -Path (Join-Path $sourceDir '*.css') -File |
  Where-Object { $_.Name -notlike '*.min.css' } |
  ForEach-Object {
    npx --yes clean-css-cli -O2 $_.FullName -o "main/min/$($_.BaseName).min.css"
  }
