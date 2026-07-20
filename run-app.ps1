# Arranca el dev server de puntoVenta2 y abre el catalogo en el navegador.
# Uso:  .\run-app.ps1   (desde la raiz del repo)
$ErrorActionPreference = "Stop"

$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
$web = Join-Path $repo "web"

if (-not (Test-Path $web)) {
    Write-Error "No existe la carpeta web/ en $repo"
    exit 1
}

# Levanta vite en una ventana propia (queda vivo; cerra esa ventana para parar).
Start-Process -FilePath "npm" -ArgumentList "run","dev" -WorkingDirectory $web -WindowStyle Normal

# Espera a que el server responda antes de abrir el navegador.
$url = "http://localhost:5173/catalogo"
$max = 30
for ($i = 0; $i -lt $max; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 1 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($r.StatusCode -eq 200) { break }
    } catch {}
    Start-Sleep -Seconds 1
}

Start-Process $url
Write-Host "[ok] Dev server en $url (cerrá la ventana de npm para detenerlo)."
