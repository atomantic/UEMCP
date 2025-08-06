# Environment Setup Guide

## Environment Variables

UEMCP supports the following environment variables for configuration:

### Required Variables

```bash
# Path to your Unreal Engine project
export UE_PROJECT_PATH="/path/to/your/unreal/project"

# Example:
export UE_PROJECT_PATH="$HOME/Documents/Unreal Projects/MyProject"
```

### Optional Variables

```bash
# Path to Unreal Engine installation (if not in default location)
export UE_INSTALL_LOCATION="/path/to/unreal/engine"

# Enable debug logging
export DEBUG="uemcp:*"

# Python executable (if not using system python3)
export PYTHON_EXECUTABLE="/path/to/python3"
```

## Setting Environment Variables

### macOS/Linux

Add to your shell profile (`~/.zshrc`, `~/.bashrc`, or `~/.bash_profile`):

```bash
# UEMCP Configuration
export UE_PROJECT_PATH="$HOME/Documents/Unreal Projects/MyProject"
export UE_INSTALL_LOCATION="/Applications/Epic Games/UE_5.6"
export DEBUG="uemcp:*"
```

Then reload your shell:
```bash
source ~/.zshrc  # or ~/.bashrc
```

### Windows

Using Command Prompt:
```cmd
setx UE_PROJECT_PATH "C:\Users\%USERNAME%\Documents\Unreal Projects\MyProject"
setx UE_INSTALL_LOCATION "C:\Program Files\Epic Games\UE_5.6"
```

Using PowerShell:
```powershell
[Environment]::SetEnvironmentVariable("UE_PROJECT_PATH", "$env:USERPROFILE\Documents\Unreal Projects\MyProject", "User")
[Environment]::SetEnvironmentVariable("UE_INSTALL_LOCATION", "C:\Program Files\Epic Games\UE_5.6", "User")
```

## Verifying Environment

Test your environment setup:

```bash
# Check variables are set
echo $UE_PROJECT_PATH
echo $UE_INSTALL_LOCATION

# Test UEMCP with environment
cd <PATH_TO_UEMCP>
npm test
```

## Using with Test Scripts

All test scripts will automatically use these environment variables:

```bash
# Run tests with your project
node test-uemcp-simple.js

# Override for a specific test
UE_PROJECT_PATH="/another/project" node test-mcp-integration.js
```