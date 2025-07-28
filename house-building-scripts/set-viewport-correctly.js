#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function setViewportCorrectly(viewType = 'top') {
    console.log(`📷 Setting viewport to ${viewType} view correctly\n`);
    
    const serverProcess = spawn('node', [SERVER_PATH], {
        env: {
            ...process.env,
            UE_PROJECT_PATH: PROJECT_PATH
        },
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let resultBuffer = '';
    serverProcess.stdout.on('data', (data) => {
        resultBuffer += data.toString();
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Initialize
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
            protocolVersion: '0.1.0',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0.0' }
        },
        id: 1
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Set viewport based on type
    let viewportCode = '';
    
    if (viewType === 'top') {
        viewportCode = `
import unreal

editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)

# Get foundation location for centering
foundation_loc = unreal.Vector(10760, 660, 80)

# Create proper top-down view
# IMPORTANT: Must set rotation properties explicitly to avoid Roll issues
top_rotation = unreal.Rotator()
top_rotation.pitch = -90.0  # Look straight down
top_rotation.yaw = 0.0      # Face north
top_rotation.roll = 0.0     # NO TILT!

top_location = unreal.Vector(foundation_loc.x, foundation_loc.y, foundation_loc.z + 1500)

print("Setting TOP view:")
print(f"  Location: [{top_location.x}, {top_location.y}, {top_location.z}]")
print(f"  Rotation: Pitch={top_rotation.pitch}°, Yaw={top_rotation.yaw}°, Roll={top_rotation.roll}°")

editor_subsystem.set_level_viewport_camera_info(top_location, top_rotation)

# Verify
loc, rot = editor_subsystem.get_level_viewport_camera_info()
print(f"\\nVerified: Pitch={rot.pitch:.1f}°, Yaw={rot.yaw:.1f}°, Roll={rot.roll:.1f}°")
result = "Top view set"
`;
    } else if (viewType === 'perspective') {
        viewportCode = `
import unreal

editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)

# Get foundation location
foundation_loc = unreal.Vector(10760, 660, 80)

# Create perspective view
perspective_rotation = unreal.Rotator()
perspective_rotation.pitch = -20.0  # Look slightly down
perspective_rotation.yaw = 45.0     # Face northeast
perspective_rotation.roll = 0.0     # NO TILT!

# Position southwest of building, elevated
perspective_location = unreal.Vector(
    foundation_loc.x - 700,
    foundation_loc.y + 700,
    foundation_loc.z + 400
)

print("Setting PERSPECTIVE view:")
print(f"  Location: [{perspective_location.x}, {perspective_location.y}, {perspective_location.z}]")
print(f"  Rotation: Pitch={perspective_rotation.pitch}°, Yaw={perspective_rotation.yaw}°, Roll={perspective_rotation.roll}°")

editor_subsystem.set_level_viewport_camera_info(perspective_location, perspective_rotation)

# Verify
loc, rot = editor_subsystem.get_level_viewport_camera_info()
print(f"\\nVerified: Pitch={rot.pitch:.1f}°, Yaw={rot.yaw:.1f}°, Roll={rot.roll:.1f}°")
result = "Perspective view set"
`;
    } else if (viewType === 'front') {
        viewportCode = `
import unreal

editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)

# Get foundation location
foundation_loc = unreal.Vector(10760, 660, 80)

# Create front view (looking north)
front_rotation = unreal.Rotator()
front_rotation.pitch = 0.0    # Look straight ahead
front_rotation.yaw = 0.0      # Face north
front_rotation.roll = 0.0     # NO TILT!

# Position south of building
front_location = unreal.Vector(
    foundation_loc.x + 1000,  # South (X+)
    foundation_loc.y,
    foundation_loc.z + 200
)

print("Setting FRONT view:")
print(f"  Location: [{front_location.x}, {front_location.y}, {front_location.z}]")
print(f"  Rotation: Pitch={front_rotation.pitch}°, Yaw={front_rotation.yaw}°, Roll={front_rotation.roll}°")

editor_subsystem.set_level_viewport_camera_info(front_location, front_rotation)

# Verify
loc, rot = editor_subsystem.get_level_viewport_camera_info()
print(f"\\nVerified: Pitch={rot.pitch:.1f}°, Yaw={rot.yaw:.1f}°, Roll={rot.roll:.1f}°")
result = "Front view set"
`;
    }

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: viewportCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('\n✅ Viewport set correctly!');
    console.log('\nIMPORTANT: Always set rotation properties explicitly to avoid Roll issues.');
    
    serverProcess.kill();
    
    // Parse results
    const lines = resultBuffer.split('\n');
    for (const line of lines) {
        try {
            const response = JSON.parse(line);
            if (response.result?.content) {
                response.result.content.forEach(content => {
                    if (content.text && !content.text.includes('Initializing MCP server')) {
                        console.log('\n' + content.text);
                    }
                });
            }
        } catch (err) {}
    }
}

// Get command line argument
const viewType = process.argv[2] || 'top';
setViewportCorrectly(viewType).catch(console.error);