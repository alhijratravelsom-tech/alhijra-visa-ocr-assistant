param(
  [string]$OutputPath = (Join-Path $PSScriptRoot "lang-data")
)

Write-Host "=== Alhijra OCR - Language Data Downloader ===" -ForegroundColor Cyan
Write-Host "" 

if (-not (Test-Path -LiteralPath $OutputPath)) {
  New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
  Write-Host "Created directory: $OutputPath" -ForegroundColor Green
}

$Url = "https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata"
$OutputFile = Join-Path $OutputPath "eng.traineddata"

try {
  Write-Host "Downloading eng.traineddata (~15 MB) from:" -ForegroundColor Yellow
  Write-Host "  $Url" -ForegroundColor White
  Write-Host ""
  Write-Host "This may take a moment depending on your internet speed..." -ForegroundColor Yellow

  $ProgressPreference = 'SilentlyContinue'
  Invoke-WebRequest -Uri $Url -OutFile $OutputFile -UseBasicParsing

  if ((Get-Item -LiteralPath $OutputFile).Length -gt 1000000) {
    Write-Host "" 
    Write-Host "SUCCESS: eng.traineddata downloaded successfully!" -ForegroundColor Green
    Write-Host "  Size: $([math]::Round((Get-Item $OutputFile).Length / 1MB, 2)) MB" -ForegroundColor Green
    Write-Host "  Location: $OutputFile" -ForegroundColor Green
  } else {
    Write-Host ""
    Write-Host "WARNING: File downloaded but seems too small. Download may have failed." -ForegroundColor Red
    Write-Host "Please manually download from: $Url" -ForegroundColor Yellow
  }
} catch {
  Write-Host ""
  Write-Host "ERROR: Failed to download language data." -ForegroundColor Red
  Write-Host "  $_" -ForegroundColor Red
  Write-Host ""
  Write-Host "Manual download:" -ForegroundColor Yellow
  Write-Host "  1. Open: $Url" -ForegroundColor White
  Write-Host "  2. Save as: $OutputFile" -ForegroundColor White
  Write-Host "  3. Reload the extension in chrome://extensions/" -ForegroundColor White
}

Write-Host ""
Write-Host "After download, reload the extension in chrome://extensions/" -ForegroundColor Cyan
