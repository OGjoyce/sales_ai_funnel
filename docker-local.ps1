# Velora local Docker (Windows) — run from repo root after Docker Desktop is healthy.
# Usage: .\docker-local.ps1 build | up | down | status | test

param(
    [Parameter(Position = 0)]
    [ValidateSet('build', 'up', 'down', 'status', 'migrate', 'seed', 'test', 'logs')]
    [string]$Action = 'up'
)

$ErrorActionPreference = 'Stop'
$ComposeFile = Join-Path $PSScriptRoot 'docker-compose.local.yml'

function Assert-Docker {
    $null = docker version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker daemon is not ready. Open Docker Desktop, wait until it shows Running, then retry."
    }
}

function Assert-FrontendBuild {
    $manifest = Join-Path $PSScriptRoot 'public\build\manifest.json'
    if (-not (Test-Path $manifest)) {
        Write-Host "Building frontend (Node+PHP in Docker)..." -ForegroundColor Yellow
        docker run --rm -v "${PSScriptRoot}:/app" -w /app --env-file (Join-Path $PSScriptRoot '.env.docker') node:22-bookworm bash -c @"
apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq php-cli php-mbstring php-xml php-curl unzip > /dev/null
if [ ! -d vendor ]; then
  curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
  composer install --ignore-platform-reqs --no-scripts --no-interaction
fi
php artisan wayfinder:generate --with-form 2>/dev/null || true
npm ci && npm run build
"@
    }
}

switch ($Action) {
    'build' {
        Assert-Docker
        Assert-FrontendBuild
        $env:COMPOSE_PARALLEL_LIMIT = '1'
        docker compose -f $ComposeFile build --progress=plain
    }
    'up' {
        Assert-Docker
        Assert-FrontendBuild
        $env:COMPOSE_PARALLEL_LIMIT = '1'
        docker compose -f $ComposeFile up -d --build
        Start-Sleep -Seconds 15
        docker compose -f $ComposeFile ps
        Write-Host "`nApp: http://localhost  |  OpenClaw: http://127.0.0.1:18789" -ForegroundColor Green
    }
    'down' {
        docker compose -f $ComposeFile down
    }
    'status' {
        docker compose -f $ComposeFile ps
    }
    'migrate' {
        docker compose -f $ComposeFile exec app php artisan migrate --force
    }
    'seed' {
        docker compose -f $ComposeFile exec app php artisan db:seed --force
    }
    'test' {
        curl.exe -s -o NUL -w "GET /up -> %{http_code}`n" http://localhost/up
        curl.exe -s -o NUL -w "GET / -> %{http_code}`n" http://localhost/
        curl.exe -s -o NUL -w "OpenClaw -> %{http_code}`n" http://127.0.0.1:18789/
        $token = (Select-String -Path (Join-Path $PSScriptRoot '.env.docker') -Pattern '^MCP_SERVICE_TOKEN=(.+)$').Matches.Groups[1].Value
        curl.exe -s -o NUL -w "MCP API -> %{http_code}`n" -H "Authorization: Bearer $token" "http://localhost/api/service/products?limit=1"
    }
    'logs' {
        docker compose -f $ComposeFile logs -f --tail 100
    }
}
