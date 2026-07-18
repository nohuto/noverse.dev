$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceDir = Join-Path $root 'main'
$outDir = Join-Path $sourceDir 'min'
$esbuild = Join-Path $root 'docs-site\node_modules\.bin\esbuild.cmd'

Set-Location $root
New-Item -ItemType Directory -Force $outDir | Out-Null

Get-ChildItem -Path (Join-Path $sourceDir '*.js') -File |
  Where-Object { $_.Name -notlike '*.min.js' } |
  ForEach-Object {
    & $esbuild $_.FullName --minify --log-level=silent "--outfile=$(Join-Path $outDir "$($_.BaseName).min.js")"
  }

Get-ChildItem -Path (Join-Path $sourceDir '*.css') -File |
  Where-Object { $_.Name -notlike '*.min.css' } |
  ForEach-Object {
    & $esbuild $_.FullName --minify --log-level=silent "--outfile=$(Join-Path $outDir "$($_.BaseName).min.css")"
  }
