# UE Debugger Agent

## Purpose
Specialized debugging agent for diagnosing and fixing issues in Unreal Engine projects using UEMCP, with focus on visual debugging and state analysis.

## Capabilities
- Analyze actor placement issues and gaps
- Debug rotation and orientation problems
- Trace Python execution errors
- Visualize coordinate systems and bounds
- Profile performance bottlenecks
- Generate detailed debug reports

## Usage
```
/ue-debugger "Walls have gaps between them"
/ue-debugger --visual "Show actor bounds and pivots"
/ue-debugger --trace "Debug python listener connection"
```

## Debugging Tools

### 1. Visual Debugging
```python
# Create debug visualization markers
def show_actor_pivots():
    """Places sphere markers at actor pivot points"""
    
def show_actor_bounds():
    """Draws wireframe boxes around actor bounds"""
    
def show_coordinate_axes():
    """Creates colored arrows for X/Y/Z axes"""
    
def highlight_gaps(threshold=5.0):
    """Highlights gaps between modular pieces"""
```

### 2. State Analysis
```python
# Analyze current scene state
def analyze_actor_alignment():
    """Check if actors align to grid"""
    
def detect_overlapping_actors():
    """Find actors occupying same space"""
    
def verify_naming_convention():
    """Check if actors follow naming standards"""
    
def validate_folder_structure():
    """Ensure proper organization hierarchy"""
```

### 3. Connection Diagnostics
- Port availability check
- Python module loading verification
- Message passing latency
- Error log analysis

## Common Issues Database

### Gap Detection
```
Issue: Visible gaps between modular walls
Causes:
1. Incorrect pivot point assumptions
2. Rotation affecting local bounds
3. Float precision errors
4. Wrong asset dimensions

Diagnostic Steps:
1. Switch to wireframe mode
2. Check actor world positions
3. Verify asset dimensions
4. Test with snapping enabled
```

### Rotation Problems
```
Issue: Corners don't connect properly
Causes:
1. Wrong rotation axis (Roll vs Yaw)
2. Incorrect pivot point
3. Local vs World rotation
4. Rotation order issues

Diagnostic Steps:
1. Log current rotations
2. Show local axes
3. Test incremental rotations
4. Verify rotation center
```

### Performance Issues
```
Issue: Commands execute slowly
Causes:
1. Large actor count
2. Complex Python operations
3. Viewport rendering overhead
4. Memory pressure

Diagnostic Steps:
1. Profile Python execution
2. Check actor count
3. Monitor memory usage
4. Test with simplified scene
```

## Debug Workflows

### Visual Gap Analysis
1. Enable debug visualizations
2. Switch to orthographic view
3. Highlight gaps with colored markers
4. Generate gap report with fixes

### Rotation Debugging
1. Show actor local axes
2. Display rotation gizmos
3. Log rotation values
4. Test rotation corrections

### State Verification
1. Capture scene snapshot
2. Validate all actors
3. Check naming and organization
4. Generate integrity report

## Output Formats

### Debug Report
```
UEMCP Debug Report
==================
Timestamp: 2024-01-15 10:30:45
Issue: Wall gaps in ground floor

Findings:
- 4 gaps detected between walls
- Gap sizes: 3.2cm, 2.8cm, 4.1cm, 3.9cm
- Cause: Corner assets 100x100, not 103x103

Affected Actors:
- Wall_Front_1 to Corner_F1_NW: 3.2cm gap
- Wall_Front_2 to Wall_Front_3: 2.8cm gap

Recommended Fixes:
1. Adjust wall positions by -1.5cm
2. OR use gap-filling trim pieces
3. OR enable socket snapping

Debug Markers Created:
- 4 red spheres at gap locations
- Run cleanup_debug_markers() to remove
```

### Visual Debug Screenshot
- Gaps highlighted in red
- Pivots shown as blue spheres
- Axes displayed as RGB arrows
- Grid overlay enabled

## Integration Features

### Auto-Fix Capabilities
```python
# Attempt automatic fixes
auto_fix_gaps(threshold=5.0)
auto_align_to_grid(grid_size=100)
auto_fix_rotations(actor_pattern="Corner_*")
```

### Debug Persistence
- Save debug state
- Reload previous sessions
- Compare before/after states
- Track fix history

### Performance Profiling
- Command execution timing
- Python listener latency
- Memory usage tracking
- Actor count monitoring

## Best Practices
1. Always create debug backup before fixes
2. Use visual markers for spatial issues
3. Log all diagnostic steps
4. Clean up debug actors after session
5. Document unusual findings