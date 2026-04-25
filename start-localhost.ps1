$ErrorActionPreference = "Stop"

$Root = Join-Path $PSScriptRoot "dist"
$Port = 4173

if (-not (Test-Path (Join-Path $Root "index.html"))) {
  Write-Host "dist/index.html not found: $Root" -ForegroundColor Red
  Read-Host "Press Enter to close"
  exit 1
}

$Mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg" = "image/svg+xml"
  ".png" = "image/png"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".webp" = "image/webp"
  ".ico" = "image/x-icon"
}

function Get-ContentType($Path) {
  $ext = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
  if ($Mime.ContainsKey($ext)) { return $Mime[$ext] }
  return "application/octet-stream"
}

function Get-LocalIps {
  Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
      $_.IPAddress -notlike "127.*" -and
      $_.IPAddress -notlike "169.254.*" -and
      $_.PrefixOrigin -ne "WellKnown"
    } |
    Select-Object -ExpandProperty IPAddress -Unique
}

try {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
  $listener.Start()
} catch {
  Write-Host "Could not start server on port $Port." -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Yellow
  Write-Host ""
  Write-Host "If another server is already running, open http://localhost:$Port/ in your browser."
  Read-Host "Press Enter to close"
  exit 1
}

Write-Host ""
Write-Host "Comet Rush local server is running." -ForegroundColor Cyan
Write-Host "PC URL:    http://localhost:$Port/" -ForegroundColor Green
foreach ($ip in Get-LocalIps) {
  Write-Host "Phone URL: http://$ip`:$Port/" -ForegroundColor Green
}
Write-Host ""
Write-Host "Keep this window open while playing. Press Ctrl+C to stop."
Write-Host ""

try {
  Start-Process "http://localhost:$Port/"
} catch {
  Write-Host "Open http://localhost:$Port/ manually." -ForegroundColor Yellow
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
    $requestLine = $reader.ReadLine()

    while ($reader.ReadLine()) {}

    if ([string]::IsNullOrWhiteSpace($requestLine)) {
      $client.Close()
      continue
    }

    $parts = $requestLine.Split(" ")
    $urlPath = if ($parts.Length -ge 2) { $parts[1] } else { "/" }
    $urlPath = $urlPath.Split("?")[0]
    $urlPath = [System.Uri]::UnescapeDataString($urlPath)
    if ($urlPath -eq "/" -or $urlPath.EndsWith("/")) {
      $urlPath = $urlPath + "index.html"
    }

    $relative = $urlPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
    $filePath = [System.IO.Path]::GetFullPath((Join-Path $Root $relative))
    $rootFull = [System.IO.Path]::GetFullPath($Root)

    if (-not $filePath.StartsWith($rootFull) -or -not (Test-Path $filePath -PathType Leaf)) {
      $filePath = Join-Path $Root "index.html"
      $status = "HTTP/1.1 200 OK"
    } else {
      $status = "HTTP/1.1 200 OK"
    }

    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $headers = @(
      $status
      "Content-Type: $(Get-ContentType $filePath)"
      "Content-Length: $($bytes.Length)"
      "Cache-Control: no-store"
      "Connection: close"
      ""
      ""
    ) -join "`r`n"

    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    $stream.Write($bytes, 0, $bytes.Length)
  } catch {
    Write-Host "Request failed: $($_.Exception.Message)" -ForegroundColor Yellow
  } finally {
    $client.Close()
  }
}
