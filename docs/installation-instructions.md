# UEMCP Plugin Installation Instructions

## Prerequisites
1. Unreal Engine 5.6 installed
2. Your project must be able to open in Unreal Editor

## Installation Steps

### 1. First, verify your project opens without the plugin
- Open your project in Unreal Editor
- Make sure it loads successfully

### 2. Install the minimal plugin
```bash
# Copy the minimal plugin to your project
cp -r <PATH_TO_UEMCP>/plugin_minimal "<YOUR_UE_PROJECT>/Plugins/UEMCP"
```

### 3. Update your project file
Add this to your .uproject file's Plugins array:
```json
{
    "Name": "UEMCP",
    "Enabled": true
}
```

### 4. Open in Unreal Editor
- Open your project
- The plugin will compile automatically
- Check Output Log for: "UEMCP Module has started!"

## Verification
- Go to Edit → Plugins
- Search for "UEMCP"
- Verify it shows as enabled

## Troubleshooting

### If compilation fails:
1. Close Unreal Editor
2. Delete these folders:
   - `Plugins/UEMCP/Binaries`
   - `Plugins/UEMCP/Intermediate`
3. Regenerate project files
4. Try opening again

### If project won't open:
1. Remove the plugin reference from .uproject
2. Delete the Plugins/UEMCP folder
3. Open project without plugin
4. Try installation again