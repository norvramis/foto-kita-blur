



Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  AuraCam Desktop Setup (Embedded Python)    " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$workDir = (Get-Location).Path
$embedDir = Join-Path $workDir "python_embed"
$zipPath = Join-Path $workDir "python-embed.zip"
$pipScriptPath = Join-Path $workDir "get-pip.py"


if (-not (Test-Path $embedDir)) {
    Write-Host "Downloading Python 3.11.9 Embeddable Zip..." -ForegroundColor Yellow
    $downloadUrl = "https:
    
    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
        Write-Host "Extracting Python to local directory 'python_embed'..." -ForegroundColor Gray
        
        New-Item -ItemType Directory -Force -Path $embedDir | Out-Null
        Expand-Archive -Path $zipPath -DestinationPath $embedDir -Force
        
        Remove-Item $zipPath -ErrorAction SilentlyContinue
        Write-Host "Extraction complete." -ForegroundColor Green
    } catch {
        Write-Host "Error setting up embedded Python zip: $_" -ForegroundColor Red
        if (Test-Path $zipPath) { Remove-Item $zipPath -ErrorAction SilentlyContinue }
        Exit 1
    }
} else {
    Write-Host "Found existing local 'python_embed' folder. Reusing it." -ForegroundColor Green
}


Write-Host "Configuring Python path (enabling site-packages)..." -ForegroundColor Cyan
$pthFile = Join-Path $embedDir "python311._pth"
if (Test-Path $pthFile) {
    
    $pthContent = @(
        "python311.zip",
        ".",
        "import site"
    )
    $pthContent | Out-File -FilePath $pthFile -Encoding ascii -Force
    Write-Host "Python path configured successfully." -ForegroundColor Green
} else {
    Write-Host "Warning: python311._pth file not found in embed directory. Pip might not work." -ForegroundColor Yellow
}


$pipCheck = Join-Path $embedDir "Scripts\pip.exe"
if (-not (Test-Path $pipCheck)) {
    Write-Host "Downloading pip installer..." -ForegroundColor Yellow
    $pipUrl = "https:
    
    try {
        Invoke-WebRequest -Uri $pipUrl -OutFile $pipScriptPath -UseBasicParsing
        Write-Host "Installing pip..." -ForegroundColor Gray
        
        $pythonExe = Join-Path $embedDir "python.exe"
        
        $process = Start-Process -FilePath $pythonExe -ArgumentList "$pipScriptPath --no-warn-script-location" -Wait -NoNewWindow -PassThru
        
        Remove-Item $pipScriptPath -ErrorAction SilentlyContinue
        
        if ($process.ExitCode -eq 0) {
            Write-Host "Pip setup complete." -ForegroundColor Green
        } else {
            Write-Host "Pip installer returned exit code: $($process.ExitCode)" -ForegroundColor Red
            Exit 1
        }
    } catch {
        Write-Host "Error setting up pip: $_" -ForegroundColor Red
        if (Test-Path $pipScriptPath) { Remove-Item $pipScriptPath -ErrorAction SilentlyContinue }
        Exit 1
    }
} else {
    Write-Host "Pip is already configured." -ForegroundColor Green
}


Write-Host "Installing MediaPipe and Virtual Camera utilities..." -ForegroundColor Cyan
$pythonExe = Join-Path $embedDir "python.exe"



$pipArgs = "-m pip install mediapipe pyvirtualcam"
$process = Start-Process -FilePath $pythonExe -ArgumentList $pipArgs -Wait -NoNewWindow -PassThru

if ($process.ExitCode -eq 0) {
    Write-Host "Dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "Pip failed to install dependencies. Exit code: $($process.ExitCode)" -ForegroundColor Red
    Exit 1
}


Write-Host "Generating double-click run shortcut (run.bat)..." -ForegroundColor Cyan
$batContent = @"
@echo off
cd /d "%~dp0"
taskkill /f /im pythonw.exe >nul 2>&1
taskkill /f /im python.exe >nul 2>&1
start "" "python_embed\pythonw.exe" cam.py
exit
"@
$batContent | Out-File -FilePath "run.bat" -Encoding ascii -Force
Write-Host "Created run.bat!" -ForegroundColor Green

Write-Host "=============================================" -ForegroundColor Green
Write-Host "  Setup completed! You can now run run.bat.  " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
