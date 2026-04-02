# Unreleased Changes

## Added

- Demo showcase: 9 themed zones in a walkable linear corridor demonstrating all MCP tool categories (Actor, Material, Niagara VFX, Blueprint, Audio, Widget, Animation/AI, Data Systems)
- 17 materials, 4 Niagara VFX systems, 44 text labels with navigation signs, PlayerStart at corridor entrance
- UE 5.7 Blueprint API compatibility layer using SubobjectDataSubsystem + BlueprintEditorLibrary
- SCS helpers in blueprint_helpers.py: compile_blueprint, get_scs, add_component_subobject, find_component_handle, gather_component_handles, get_component_template, find_root_handle

## Fixed

- blueprint_add_component broken on UE 5.7 (simple_construction_script removed from Python API)
- blueprint_compile broken on UE 5.7 (KismetEditorUtilities and mark_package_dirty removed)
- blueprint_modify_component broken on UE 5.7
- Hot-reload not clearing utils.* modules, causing stale cached imports after code changes

## Changed

- Demo layout: replaced 3x3 calibration grid with linear walkable corridor (X=0 to X=20000)
- Reset baseline prefixes: simplified to Demo_ prefix (replaces old Calib_/Marker_ prefixes)
- Demo.uproject engine association updated from 5.6 to 5.7
- All KismetEditorUtilities.compile_blueprint calls replaced with version-compatible compile_blueprint helper
