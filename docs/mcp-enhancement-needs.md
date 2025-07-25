# MCP Enhancement Needs

This document tracks MCP limitations discovered during the house building experiment.

## Critical Enhancements

### 1. Socket-Based Snapping System
**Issue**: Manual calculation of placement coordinates is error-prone
**Solution**: Query and use socket points from assets for automatic alignment
**Priority**: HIGH

### 2. Asset Information Enhancement
**Issue**: asset_info doesn't return socket information
**Solution**: Add socket data to asset_info response
**Priority**: HIGH

### 3. Batch Operations
**Issue**: Placing multiple similar assets requires individual commands
**Solution**: Add batch placement tool for arrays of actors
**Priority**: MEDIUM

### 4. Screenshot Detection Fix
**Issue**: Screenshot files are created but MCP reports failure
**Solution**: Fix file detection timing in uemcp_listener_fixed.py
**Priority**: HIGH

### 5. Console Log Access
**Issue**: Cannot see UE console logs through MCP
**Solution**: Add tool to fetch recent console output
**Priority**: HIGH

### 6. Viewport Mode Control
**Issue**: Cannot switch between Perspective/Orthographic views (Top, Bottom, Left, Right, Front, Back)
**Solution**: Add viewport_mode tool to switch projection modes
**Priority**: HIGH

### 7. Camera Rotation Fix
**Issue**: Camera rotation parameters seem to cause unexpected angles (cocked/tilted views)
**Solution**: Fix rotation interpretation or provide clearer documentation
**Priority**: HIGH

### 8. Actor Organization/Grouping
**Issue**: Spawned actors appear as individual items in World Outliner, no folder organization
**Solution**: Add folder parameter to actor_spawn to organize actors in hierarchy
**Priority**: MEDIUM

### 9. Actor Alignment Helper
**Issue**: Need to manually calculate positions when building from existing actors
**Solution**: Add alignment helpers (e.g., "align to actor edge", "continue from actor")
**Priority**: HIGH

## Discovered During Phase 4.1

- Wall pieces are 300 units (3m) wide
- Corner pieces are 100 units (1m) 
- Manual coordinate calculation is tedious
- Need visual feedback loop (screenshots)
- Listener restart causes loop issues
- Camera control needs orthographic mode support
- Rotation parameters need clarification (pitch/yaw/roll interpretation)
- Actor organization in World Outliner needed
- Building from existing actors requires better alignment tools