#Requires -Version 5.1
<#
.SYNOPSIS
  Publica versión: registra en devver/devcamb, crea tag Git y sube a GitHub.
.PARAMETER Message
  Mensaje adicional para el commit de release.
.PARAMETER SkipPublish
  No ejecuta publicación en control de versiones (solo tag Git).
.EXAMPLE
  .\deploy\release.ps1 -Message "Imagenes bitacora y tratamiento"
#>
param(
  [string]$Message = '',
  [switch]$SkipPublish
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne 'master') {
  throw "El release solo se permite desde la rama master (actual: $branch)."
}

$version = (Get-Content (Join-Path $Root 'VERSION') -Raw).Trim()
if ($version -notmatch '^\d+\.\d+\.\d+$') {
  throw "VERSION inválida: $version (use semver, ej. 1.1.0)"
}

$tag = "v$version"
Write-Host "Versión: $version  Tag: $tag" -ForegroundColor Cyan

if (-not $SkipPublish) {
  Write-Host "`n==> Control de versiones (devver / devcamb)" -ForegroundColor Cyan
  Push-Location (Join-Path $Root 'backend')
  try {
    node scripts/publicar-version.mjs --auto-integrados --version $version
  } catch {
    Pop-Location
    throw
  }
  Pop-Location
  $version = (Get-Content (Join-Path $Root 'VERSION') -Raw).Trim()
  $tag = "v$version"
}

$status = git status --porcelain
if ($status) {
  $commitMsg = if ($Message) { "Release $tag - $Message" } else { "Release $tag" }
  git add VERSION CHANGELOG.md
  git add -u
  git commit -m $commitMsg
}

$existing = git tag -l $tag
if ($existing) {
  Write-Warning "El tag $tag ya existe. Omitiendo creación de tag."
} else {
  git tag -a $tag -m "DevSoporte $tag"
}

git push origin master
git push origin $tag

Write-Host "`nPublicado: $tag" -ForegroundColor Green
Write-Host "Control de versiones actualizado (devver + devcamb publicados)."
Write-Host "https://github.com/JUANMANUEL416/DevSoporte/releases/tag/$tag"
