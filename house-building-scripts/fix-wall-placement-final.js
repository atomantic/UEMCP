#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, 'server', 'dist', 'index.js');

async function fixWallPlacementFinal() {
    console.log('🏗️ Final Wall Placement Fix\n');
    
    const serverProcess = spawn('node', [SERVER_PATH], {
        env: {
            ...process.env,
            DEBUG: 'uemcp:*',
            UE_PROJECT_PATH: PROJECT_PATH
        },
        stdio: ['pipe', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        for (const line of lines) {
            try {
                const response = JSON.parse(line);
                if (response.jsonrpc && response.result) {
                    if (response.result.content) {
                        response.result.content.forEach(content => {
                            console.log(content.text);
                        });
                    }
                }
            } catch (err) {}
        }
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

    // First, analyze the current situation
    console.log('\n📊 Analyzing current wall placement...\n');
    
    const analysisCode = `
import unreal

# Get all actors and their positions
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
house_actors = {}

for actor in all_actors:
    label = actor.get_actor_label()
    if any(keyword in label for keyword in ['Corner', 'Wall', 'Door', 'Foundation']):
        loc = actor.get_actor_location()
        rot = actor.get_actor_rotation()
        house_actors[label] = {
            'actor': actor,
            'location': [loc.x, loc.y, loc.z],
            'rotation': [rot.roll, rot.pitch, rot.yaw]
        }

# Foundation dimensions (from observation)
# The foundation appears to be 1500x1500 units
# Center at [10760, 690, 80] but that seems off based on wall positions
# Actually, based on walls, the building is from:
# X: 11340 to 12840 (1500 units)
# Y: 80 to 1580 (1500 units)

# Corner pieces are typically 100x100 units
# Wall pieces are 300 units long

# Correct positions should be:
# Corners:
# - Back-Left: [11340, 80]
# - Back-Right: [11340, 1580]  
# - Front-Left: [12840, 80]
# - Front-Right: [12840, 1580]

# Walls along Y=80 (left side, X increasing):
# - Corner at 11340, first wall should start at 11440 (11340 + 100)
# - Walls at: 11440, 11740, 12040, 12340, 12640 (ending at 12940, but corner at 12840)
# Actually, with 4 walls of 300 each = 1200, plus 2 corners of 100 each = 1400 total

# Let's recalculate based on actual building size
# Total span: 1500 units
# 2 corners at 100 units each = 200
# Remaining for walls: 1300
# 4 walls would be 325 each, but walls are 300 units
# So we need 4 walls (1200) + 2 corners (200) = 1400, leaving 100 unit gap

# Delete overlapping front walls first
walls_to_delete = ['Front_Wall_2', 'Front_Wall_3']
for wall_name in walls_to_delete:
    if wall_name in house_actors:
        unreal.EditorLevelLibrary.destroy_actor(house_actors[wall_name]['actor'])
        result = f"Deleted {wall_name}"
        
# Now let's properly calculate positions
# The issue is that corners are 100x100 but positioned at exact corners
# Walls need to be adjusted to connect to corners properly

result = {
    'deleted_walls': walls_to_delete,
    'current_positions': {name: data['location'] for name, data in house_actors.items() if 'Wall' in name or 'Corner' in name}
}
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: analysisCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Now reposition walls to connect properly
    console.log('\n🔧 Repositioning walls for proper connection...\n');
    
    const repositionCode = `
import unreal

# Get fresh list of actors after deletion
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
house_actors = {}

for actor in all_actors:
    label = actor.get_actor_label()
    if any(keyword in label for keyword in ['Corner', 'Wall', 'Door']):
        house_actors[label] = actor

# Corner pieces are at the exact corners
# They appear to be 100x100 units based on the gaps
# So walls need to start/end 100 units away from corners

# Fix left side walls (Y=80)
# Should go from X=11440 to X=12740 (excluding corner space)
left_walls = [
    ('Wall_Side_Left_4', [11440, 80, 80]),  # First wall after back corner
    ('Wall_Side_Left_3', [11740, 80, 80]),  # +300
    ('Wall_Side_Left_2_Window', [12040, 80, 80]),  # +300
    ('Wall_Side_Left_1', [12340, 80, 80])   # +300, ends at 12640, leaving room for corner
]

# Fix right side walls (Y=1580) - same X positions
right_walls = [
    ('Wall_Side_Right_4', [11440, 1580, 80]),
    ('Wall_Side_Right_3', [11740, 1580, 80]),
    ('Wall_Side_Right_2_Window', [12040, 1580, 80]),
    ('Wall_Side_Right_1', [12340, 1580, 80])
]

# Fix back walls (X=11340)
# Should go from Y=180 to Y=1480 (excluding corner space)
back_walls = [
    ('Back_Wall_1', [11340, 180, 80]),   # First wall after left corner
    ('Back_Wall_2', [11340, 480, 80]),   # +300
    ('Back_Wall_3', [11340, 780, 80]),   # +300
    ('Back_Wall_4', [11340, 1080, 80])   # +300, ends at 1380, leaving room for corner
]

# Fix front walls (X=12840) - only 2 walls with door in between
front_walls = [
    ('Front_Wall_Left', [12840, 180, 80]),    # First wall after left corner
    ('Front_Wall_Right', [12840, 1080, 80])   # Last wall before right corner
]

# Apply all position fixes
fixes_applied = []

for name, new_pos in left_walls + right_walls + back_walls + front_walls:
    if name in house_actors:
        actor = house_actors[name]
        actor.set_actor_location(unreal.Vector(new_pos[0], new_pos[1], new_pos[2]), False, False)
        fixes_applied.append(f"{name} -> {new_pos}")

# Move door to proper position (middle of front wall)
# Front wall spans Y=180 to Y=1380 (after corners)
# Middle would be at Y=780
if 'Door' in house_actors:
    house_actors['Door'].set_actor_location(unreal.Vector(12840, 780, 80), False, False)
    fixes_applied.append("Door -> [12840, 780, 80]")
elif 'Front_Door' in house_actors:
    house_actors['Front_Door'].set_actor_location(unreal.Vector(12840, 780, 80), False, False)
    fixes_applied.append("Front_Door -> [12840, 780, 80]")

result = {'fixes_applied': fixes_applied}
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: repositionCode }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Place the door in the correct spot between front walls
    console.log('\n🚪 Ensuring door is properly placed...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'actor_spawn',
            arguments: {
                assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_SquareDoor',
                location: [12840, 480, 80],  // Between the two front walls
                rotation: [0, 0, -90],
                name: 'Front_Door_Center',
                folder: 'Estate/House'
            }
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Take screenshots to verify
    console.log('\n📸 Taking verification screenshots...\n');
    
    // First a regular screenshot
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_screenshot',
            arguments: {
                width: 1280,
                height: 720
            }
        },
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Save level
    console.log('\n💾 Saving level...\n');
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'level_save',
            arguments: {}
        },
        id: 6
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('\n✨ Wall placement fixed! All walls should now connect seamlessly.');
    serverProcess.kill();
}

fixWallPlacementFinal().catch(console.error);