#Requires -Version 5.1
<#
.SYNOPSIS
  Crea tag de versión desde VERSION, hace commit pendiente y publica a GitHub.
.EXAMPLE
  .\deploy\release.ps1 -Message "Corrección menor"
#>
param(
  [string]$Message = ''
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$version = (Get-Content (Join-Path $Root 'VERSION') -Raw).Trim()
if ($version -notmatch '^\d+\.\d+\.\d+$') {
  throw "VERSION inválida: $version (use semver, ej. 1.1.0)"
}

$tag = "v$version"
Write-Host "Versión: $version  Tag: $tag" -ForegroundColor Cyan

$status = git status --porcelain
if ($status) {
  $commitMsg = if ($Message) { "Release $tag - $Message" } else { "Release $tag" }
  git add -A
  git commit -m $commitMsg
}

$existing = git tag -l $tag
if ($existing) {
  Write-Warning "El tag $tag ya existe. Omitiendo creación de tag."
} else {
  git tag -a $tag -m "DevSoporte $tag"
}

git push origin main
git push origin $tag

Write-Host "`nPublicado: $tag" -ForegroundColor Green
Write-Host "https://github.com/JUANMANUEL416/DevSoporte/releases/tag/$tag"
