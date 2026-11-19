param(
  [int]$Port = 3001,
  [int]$AuthPort = 3101,
  [int]$GamesPort = 3102
)

# Apaga SisaCard: cierra lo que esté escuchando en sus puertos.
$stopped = 0
foreach ($p in $Port, $AuthPort, $GamesPort) {
  Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    $stopped++
  }
}
if ($stopped -gt 0) { Write-Host '  SisaCard se detuvo.' -ForegroundColor Green }
else { Write-Host '  SisaCard no estaba corriendo.' -ForegroundColor Yellow }
