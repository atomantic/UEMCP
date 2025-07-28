# House Building Plan - Based on Old Town Analysis

## Key Findings from Old Town

### Building System
- **Grid**: Everything aligns to 100-unit grid
- **Wall Modules**: 300 units (3m) and 200 units (2m) wide
- **Corner Pieces**: 100 units (1m) for tight connections
- **Floor Height**: 300-400 units between floors

### Available Wall Assets
1. **Basic Walls**:
   - `SM_FlatStoneWall_3m` - Plain 3m wall
   - `SM_FlatStoneWall_2m` - Plain 2m wall
   - `SM_FlatStoneWall_1m_Corner` - Corner connector

2. **Walls with Features**:
   - `SM_FlatStoneWall_3m_ArchedWin` - Wall with arched window
   - `SM_FlatStoneWall_3m_Gate` - Wall with gate/door
   - `SM_FlatStoneWall_3m_ArchedDoor` - Wall with arched door
   - `SM_FlatStoneWall_3m_ArchedDoorWin` - Wall with door AND window

3. **Special Pieces**:
   - `SM_FlatStoneWall_3m_RoofWall` - For roof level
   - `SM_FlatStoneWall_3m_BigArch` - Large archway

## Our Current House Status

### Foundation
- Location: [10760, 660, 80]
- Size: 1000x1100 units (10x11 meters)

### Existing Corners (Ground Floor)
- NE: [10260, 110, 110] - Rotation: -90°
- SE: [11260, 110, 110] - Rotation: 0°
- SW: [11260, 1210, 110] - Rotation: 90°
- NW: [10260, 1210, 110] - Rotation: 180°

### Second Floor Started
- NW Corner at [10260, 1210, 410]

## Building Enhancement Plan

### Phase 1: Complete Ground Floor Walls
1. **North Wall** (East-West at Y=110)
   - 3x `SM_FlatStoneWall_3m` between corners
   - Positions: X=10460, 10760, 11060
   - Rotation: 0° (facing south)

2. **South Wall** (East-West at Y=1210)
   - 2x `SM_FlatStoneWall_3m` 
   - 1x `SM_FlatStoneWall_3m_Gate` (main entrance)
   - Positions: X=10460, 10760 (door), 11060
   - Rotation: 180° (facing north)

3. **East Wall** (North-South at X=11260)
   - 3x `SM_FlatStoneWall_3m` with windows
   - Positions: Y=310, 610, 910
   - Rotation: -90° (facing west)

4. **West Wall** (North-South at X=10260)
   - 3x `SM_FlatStoneWall_3m` with windows
   - Positions: Y=310, 610, 910
   - Rotation: 90° (facing east)

### Phase 2: Add Ground Floor Details
1. **Windows**: Use `SM_FlatStoneWall_3m_ArchedWin` on east/west walls
2. **Main Door**: Use `SM_FlatStoneWall_3m_Gate` on south wall
3. **Interior Walls**: Optional room divisions

### Phase 3: Complete Second Floor
1. **Corners**: Place remaining 3 corners at Z=410
2. **Walls**: Similar pattern but with more windows
3. **Balcony**: Consider adding balcony on south side

### Phase 4: Roof Structure
1. **Roof Walls**: Use `SM_FlatStoneWall_3m_RoofWall`
2. **Roof Tiles**: Find appropriate roof assets
3. **Chimney**: Add if available

## Wall Placement Formula

For walls between corners:
- **Wall Center = Corner Position + (Wall Width / 2) + (Corner Width / 2)**
- Corner is 100 units, Wall is 300 units
- So: Wall Center = Corner + 200 units

Example:
- NW Corner at X=10260
- First wall center: 10260 + 200 = 10460
- Second wall center: 10460 + 300 = 10760
- Third wall center: 10760 + 300 = 11060
- SE Corner at X=11260 (11060 + 200 = 11260 ✓)

## Next Steps
1. Implement Phase 1 (ground floor walls)
2. Take screenshots to verify alignment
3. Adjust and add details
4. Continue with upper floors