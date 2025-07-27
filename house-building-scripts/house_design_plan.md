# House Design Plan

## Design Parameters
- **Foundation Location**: Already placed in scene
- **Grid Unit**: 100cm (1 meter)
- **Wall Height**: 282cm per floor
- **Wall Thickness**: ~100cm

## House Dimensions
- **Total Size**: 10m x 8m (1000cm x 800cm)
- **Floors**: 2 stories + roof
- **Foundation Center**: Assuming at (0, 0, 0) - will adjust based on actual foundation

## Asset Selection

### Ground Floor Components:
1. **Corners** (SM_FlatWall_1m_Corner): 100 x 100 x 282 cm
   - 4 pieces needed

2. **Long Walls** (SM_FlatWall_3m): 300 x 100 x 282 cm
   - Front/Back: 2 pieces each side (600cm coverage + corners = 800cm)
   - Total: 4 pieces

3. **Side Walls** (SM_FlatWall_3m + SM_FlatWall_2m):
   - Each side: 1x 3m + 1x 2m + 1x 2m = 700cm + corners = 900cm
   - Total: 2x 3m pieces, 4x 2m pieces

4. **Door** (SM_FlatWall_3m_Door_Square): 300 x 100 x 282 cm
   - 1 piece for front entrance

5. **Windows** (SM_FlatWall_2m_Window_Square): 200 x 100 x 282 cm
   - 2 pieces (one per side)

### Second Floor:
- **Floor/Ceiling** (SM_Floor_1m): Multiple 100x100cm pieces
- Same wall configuration as ground floor but with more windows

### Roof:
- **SM_Roof_3m_Top**: For main coverage
- **SM_Roof_Corner_Out**: For corner connections

## Coordinate Calculation

Starting from foundation center at (X, Y, Z):

### Ground Floor Layout:
```
Front Wall (Y = -400):
- Left Corner:    X = -500, Y = -400
- Left Wall:      X = -400 to -100, Y = -400
- Door:           X = -100 to +200, Y = -400
- Right Wall:     X = +200 to +500, Y = -400
- Right Corner:   X = +500, Y = -400

Back Wall (Y = +400):
- Similar layout but with windows instead of door

Left Wall (X = -500):
- Front to Back coverage

Right Wall (X = +500):
- Front to Back coverage
```

## Rotation Rules
- Default orientation (0°): Wall runs along X-axis
- 90° rotation: Wall runs along Y-axis
- Corners need specific rotations based on position