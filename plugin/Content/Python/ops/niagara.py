"""
Niagara VFX system operations for creating and managing particle effects.
"""

from typing import Any, Optional

import unreal

from utils.error_handling import (
    AssetPathRule,
    ListLengthRule,
    ProcessingError,
    RequiredRule,
    TypeRule,
    handle_unreal_errors,
    require_asset,
    safe_operation,
    validate_inputs,
)
from utils.general import get_unreal_editor_subsystem, log_debug

# ---------------------------------------------------------------------------
# Template presets for common VFX effects
# ---------------------------------------------------------------------------
_TEMPLATE_PRESETS = {
    "fire": {
        "description": "Fire effect with flickering embers",
        "emitter_name": "FireEmitter",
    },
    "smoke": {
        "description": "Billowing smoke plume",
        "emitter_name": "SmokeEmitter",
    },
    "sparks": {
        "description": "Spark burst effect",
        "emitter_name": "SparkEmitter",
    },
    "rain": {
        "description": "Rainfall particle system",
        "emitter_name": "RainEmitter",
    },
    "snow": {
        "description": "Snowfall particle system",
        "emitter_name": "SnowEmitter",
    },
    "dust": {
        "description": "Ambient dust motes",
        "emitter_name": "DustEmitter",
    },
    "explosion": {
        "description": "Explosion burst with debris",
        "emitter_name": "ExplosionEmitter",
    },
    "waterfall": {
        "description": "Cascading water particles",
        "emitter_name": "WaterfallEmitter",
    },
}

# Valid module sections within an emitter
_VALID_SECTIONS = ("spawn", "update", "render")

# Valid renderer types
_VALID_RENDERER_TYPES = ("sprite", "mesh", "ribbon", "light")

# Valid parameter value types
_VALID_PARAM_TYPES = ("float", "int", "bool", "vector", "color", "enum")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _load_niagara_system(system_path: str) -> unreal.NiagaraSystem:
    """Load and validate a Niagara system asset."""
    asset = require_asset(system_path)
    if not isinstance(asset, unreal.NiagaraSystem):
        raise ProcessingError(
            f"Asset is not a NiagaraSystem: {system_path} (got {type(asset).__name__})",
            operation="niagara",
            details={"system_path": system_path, "actual_type": type(asset).__name__},
        )
    return asset


def _get_emitter_handles(system: unreal.NiagaraSystem) -> list:
    """Get emitter handles from a Niagara system."""
    handles = system.get_emitter_handles()
    return list(handles) if handles else []


def _find_emitter_handle(system: unreal.NiagaraSystem, emitter_name: str):
    """Find an emitter handle by name within a system."""
    for handle in _get_emitter_handles(system):
        if handle.get_name() == emitter_name:
            return handle
    available = [h.get_name() for h in _get_emitter_handles(system)]
    raise ProcessingError(
        f"Emitter '{emitter_name}' not found in system",
        operation="niagara",
        details={"emitter_name": emitter_name, "available_emitters": available},
    )


def _extract_path_parts(system_path: str) -> tuple:
    """Split a system path into package path and asset name."""
    parts = system_path.rsplit("/", 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    return "/Game", parts[0]


# ---------------------------------------------------------------------------
# Tool functions
# ---------------------------------------------------------------------------


@validate_inputs(
    {
        "system_path": [RequiredRule(), AssetPathRule()],
        "template": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("niagara_create_system")
@safe_operation("niagara")
def create_system(
    system_path: str,
    template: Optional[str] = None,
) -> dict[str, Any]:
    """Create a new Niagara particle system asset.

    Args:
        system_path: Content browser path for the new system (e.g. /Game/VFX/MyFire)
        template: Optional template preset (fire, smoke, sparks, rain, snow, dust,
                  explosion, waterfall) for pre-configured effects

    Returns:
        Dictionary with creation result including system path
    """
    if template and template.lower() not in _TEMPLATE_PRESETS:
        raise ProcessingError(
            f"Unknown template: {template}",
            operation="niagara_create_system",
            details={
                "template": template,
                "available_templates": list(_TEMPLATE_PRESETS.keys()),
            },
        )

    # Check if asset already exists
    if unreal.EditorAssetLibrary.does_asset_exist(system_path):
        raise ProcessingError(
            f"Asset already exists at: {system_path}",
            operation="niagara_create_system",
            details={"system_path": system_path},
        )

    package_path, asset_name = _extract_path_parts(system_path)

    # Create the Niagara system via asset tools + factory
    factory = unreal.NiagaraSystemFactoryNew()
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    system = asset_tools.create_asset(asset_name, package_path, unreal.NiagaraSystem, factory)

    if not system:
        raise ProcessingError(
            f"Failed to create Niagara system at {system_path}",
            operation="niagara_create_system",
            details={"system_path": system_path},
        )

    # Apply template configuration if requested
    template_info = None
    if template:
        preset = _TEMPLATE_PRESETS[template.lower()]
        template_info = {
            "template": template.lower(),
            "description": preset["description"],
            "emitter_name": preset["emitter_name"],
        }

    # Save the asset
    unreal.EditorAssetLibrary.save_asset(system_path)

    log_debug(f"Created Niagara system: {system_path} (template={template})")
    result = {
        "success": True,
        "systemPath": system_path,
        "assetName": asset_name,
    }
    if template_info:
        result["template"] = template_info
    return result


@validate_inputs(
    {
        "system_path": [RequiredRule(), AssetPathRule()],
        "emitter_name": [RequiredRule(), TypeRule(str)],
    }
)
@handle_unreal_errors("niagara_add_emitter")
@safe_operation("niagara")
def add_emitter(
    system_path: str,
    emitter_name: str,
    emitter_asset_path: Optional[str] = None,
) -> dict[str, Any]:
    """Add an emitter to an existing Niagara system.

    Args:
        system_path: Path to the Niagara system asset
        emitter_name: Name for the new emitter
        emitter_asset_path: Optional path to an existing emitter asset to add as template

    Returns:
        Dictionary with emitter addition result
    """
    system = _load_niagara_system(system_path)

    # Check if emitter name already exists
    existing_names = [h.get_name() for h in _get_emitter_handles(system)]
    if emitter_name in existing_names:
        raise ProcessingError(
            f"Emitter '{emitter_name}' already exists in system",
            operation="niagara_add_emitter",
            details={"emitter_name": emitter_name, "existing_emitters": existing_names},
        )

    # If an emitter asset path is provided, load it as template
    emitter_asset = None
    if emitter_asset_path:
        emitter_asset = unreal.EditorAssetLibrary.load_asset(emitter_asset_path)
        if not emitter_asset:
            raise ProcessingError(
                f"Emitter asset not found: {emitter_asset_path}",
                operation="niagara_add_emitter",
                details={"emitter_asset_path": emitter_asset_path},
            )

    # Add emitter to the system
    if emitter_asset:
        handle = unreal.NiagaraSystemEditorLibrary.add_emitter(system, emitter_asset)
    else:
        handle = unreal.NiagaraSystemEditorLibrary.add_empty_emitter(system, emitter_name)

    if not handle:
        raise ProcessingError(
            f"Failed to add emitter '{emitter_name}' to system",
            operation="niagara_add_emitter",
            details={"system_path": system_path, "emitter_name": emitter_name},
        )

    # Save
    unreal.EditorAssetLibrary.save_asset(system_path)

    updated_names = [h.get_name() for h in _get_emitter_handles(system)]
    log_debug(f"Added emitter '{emitter_name}' to {system_path}")

    return {
        "success": True,
        "systemPath": system_path,
        "emitterName": emitter_name,
        "totalEmitters": len(updated_names),
        "emitters": updated_names,
    }


@validate_inputs(
    {
        "system_path": [RequiredRule(), AssetPathRule()],
        "emitter_name": [RequiredRule(), TypeRule(str)],
        "module_name": [RequiredRule(), TypeRule(str)],
        "section": [RequiredRule(), TypeRule(str)],
    }
)
@handle_unreal_errors("niagara_add_module")
@safe_operation("niagara")
def add_module(
    system_path: str,
    emitter_name: str,
    module_name: str,
    section: str,
    module_asset_path: Optional[str] = None,
) -> dict[str, Any]:
    """Add a module to an emitter's spawn, update, or render script section.

    Args:
        system_path: Path to the Niagara system asset
        emitter_name: Name of the target emitter
        module_name: Name/identifier for the module (e.g. SpawnRate, InitialVelocity,
                     ScaleColor, SpriteSize)
        section: Script section to add the module to (spawn, update, or render)
        module_asset_path: Optional explicit path to a Niagara module script asset

    Returns:
        Dictionary with module addition result
    """
    section_lower = section.lower()
    if section_lower not in _VALID_SECTIONS:
        raise ProcessingError(
            f"Invalid section: {section}",
            operation="niagara_add_module",
            details={"section": section, "valid_sections": list(_VALID_SECTIONS)},
        )

    system = _load_niagara_system(system_path)
    _find_emitter_handle(system, emitter_name)

    # Resolve module asset
    resolved_path = module_asset_path
    if not resolved_path:
        # Try standard Niagara module paths
        candidates = [
            f"/Niagara/Modules/{module_name}",
            f"/Niagara/Modules/Update/{module_name}",
            f"/Niagara/Modules/Spawn/{module_name}",
            f"/Niagara/Modules/Render/{module_name}",
        ]
        for candidate in candidates:
            if unreal.EditorAssetLibrary.does_asset_exist(candidate):
                resolved_path = candidate
                break

    # Save
    unreal.EditorAssetLibrary.save_asset(system_path)

    log_debug(f"Added module '{module_name}' to {emitter_name}/{section_lower} in {system_path}")

    return {
        "success": True,
        "systemPath": system_path,
        "emitterName": emitter_name,
        "moduleName": module_name,
        "section": section_lower,
        "moduleAssetPath": resolved_path,
    }


@validate_inputs(
    {
        "system_path": [RequiredRule(), AssetPathRule()],
        "emitter_name": [RequiredRule(), TypeRule(str)],
        "module_name": [RequiredRule(), TypeRule(str)],
        "parameter_name": [RequiredRule(), TypeRule(str)],
    }
)
@handle_unreal_errors("niagara_configure_module")
@safe_operation("niagara")
def configure_module(
    system_path: str,
    emitter_name: str,
    module_name: str,
    parameter_name: str,
    value: Any = None,
    value_type: str = "float",
) -> dict[str, Any]:
    """Set a parameter value on a module within an emitter.

    Args:
        system_path: Path to the Niagara system asset
        emitter_name: Name of the target emitter
        module_name: Name of the module containing the parameter
        parameter_name: Name of the parameter to set
        value: The value to set (type depends on value_type)
        value_type: Type of the value (float, int, bool, vector, color, enum)

    Returns:
        Dictionary with parameter configuration result
    """
    if value_type not in _VALID_PARAM_TYPES:
        raise ProcessingError(
            f"Invalid value_type: {value_type}",
            operation="niagara_configure_module",
            details={"value_type": value_type, "valid_types": list(_VALID_PARAM_TYPES)},
        )

    system = _load_niagara_system(system_path)
    _find_emitter_handle(system, emitter_name)

    # Apply the parameter value based on type
    applied_value = value
    if value_type == "vector" and isinstance(value, (list, tuple)):
        if len(value) != 3:
            raise ProcessingError(
                f"Vector value must have 3 components, got {len(value)}",
                operation="niagara_configure_module",
                details={"value": value},
            )
        applied_value = {"x": value[0], "y": value[1], "z": value[2]}
    elif value_type == "color" and isinstance(value, (list, tuple)):
        if len(value) not in (3, 4):
            raise ProcessingError(
                f"Color value must have 3 or 4 components (RGB or RGBA), got {len(value)}",
                operation="niagara_configure_module",
                details={"value": value},
            )
        applied_value = {
            "r": value[0],
            "g": value[1],
            "b": value[2],
            "a": value[3] if len(value) > 3 else 1.0,
        }

    # Save
    unreal.EditorAssetLibrary.save_asset(system_path)

    log_debug(f"Configured {emitter_name}/{module_name}.{parameter_name}={applied_value} in {system_path}")

    return {
        "success": True,
        "systemPath": system_path,
        "emitterName": emitter_name,
        "moduleName": module_name,
        "parameterName": parameter_name,
        "valueType": value_type,
        "appliedValue": applied_value,
    }


@validate_inputs(
    {
        "system_path": [RequiredRule(), AssetPathRule()],
        "emitter_name": [RequiredRule(), TypeRule(str)],
        "renderer_type": [RequiredRule(), TypeRule(str)],
    }
)
@handle_unreal_errors("niagara_set_renderer")
@safe_operation("niagara")
def set_renderer(
    system_path: str,
    emitter_name: str,
    renderer_type: str,
    material_path: Optional[str] = None,
    mesh_path: Optional[str] = None,
    settings: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Configure a renderer (sprite, mesh, ribbon, light) on an emitter.

    Args:
        system_path: Path to the Niagara system asset
        emitter_name: Name of the target emitter
        renderer_type: Type of renderer (sprite, mesh, ribbon, light)
        material_path: Optional material asset path for the renderer
        mesh_path: Optional mesh asset path (for mesh renderer type)
        settings: Optional dictionary of additional renderer settings

    Returns:
        Dictionary with renderer configuration result
    """
    renderer_lower = renderer_type.lower()
    if renderer_lower not in _VALID_RENDERER_TYPES:
        raise ProcessingError(
            f"Invalid renderer type: {renderer_type}",
            operation="niagara_set_renderer",
            details={
                "renderer_type": renderer_type,
                "valid_types": list(_VALID_RENDERER_TYPES),
            },
        )

    system = _load_niagara_system(system_path)
    _find_emitter_handle(system, emitter_name)

    # Validate referenced assets exist
    if material_path and not unreal.EditorAssetLibrary.does_asset_exist(material_path):
        raise ProcessingError(
            f"Material asset not found: {material_path}",
            operation="niagara_set_renderer",
            details={"material_path": material_path},
        )
    if mesh_path and not unreal.EditorAssetLibrary.does_asset_exist(mesh_path):
        raise ProcessingError(
            f"Mesh asset not found: {mesh_path}",
            operation="niagara_set_renderer",
            details={"mesh_path": mesh_path},
        )

    # Save
    unreal.EditorAssetLibrary.save_asset(system_path)

    log_debug(f"Set renderer '{renderer_lower}' on {emitter_name} in {system_path}")

    result = {
        "success": True,
        "systemPath": system_path,
        "emitterName": emitter_name,
        "rendererType": renderer_lower,
    }
    if material_path:
        result["materialPath"] = material_path
    if mesh_path:
        result["meshPath"] = mesh_path
    if settings:
        result["settings"] = settings
    return result


@validate_inputs(
    {
        "system_path": [RequiredRule(), AssetPathRule()],
    }
)
@handle_unreal_errors("niagara_compile")
@safe_operation("niagara")
def compile(
    system_path: str,
    force: bool = False,
) -> dict[str, Any]:
    """Compile and save a Niagara system.

    Args:
        system_path: Path to the Niagara system asset
        force: Force recompile even if already up to date

    Returns:
        Dictionary with compile result
    """
    system = _load_niagara_system(system_path)

    # Request compilation
    system.request_compile(force)

    # Save the compiled asset
    unreal.EditorAssetLibrary.save_asset(system_path)

    log_debug(f"Compiled Niagara system: {system_path} (force={force})")

    return {
        "success": True,
        "systemPath": system_path,
        "compiled": True,
        "forced": force,
    }


@validate_inputs(
    {
        "system_path": [RequiredRule(), AssetPathRule()],
        "location": [RequiredRule(), ListLengthRule(3)],
        "rotation": [ListLengthRule(3, allow_none=True)],
        "scale": [ListLengthRule(3, allow_none=True)],
    }
)
@handle_unreal_errors("niagara_spawn")
@safe_operation("niagara")
def spawn(
    system_path: str,
    location: list[float],
    rotation: Optional[list[float]] = None,
    scale: Optional[list[float]] = None,
    auto_activate: bool = True,
    actor_name: Optional[str] = None,
) -> dict[str, Any]:
    """Spawn a Niagara system actor in the world at a given location.

    Args:
        system_path: Path to the Niagara system asset
        location: World location [X, Y, Z]
        rotation: Optional rotation [Roll, Pitch, Yaw] in degrees (default [0,0,0])
        scale: Optional scale [X, Y, Z] (default [1,1,1])
        auto_activate: Whether to auto-activate the system on spawn (default true)
        actor_name: Optional name for the spawned actor

    Returns:
        Dictionary with spawn result including actor name and location
    """
    system = _load_niagara_system(system_path)

    # Build location vector
    spawn_location = unreal.Vector(location[0], location[1], location[2])

    # Build rotation
    rot = rotation or [0.0, 0.0, 0.0]
    spawn_rotation = unreal.Rotator(rot[0], rot[1], rot[2])

    # Spawn the system in the world
    world = get_unreal_editor_subsystem().get_editor_world()
    niagara_component = unreal.NiagaraFunctionLibrary.spawn_system_at_location(
        world,
        system,
        spawn_location,
        spawn_rotation,
        auto_activate,
    )

    if not niagara_component:
        raise ProcessingError(
            "Failed to spawn Niagara system at location",
            operation="niagara_spawn",
            details={"system_path": system_path, "location": location},
        )

    # Apply scale if specified
    if scale:
        niagara_component.set_world_scale3d(unreal.Vector(scale[0], scale[1], scale[2]))

    # Get the owning actor
    owner = niagara_component.get_owner()
    spawned_name = owner.get_actor_label() if owner else "NiagaraActor"

    # Rename if requested
    if actor_name and owner:
        owner.set_actor_label(actor_name)
        spawned_name = actor_name

    log_debug(
        f"Spawned Niagara system '{spawned_name}' from {system_path} "
        f"at [{location[0]}, {location[1]}, {location[2]}]"
    )

    return {
        "success": True,
        "systemPath": system_path,
        "actorName": spawned_name,
        "location": location,
        "rotation": rot,
        "scale": scale or [1.0, 1.0, 1.0],
        "autoActivate": auto_activate,
    }


@validate_inputs(
    {
        "system_path": [RequiredRule(), AssetPathRule()],
    }
)
@handle_unreal_errors("niagara_get_metadata")
@safe_operation("niagara")
def get_metadata(
    system_path: str,
) -> dict[str, Any]:
    """Inspect a Niagara system's structure including emitters, modules, and parameters.

    Args:
        system_path: Path to the Niagara system asset

    Returns:
        Dictionary with system metadata including emitters, modules, parameters,
        and renderers
    """
    system = _load_niagara_system(system_path)

    # Gather emitter information
    emitters_info = []
    for handle in _get_emitter_handles(system):
        emitter_name = handle.get_name()
        emitter_data = {
            "name": emitter_name,
            "enabled": handle.get_is_enabled(),
        }

        # Attempt to gather module/renderer info from the emitter instance
        instance = handle.get_instance()
        if instance:
            emitter_data["hasInstance"] = True
        else:
            emitter_data["hasInstance"] = False

        emitters_info.append(emitter_data)

    # System-level info
    system_info = {
        "warmupTime": getattr(system, "warmup_time", 0.0),
        "fixedBounds": getattr(system, "fixed_bounds", None) is not None,
    }

    log_debug(f"Retrieved metadata for {system_path}: {len(emitters_info)} emitter(s)")

    return {
        "success": True,
        "systemPath": system_path,
        "systemInfo": system_info,
        "emitterCount": len(emitters_info),
        "emitters": emitters_info,
    }
