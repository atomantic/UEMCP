# UEMCP Quick Reference

## Coordinate System
```
        NORTH (X-)
           ↑
EAST ←─────┼─────→ WEST  
(Y-)       │      (Y+)
           ↓
        SOUTH (X+)
```

## Cardinal Directions
- **NW**: X- Y+ (Northwest)
- **NE**: X- Y- (Northeast)  
- **SE**: X+ Y- (Southeast)
- **SW**: X+ Y+ (Southwest)

## Rotations [Roll, Pitch, Yaw]
- **[0, 0, 0]**: Default (no rotation)
- **[0, 0, 90]**: 90° clockwise (Yaw)
- **[0, 0, -90]**: 90° counter-clockwise
- **[0, 0, 180]**: 180° rotation

## Corner Rotations (Sharp Angle Out)
- **NW**: Yaw = 180°
- **NE**: Yaw = -90°
- **SE**: Yaw = 0°
- **SW**: Yaw = 90°

## Camera Views
**Top-down**: `[-90, 0, 0]` (Pitch=-90)  
**Isometric**: `[-30, 45, 0]`  
**Front**: `[0, 0, 0]`

## Naming Convention
- Corners: `Corner_F1_NW`
- Walls: `Wall_Front_1`
- Doors: `Door_Front_1`
- Windows: `Window_East_1`

## Python Commands
```python
# Restart listener
restart_listener()

# Check status
status()

# Save level
unreal.EditorLevelLibrary.save_current_level()
```

## Common Asset Sizes
- Corner: 100×100×282
- Wall 3m: 300×100×282
- Wall 2m: 200×100×282
- Floor: 100×100×7

## Tips
- Assets use CENTER pivots
- Use wireframe for debugging
- Keep Roll at 0 (no tilt)
- Save level frequently