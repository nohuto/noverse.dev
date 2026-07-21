$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceDir = Join-Path $root 'main'
$assetOutDir = Join-Path $sourceDir 'min'
$htmlSourceDir = Join-Path $sourceDir 'html'
$esbuild = Join-Path $root 'docs-site\node_modules\.bin\esbuild.cmd'
$htmlMinifier = Join-Path $root 'docs-site\scripts\minify-html.mjs'

Set-Location $root
New-Item -ItemType Directory -Force $assetOutDir | Out-Null

Get-ChildItem -Path $sourceDir -File |
  Where-Object { $_.Extension -in '.js', '.css' -and $_.BaseName -notlike '*.min' } |
  ForEach-Object {
    $output = Join-Path $assetOutDir "$($_.BaseName).min$($_.Extension)"
    & $esbuild $_.FullName --minify --log-level=silent "--outfile=$output"
    if ($LASTEXITCODE) { throw "Minification failed for $($_.Name) with exit code $LASTEXITCODE" }
  }

$htmlArgs = @($htmlMinifier)
foreach ($source in Get-ChildItem -Path (Join-Path $htmlSourceDir '*.html') -File) {
  $htmlArgs += $source.FullName
  $htmlArgs += Join-Path $root $source.Name
}

& node @htmlArgs
if ($LASTEXITCODE) { throw "HTML minification failed with exit code $LASTEXITCODE" }
