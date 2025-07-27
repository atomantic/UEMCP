# House Placement Issues Analysis

Looking at the scattered components in the image, several critical issues are apparent:

## Problems Identified

### 1. Pivot Point Assumptions
- **Issue**: Assumed pivot points were at corners, but they're likely at centers
- **Impact**: All pieces are offset by half their dimensions
- **Fix**: Need to adjust all coordinates by half-width/half-depth

### 2. Wall-to-Corner Connections
- **Issue**: Walls and corners aren't connecting properly
- **Evidence**: Gaps between all pieces in the image
- **Fix**: Need to understand exact corner piece geometry

### 3. Coordinate System
- **Issue**: May have misunderstood how UE places actors
- **Fix**: Need to verify pivot points and bounding boxes

### 4. Wall Overlap
- **Issue**: Front/back walls span the full width, overlapping with corners
- **Fix**: Walls should be shorter to account for corner pieces

## Correct Approach

### Understanding Modular Pieces
1. **Corner pieces**: 100x100cm L-shaped pieces
2. **Wall pieces**: 200/300cm wide, ~100cm thick
3. **Pivot points**: At geometric center of each piece

### Revised Calculation Method

For a 10m x 8m house:
- Outer dimensions: 1000cm x 800cm
- Corner pieces: 100x100cm at each corner
- Wall segments fill the gaps between corners

#### Front Wall (Y-axis aligned)
- Total length: 1000cm
- Minus corners: 1000 - 200 = 800cm to fill
- Options: Use 2x 300cm + 1x 200cm pieces

#### Side Walls (X-axis aligned)
- Total length: 800cm
- Minus corners: 800 - 200 = 600cm to fill
- Options: Use 2x 300cm pieces

### New Coordinate Calculation

Assuming pivot at center:
- Corner at "position" (X,Y) means its center is at (X,Y)
- A 100x100 corner extends ±50 in each direction

Example for front-left corner at desired corner position (0,0):
- Place corner piece at (50, 50) so it extends from (0,0) to (100,100)