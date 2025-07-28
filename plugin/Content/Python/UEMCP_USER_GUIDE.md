# UEMCP User Guide

## Overview

UEMCP (Unreal Engine Model Context Protocol) is a plugin that allows AI assistants to interact with Unreal Engine through a Python-based API. This guide covers essential concepts and best practices for using UEMCP effectively.

## Quick Start

1. Ensure the UEMCP plugin is enabled in your project
2. The Python listener starts automatically when you open your project
3. Connect your AI assistant (like Claude) using the MCP server configuration

## Coordinate System & Cardinal Directions

### Unreal Engine's World Coordinates
**Note**: UE's coordinate system is counterintuitive!
- **X- = NORTH** (X decreases going North)
- **X+ = SOUTH** (X increases going South)
- **Y- = EAST** (Y decreases going East)
- **Y+ = WEST** (Y increases going West)
- **Z+ = UP** (positive Z direction)

### Cardinal Direction Naming Convention
When naming actors with cardinal directions (e.g., corners of a building):
- **NW (Northwest)**: X-, Y+ quadrant
- **NE (Northeast)**: X-, Y- quadrant
- **SE (Southeast)**: X+, Y- quadrant
- **SW (Southwest)**: X+, Y+ quadrant

Example: If your building foundation is at [10760, 660, 80]:
- NW corner would be at approximately [10260, 1060]
- NE corner would be at approximately [10260, 260]
- SE corner would be at approximately [11260, 260]
- SW corner would be at approximately [11260, 1060]

## Rotation System

### Understanding Rotator Values
Unreal Engine uses [Roll, Pitch, Yaw] for rotations:
- **Roll**: Rotation around the forward X axis (tilting sideways)
- **Pitch**: Rotation around the right Y axis (looking up/down)
- **Yaw**: Rotation around the up Z axis (turning left/right)

### Common Rotations for Building
- `[0, 0, 0]` - No rotation (default orientation)
- `[0, 0, 90]` - Rotate 90° clockwise around Z axis
- `[0, 0, -90]` - Rotate 90° counter-clockwise around Z axis
- `[0, 0, 180]` - Rotate 180° around Z axis

### Corner Piece Orientations
For modular corner pieces with their sharp angle pointing outward:
- **NW corner**: Yaw = 180° (sharp angle points northwest)
- **NE corner**: Yaw = -90° (sharp angle points northeast)
- **SE corner**: Yaw = 0° (sharp angle points southeast)
- **SW corner**: Yaw = 90° (sharp angle points southwest)

## Working with Modular Assets

### Actor Pivot Points
Most modular assets use **center pivot points**, not corner pivots. This means:
- A 300x100 wall at position [X, Y] extends from [X-150, Y-50] to [X+150, Y+50]
- Always account for half-dimensions when calculating positions

### Typical Modular Dimensions
| Asset Type | Dimensions (cm) | Grid Size |
|------------|-----------------|-----------|
| Corner | 100 x 100 x 282 | 1m x 1m |
| Wall 2m | 200 x 100 x 282 | 2m x 1m |
| Wall 3m | 300 x 100 x 282 | 3m x 1m |
| Floor Tile | 100 x 100 x 7 | 1m x 1m |

### Placement Best Practices
1. **Use exact grid positions** - Modular assets typically snap to 100cm (1m) grid
2. **Check alignment in wireframe mode** - Reveals gaps and overlaps clearly
3. **Verify from multiple angles** - Top-down and perspective views
4. **Name actors descriptively** - e.g., `Wall_Front_1`, `Corner_F1_NW`

## Viewport Camera Control

### Camera Positioning
The viewport camera uses [Location, Rotation] where:
- Location: [X, Y, Z] position in world space
- Rotation: [Roll, Pitch, Yaw] in degrees

### Common Camera Views
```python
# Top-down view
camera_location = [X, Y, 1500]  # High above target
camera_rotation = [0, -90, 0]   # Pitch=-90, looking straight down

# Isometric view
camera_location = [X-500, Y-500, 800]
camera_rotation = [-30, 45, 0]  # Pitched down, turned northeast

# Front view
camera_location = [X, Y-1000, 300]
camera_rotation = [0, 0, 0]     # Looking straight ahead
```

**Important**: Keep Roll at 0 for normal viewing. Non-zero Roll creates a tilted horizon!

## Actor Organization

### Recommended Folder Structure
```
Estate/
└── House/
    ├── GroundFloor/
    │   ├── Walls/
    │   ├── Corners/
    │   ├── Doors/
    │   └── Windows/
    ├── SecondFloor/
    │   ├── Walls/
    │   ├── Corners/
    │   └── Floor/
    └── Roof/
        ├── Base/
        └── Details/
```

### Naming Conventions
- **Floors**: `F1` (ground floor), `F2` (second floor), etc.
- **Walls**: `Wall_[Side]_[Number]` (e.g., `Wall_Front_1`)
- **Corners**: `Corner_F[Floor]_[Cardinal]` (e.g., `Corner_F1_NW`)
- **Doors**: `Door_[Location]_[Number]` (e.g., `Door_Front_1`)
- **Windows**: `Window_[Side]_[Number]` (e.g., `Window_East_1`)

## Debugging Tips

### Screenshot Optimization
For cleaner debugging screenshots:
1. Switch to wireframe mode: Shows structure clearly
2. Use top-down view: Best for checking alignment
3. Reduce resolution: Smaller files, faster processing

### Common Issues and Solutions

**Gaps between modular pieces:**
- Check that positions account for center pivots
- Verify exact grid alignment (multiples of 100)
- Use wireframe mode to see gaps clearly

**Wrong corner orientations:**
- Remember: sharp angle should point outward
- SE corner should have Yaw=0°
- Use the rotation guide above

**Actors not appearing where expected:**
- Verify coordinate system understanding (X=East/West, Y=North/South)
- Check actor pivot point (usually center, not corner)
- Ensure Z height is correct for the floor level

## Python Console Commands

Quick commands for the UE Python console:

```python
# Restart the UEMCP listener (hot reload)
from uemcp_helpers import *
restart_listener()

# Check listener status
status()

# List all actors in level
import unreal
actors = unreal.EditorLevelLibrary.get_all_level_actors()
for actor in actors:
    print(actor.get_actor_label())
```

## Performance Tips

1. **Batch operations** when possible instead of individual actor operations
2. **Use specific filters** when listing actors to reduce data transfer
3. **Optimize screenshots** by using lower resolution and wireframe mode
4. **Save the level regularly** to preserve your work

## Troubleshooting

### Listener Connection Issues
If the AI assistant can't connect:
1. Check if listener is running: `status()` in Python console
2. Restart if needed: `restart_listener()`
3. Verify port 8765 is not blocked by firewall

### Actor Spawn Issues
If actors spawn with generic names:
1. The actor name must be set after spawning
2. Use meaningful names following the naming convention
3. Organize in appropriate folders immediately

### Visual Verification
Always verify your construction:
1. Take screenshots from multiple angles
2. Use wireframe mode to check connections
3. Focus viewport on specific actors to inspect details

---

For more detailed information, refer to the UEMCP documentation or contact support.