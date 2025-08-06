# Placement Validation Tool

## Overview

The `placement_validate` tool is designed to address the building placement issues identified in modular building workflows. It detects gaps, overlaps, and alignment issues between modular building components, ensuring proper assembly of structures like those built with ModularOldTown assets.

## Features

### 1. Gap Detection
- Identifies spaces between building components that should be connected
- Reports gap distance and location
- Specifies which actors have gaps between them
- Indicates the primary axis where the gap occurs (X, Y, or Z)

### 2. Overlap Detection
- Detects overlapping geometry that could cause visual artifacts
- Categorizes overlap severity:
  - **Minor**: Small overlaps (up to 10% of modular size)
  - **Major**: Significant overlaps (10-25% of modular size)  
  - **Critical**: Severe overlaps (>25% of modular size)
- Reports overlap amount and location

### 3. Alignment Validation
- Checks if actors are properly aligned to the modular grid
- Suggests corrected positions for misaligned components
- Validates against configurable grid size (default: 300 units for ModularOldTown)

## Usage

### Basic Usage
```typescript
placement_validate({
  actors: ["Wall_North", "Wall_East", "Corner_NE", "Floor_Main"]
})
```

### Advanced Configuration
```typescript
placement_validate({
  actors: ["Wall_01", "Wall_02", "Door_Main"],
  tolerance: 5,              // Stricter tolerance (default: 10)
  checkAlignment: true,      // Enable grid alignment checking (default: true)
  modularSize: 300          // ModularOldTown grid size (default: 300)
})
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `actors` | string[] | Yes | - | List of actor names to validate |
| `tolerance` | number | No | 10 | Acceptable gap/overlap distance in Unreal units |
| `checkAlignment` | boolean | No | true | Whether to check modular grid alignment |
| `modularSize` | number | No | 300 | Modular grid size in Unreal units |

## Output

The tool provides detailed validation results:

### Summary
- Total actors validated
- Number of gaps, overlaps, and alignment issues found
- Overall status: `good`, `minor_issues`, `major_issues`, or `critical_issues`

### Detailed Issues
- **Gaps**: Location, distance, affected actors, direction
- **Overlaps**: Location, amount, severity, affected actors  
- **Alignment Issues**: Current position, suggested position, required offset

### Recommendations
- Specific actions to fix detected issues
- Tool suggestions for making corrections
- Verification steps

## Example Output

```
Placement Validation Results
===============================

Summary:
  Total actors validated: 4
  Gaps found: 1
  Overlaps found: 0
  Alignment issues: 2
  Overall status: MINOR ISSUES

GAPS DETECTED (1):
------------------------------
1. Gap of 15.3 units
   Location: [1200.0, 450.0, 100.0]
   Direction: X
   Between actors: Wall_North ↔ Wall_East

ALIGNMENT ISSUES (2):
----------------------------------------
1. Actor: Corner_NE
   Current: [1505.2, 605.8, 100.0]
   Suggested: [1500.0, 600.0, 100.0]
   Offset needed: [-5.2, -5.8, 0.0] on X axis

2. Actor: Floor_Main
   Current: [1198.4, 303.1, 0.0]
   Suggested: [1200.0, 300.0, 0.0]
   Offset needed: [1.6, -3.1, 0.0] on Y axis

RECOMMENDATIONS:
----------------
• Close gaps by moving actors closer together
• Use actor_modify tool to adjust positions
• Align actors to modular grid for proper snapping
• Use suggested positions for proper alignment
• Take wireframe screenshots to verify fixes
• Re-run validation after making adjustments

Validation completed in 0.15 seconds
```

## Integration with Building Workflow

### 1. After Placing Actors
```typescript
// Place your building components
batch_spawn({
  actors: [
    { assetPath: "/Game/ModularOldTown/Meshes/SM_Wall", location: [0, 0, 0], name: "Wall_South" },
    { assetPath: "/Game/ModularOldTown/Meshes/SM_Wall", location: [300, 0, 0], name: "Wall_East" },
    // ... more actors
  ]
})

// Validate placement
placement_validate({
  actors: ["Wall_South", "Wall_East", "Corner_SE"]
})
```

### 2. Fix Issues
```typescript
// Fix alignment issue
actor_modify({
  actorName: "Corner_SE",
  location: [300.0, 300.0, 0.0]  // Use suggested position from validation
})
```

### 3. Re-validate
```typescript
// Confirm fixes
placement_validate({
  actors: ["Wall_South", "Wall_East", "Corner_SE"]
})
```

### 4. Debug with Wireframe
```typescript
// Switch to wireframe for visual verification
viewport_render_mode({ mode: "wireframe" })
viewport_mode({ mode: "top" })
viewport_screenshot()
```

## Best Practices

### 1. Validate Early and Often
- Run validation after placing each building section
- Don't wait until the entire structure is complete

### 2. Use Appropriate Tolerance
- **Tight tolerance (1-5 units)**: For precision building
- **Standard tolerance (10 units)**: General building work
- **Loose tolerance (20+ units)**: Rough layout phase

### 3. Focus on Critical Issues First
- Address critical overlaps immediately (>25% modular size)
- Fix major gaps that break structural integrity
- Handle alignment issues last for polish

### 4. Leverage Grid Alignment
- Always enable `checkAlignment` for modular building
- Use 300 units for ModularOldTown assets
- Adjust `modularSize` for other asset packs

### 5. Combine with Visual Verification
- Use wireframe mode to see structural details
- Take screenshots for documentation
- Check from multiple angles (top, front, side)

## Performance Notes

- Validation time scales with the number of actors (O(n²) for gap/overlap detection)
- Typical performance: ~0.1-0.5 seconds for 10-20 actors
- Large builds (100+ actors) may take 1-2 seconds

## Troubleshooting

### "Actor not found" Errors
- Verify actor names are correct (case-sensitive)
- Use `level_actors` to list available actors
- Check that actors haven't been deleted

### False Positive Overlaps
- Increase tolerance for rough building phases
- Some architectural details may intentionally overlap
- Use `severity` levels to prioritize real issues

### Missing Alignment Issues
- Ensure `checkAlignment` is enabled
- Verify `modularSize` matches your asset pack
- Check that actors are actually misaligned visually