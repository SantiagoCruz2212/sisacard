param(
  [int]$Port = 3001,
  [int]$AuthPort = 3101,
  [int]$GamesPort = 3102,
  [switch]$NoBrowser,
  [switch]$SkipFirewall
)

# Arranque de SisaCard con doble clic (lo llama "Iniciar SisaCard.bat").
# Instala dependencias si faltan, compila el frontend si hace falta, levanta gateway + auth + juegos
# en un solo puerto, abre el firewall (una vez) y muestra la IP a la que se conectan las demás PCs.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Say($text, $color = 'Gray') { Write-Host $text -ForegroundColor $color }
function Fail($text) {
  Say ''
  Say "  ERROR: $text" Red
  exit 1
}

function Show-Banner($ips) {
  Say ''
  Say '  ==============================================================' Green
  Say '    SisaCard está corriendo' Green
  Say '  ==============================================================' Green
  Say ''
  Say '    En esta PC:' White
  Say "      http://localhost:$Port" Cyan
  Say ''
  if ($ips) {
    Say '    Para las demás PCs de la oficina (misma red), abrir en el navegador:' White
    foreach ($ip in $ips) { Say "      http://${ip}:$Port" Yellow }
  } else {
    Say '    No encontré una IP de red. ¿Está conectada esta PC al Wi-Fi o al cable?' Red
  }
  Say ''
}

Clear-Host
Say ''
Say '  SisaCard - iniciando...' Cyan
Say ''

# ---- IPs de red local (adaptadores con puerta de enlace, es decir, la red real) ----
$ips = @(Get-NetIPConfiguration -ErrorAction SilentlyContinue |
  Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } |
  ForEach-Object { $_.IPv4Address.IPAddress } |
  Where-Object { $_ -and $_ -notlike '169.254.*' })

# ---- ¿Ya está corriendo? ----
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
  Say "  Ya hay algo corriendo en el puerto $Port (probablemente SisaCard)." Yellow
  Show-Banner $ips
  if (-not $NoBrowser) { Start-Process "http://localhost:$Port" }
  Say '  Si quieres reiniciarlo, usa "Detener SisaCard" y vuelve a abrir este archivo.' Gray
  exit 0
}

# ---- 1. Node.js ----
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Start-Process 'https://nodejs.org/en/download'
  Fail 'No tienes Node.js instalado. Instala la versión LTS desde https://nodejs.org y vuelve a abrir este archivo.'
}
$nodeVersion = [version]((node -v).TrimStart('v'))
if ($nodeVersion -lt [version]'22.12.0') {
  Start-Process 'https://nodejs.org/en/download'
  Fail "Tu Node.js es $nodeVersion y se necesita 22.12 o superior. Actualiza desde https://nodejs.org y vuelve a abrir este archivo."
}

# ---- 2. Dependencias ----
if (-not (Test-Path (Join-Path $root 'node_modules'))) {
  Say '  Instalando dependencias (solo la primera vez, puede tardar unos minutos)...' Yellow
  & npm install
  if ($LASTEXITCODE -ne 0) { Fail 'No se pudieron instalar las dependencias. Revisa tu conexión a internet.' }
}

# ---- 3. Compilar el frontend si no existe o si el código es más nuevo ----
$dist = Join-Path $root 'frontend\dist\index.html'
$needsBuild = -not (Test-Path $dist)
if (-not $needsBuild) {
  $newest = Get-ChildItem -Path (Join-Path $root 'frontend\src'), (Join-Path $root 'frontend\index.html'), (Join-Path $root 'frontend\package.json') -Recurse -File |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($newest -and $newest.LastWriteTime -gt (Get-Item $dist).LastWriteTime) { $needsBuild = $true }
}
if ($needsBuild) {
  Say '  Compilando la página (unos segundos)...' Yellow
  & npm run build
  if ($LASTEXITCODE -ne 0) { Fail 'No se pudo compilar el frontend.' }
}

# ---- 4. Secretos propios (se crean una vez y se guardan en .sisacard.env, que no se sube a GitHub) ----
$envFile = Join-Path $root '.sisacard.env'
if (-not (Test-Path $envFile)) {
  $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
  function New-Secret { $b = New-Object byte[] 32; $rng.GetBytes($b); ($b | ForEach-Object { $_.ToString('x2') }) -join '' }
  @("JWT_SECRET=$(New-Secret)", "GATEWAY_SECRET=$(New-Secret)") | Set-Content -Path $envFile -Encoding ASCII
}
foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*([A-Z_]+)=(.+)$') { Set-Item -Path "Env:$($Matches[1])" -Value $Matches[2].Trim() }
}

# ---- 5. Firewall: se pide permiso de administrador una sola vez ----
if (-not $SkipFirewall) {
  $ruleName = "SisaCard-$Port"
  if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
    $command = "New-NetFirewallRule -DisplayName '$ruleName' -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any | Out-Null"
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    try {
      if ($isAdmin) { Invoke-Expression $command }
      else {
        Say '  Windows va a pedir permiso de administrador UNA sola vez, para que las otras PCs puedan entrar.' Yellow
        Say '  (Acepta el aviso; si lo rechazas el juego funciona en esta PC pero las demás no podrán conectarse.)' Gray
        Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile', '-Command', $command
      }
    } catch {
      Say '  No se abrió el firewall. Las otras PCs podrían no poder conectarse.' Red
    }
  }
}

# ---- 6. Arrancar los servicios (la salida va a logs\sisacard.log) ----
$logDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'sisacard.log'
Add-Content -Path $log -Value "=== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==="

$env:PORT = "$Port"
$env:AUTH_PORT = "$AuthPort"
$env:GAMES_PORT = "$GamesPort"
$env:AUTH_URL = "http://localhost:$AuthPort"
$env:GAMES_URL = "http://localhost:$GamesPort"

Say '  Levantando servicios...' Yellow
$proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "npm start >> `"$log`" 2>&1" -NoNewWindow -PassThru

try {
  # Esperar a que gateway, auth y juegos respondan.
  $ready = $false
  for ($i = 0; $i -lt 90 -and -not $ready; $i++) {
    if ($proc.HasExited) { break }
    Start-Sleep -Seconds 1
    try {
      foreach ($p in $Port, $AuthPort, $GamesPort) {
        Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 "http://127.0.0.1:$p/health" | Out-Null
      }
      $ready = $true
    } catch { }
  }

  if (-not $ready) {
    Say ''
    Say '  Los servicios no arrancaron. Últimas líneas del registro:' Red
    Get-Content $log -Tail 20 | ForEach-Object { Say "    $_" Gray }
    exit 1
  }

  Clear-Host
  Show-Banner $ips
  if ($ips) {
    try { Set-Clipboard -Value "http://$($ips[0]):$Port"; Say '    (La primera dirección ya quedó copiada: pégala en el chat para tus compañeros.)' Gray } catch { }
  }
  Say '  Esta ventana debe quedar abierta mientras se juega.' White
  Say '  Para apagar todo, ciérrala (o presiona Ctrl+C).' White
  Say "  Registro de eventos: logs\sisacard.log" DarkGray
  if (-not $NoBrowser) { Start-Process "http://localhost:$Port" }

  $proc.WaitForExit()
  Say ''
  Say '  El servidor se detuvo. Últimas líneas del registro:' Yellow
  Get-Content $log -Tail 10 | ForEach-Object { Say "    $_" Gray }
}
finally {
  if ($proc -and -not $proc.HasExited) { & taskkill /PID $proc.Id /T /F 2>&1 | Out-Null }
}
