# UEMCP Initialization Script for Windows
# This script sets up UEMCP for immediate use with Claude Code

$ErrorActionPreference = "Stop"

# Script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Colors
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║        UEMCP Initialization            ║" -ForegroundColor Blue
Write-Host "║   Unreal Engine MCP Server Setup       ║" -ForegroundColor Blue
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# Function to check if a command exists
function Test-Command($command) {
    try {
        if (Get-Command $command -ErrorAction SilentlyContinue) {
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-Command "node")) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/"
    exit 1
}
$nodeVersion = node --version
Write-Host "✓ Node.js $nodeVersion" -ForegroundColor Green

if (-not (Test-Command "npm")) {
    Write-Host "❌ npm is not installed!" -ForegroundColor Red
    exit 1
}
$npmVersion = npm --version
Write-Host "✓ npm $npmVersion" -ForegroundColor Green

$pythonAvailable = $false
if (Test-Command "python") {
    $pythonVersion = python --version 2>$null
    if ($pythonVersion -match "Python 3") {
        Write-Host "✓ $pythonVersion" -ForegroundColor Green
        $pythonAvailable = $true
    }
} elseif (Test-Command "python3") {
    $pythonVersion = python3 --version
    Write-Host "✓ $pythonVersion" -ForegroundColor Green
    $pythonAvailable = $true
} else {
    Write-Host "⚠ Python 3 not found. Some features may be limited." -ForegroundColor Yellow
}

# Install Node dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
Set-Location "$ScriptDir\server"
npm install --silent

# Build the server
Write-Host ""
Write-Host "Building MCP server..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Server built successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Install Python dependencies if Python is available
if ($pythonAvailable) {
    Write-Host ""
    Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
    Set-Location $ScriptDir
    if (Test-Path "requirements-dev.txt") {
        if (Test-Command "python") {
            python -m pip install -r requirements-dev.txt --quiet
        } else {
            python3 -m pip install -r requirements-dev.txt --quiet
        }
        Write-Host "✓ Python dependencies installed" -ForegroundColor Green
    }
}

# Configure Claude
Write-Host ""
Write-Host "Configuring Claude integration..." -ForegroundColor Yellow

# Find Claude config directory
$claudeConfigDir = "$env:APPDATA\Claude"
if (-not (Test-Path $claudeConfigDir)) {
    # Try alternative locations
    $alternativePaths = @(
        "$env:LOCALAPPDATA\Claude",
        "$env:USERPROFILE\.config\claude"
    )
    
    foreach ($path in $alternativePaths) {
        if (Test-Path $path) {
            $claudeConfigDir = $path
            break
        }
    }
}

# Create config directory if it doesn't exist
New-Item -ItemType Directory -Force -Path $claudeConfigDir | Out-Null

# Check if config already exists
$configFile = Join-Path $claudeConfigDir "claude_desktop_config.json"
$backupMade = $false

if (Test-Path $configFile) {
    Write-Host "Found existing Claude config. Creating backup..." -ForegroundColor Yellow
    $backupName = "claude_desktop_config.json.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item $configFile (Join-Path $claudeConfigDir $backupName)
    $backupMade = $true
    
    # Read existing config
    $existingConfig = Get-Content $configFile | ConvertFrom-Json
    
    # Add or update UEMCP server
    if (-not $existingConfig.mcpServers) {
        $existingConfig | Add-Member -NotePropertyName "mcpServers" -NotePropertyValue @{} -Force
    }
    
    $serverPath = "$ScriptDir\server\dist\index.js".Replace('\', '/')
    $existingConfig.mcpServers.uemcp = @{
        command = "node"
        args = @($serverPath)
        env = @{
            DEBUG = "uemcp:*"
        }
    }
    
    # Save updated config
    $existingConfig | ConvertTo-Json -Depth 10 | Set-Content $configFile
    Write-Host "✓ Updated Claude configuration" -ForegroundColor Green
} else {
    # Create new config
    $serverPath = "$ScriptDir\server\dist\index.js".Replace('\', '/')
    $newConfig = @{
        mcpServers = @{
            uemcp = @{
                command = "node"
                args = @($serverPath)
                env = @{
                    DEBUG = "uemcp:*"
                }
            }
        }
    }
    
    $newConfig | ConvertTo-Json -Depth 10 | Set-Content $configFile
    Write-Host "✓ Created Claude configuration" -ForegroundColor Green
}

# Ask about UE project path
Write-Host ""
Write-Host "Unreal Engine Project Setup" -ForegroundColor Yellow
$ueProjectPath = Read-Host "Enter the path to your Unreal Engine project (or press Enter to set up later)"

if ($ueProjectPath) {
    # Expand environment variables
    $ueProjectPath = [Environment]::ExpandEnvironmentVariables($ueProjectPath)
    
    # Verify the path exists
    if (Test-Path $ueProjectPath) {
        # Update Claude config with project path
        $config = Get-Content $configFile | ConvertFrom-Json
        $config.mcpServers.uemcp.env.UE_PROJECT_PATH = $ueProjectPath
        $config | ConvertTo-Json -Depth 10 | Set-Content $configFile
        Write-Host "✓ Project path configured" -ForegroundColor Green
    } else {
        Write-Host "❌ Directory not found: $ueProjectPath" -ForegroundColor Red
        Write-Host "You can set this later with: `$env:UE_PROJECT_PATH = `"C:\path\to\project`"" -ForegroundColor Yellow
    }
}

# Create a test script
Write-Host ""
Write-Host "Creating test script..." -ForegroundColor Yellow
@"
@echo off
cd /d "%~dp0"
echo Testing UEMCP connection...
node test-uemcp-simple.js
pause
"@ | Set-Content "$ScriptDir\test-connection.bat"

# Final summary
Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Green
Write-Host "✨ UEMCP Initialization Complete! ✨" -ForegroundColor Green
Write-Host "════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration Summary:" -ForegroundColor Blue
Write-Host "  • Server Location: $ScriptDir\server\dist\index.js"
Write-Host "  • Claude Config: $configFile"
if ($backupMade) {
    Write-Host "  • Config Backup: Created in config directory"
}
if ($ueProjectPath) {
    Write-Host "  • UE Project: $ueProjectPath"
}
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Blue
Write-Host "  1. Restart Claude Desktop to load the new configuration" -ForegroundColor Yellow
Write-Host "  2. In a new Claude conversation, say: `"List available UEMCP tools`"" -ForegroundColor Green
Write-Host "  3. To test locally: .\test-connection.bat" -ForegroundColor Green
Write-Host ""
if (-not $ueProjectPath) {
    Write-Host "Don't forget to set your UE project path:" -ForegroundColor Yellow
    Write-Host "  `$env:UE_PROJECT_PATH = `"C:\path\to\your\unreal\project`""
    Write-Host ""
}
Write-Host "Documentation:" -ForegroundColor Blue
Write-Host "  • Quick Start: docs\quickstart.md"
Write-Host "  • Environment Setup: docs\environment-setup.md"
Write-Host "  • Troubleshooting: docs\troubleshooting.md"
Write-Host ""
Write-Host "Happy coding with UEMCP! 🚀" -ForegroundColor Green

# Return to original directory
Set-Location $ScriptDir