"""
Niagara VFX system operations for creating and managing particle effects.
"""

from __future__ import annotations

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
from utils.general import create_rotator, create_vector, get_unreal_editor_subsystem, log_debug

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

# Renderer class map -- maps renderer type to Unreal class name
_RENDERER_CLASS_MAP = {
    "sprite": "NiagaraSpriteRendererProperties",
    "mesh": "NiagaraMeshRendererProperties",
    "ribbon": "NiagaraRibbonRendererProperties",
    "light": "NiagaraLightRendererProperties",
}

# Valid parameter value types
_VALID_PARAM_TYPES = ("float", "int", "bool", "vector", "color", "enum")

# Section name to Niagara script attribute mapping
_SECTION_SCRIPT_MAP = {
    "spawn": "SpawnScript",
    "update": "UpdateScript",
    "render": "RenderScript",
}


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


def _resolve_module_path(module_name: str) -> str | None:
    """Try standard Niagara module paths and return the first that exists."""
    candidates = [
        f"/Niagara/Modules/{module_name}",
        f"/Niagara/Modules/Update/{module_name}",
        f"/Niagara/Modules/Spawn/{module_name}",
        f"/Niagara/Modules/Render/{module_name}",
    ]
    for candidate in candidates:
        if unreal.EditorAssetLibrary.does_asset_exist(candidate):
            return candidate
    return None


def _convert_to_ue_value(value: Any, value_type: str) -> Any:
    """Convert a Python value to an appropriate Unreal Engine type for Niagara parameters."""
    if value is None:
        return None
    if value_type == "float":
        return float(value)
    if value_type == "int":
        return int(value)
    if value_type == "bool":
        return bool(value)
    if value_type == "vector" and isinstance(value, dict):
        return create_vector([value["x"], value["y"], value["z"]])
    if value_type == "color" and isinstance(value, dict):
        return unreal.LinearColor(
            r=float(value["r"]),
            g=float(value["g"]),
            b=float(value["b"]),
            a=float(value.get("a", 1.0)),
        )
    if value_type == "enum":
        return str(value)
    return value


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
        template: Optional template preset name (fire, smoke, sparks, rain, snow, dust,
                  explosion, waterfall). Returns preset metadata in the response so the
                  caller can follow up with add_emitter / add_module calls to configure
                  the effect. The system itself is created empty.

    Returns:
        Dictionary with creation result including system path and optional template info
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

    # Ensure target directory exists (consistent with blueprint.create)
    if not unreal.EditorAssetLibrary.does_directory_exist(package_path):
        unreal.EditorAssetLibrary.make_directory(package_path)

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

    # Build template metadata if requested (preset info for follow-up calls)
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

    # If an emitter asset path is provided, load and validate it
    emitter_asset = None
    if emitter_asset_path:
        emitter_asset = unreal.EditorAssetLibrary.load_asset(emitter_asset_path)
        if not emitter_asset:
            raise ProcessingError(
                f"Emitter asset not found: {emitter_asset_path}",
                operation="niagara_add_emitter",
                details={"emitter_asset_path": emitter_asset_path},
            )
        if not isinstance(emitter_asset, unreal.NiagaraEmitter):
            raise ProcessingError(
                f"Asset is not a NiagaraEmitter: {emitter_asset_path} " f"(got {type(emitter_asset).__name__})",
                operation="niagara_add_emitter",
                details={
                    "emitter_asset_path": emitter_asset_path,
                    "actual_type": type(emitter_asset).__name__,
                },
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

    # Rename emitter to the requested name when added from an asset template
    if emitter_asset:
        handle.set_name(emitter_name)

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
    handle = _find_emitter_handle(system, emitter_name)

    # Resolve module asset path
    resolved_path = module_asset_path
    if not resolved_path:
        resolved_path = _resolve_module_path(module_name)

    if not resolved_path:
        raise ProcessingError(
            f"Module '{module_name}' not found in standard Niagara module paths",
            operation="niagara_add_module",
            details={
                "module_name": module_name,
                "searched_paths": [
                    f"/Niagara/Modules/{module_name}",
                    f"/Niagara/Modules/Update/{module_name}",
                    f"/Niagara/Modules/Spawn/{module_name}",
                    f"/Niagara/Modules/Render/{module_name}",
                ],
            },
        )

    # Load the module script asset
    module_asset = unreal.EditorAssetLibrary.load_asset(resolved_path)
    if not module_asset:
        raise ProcessingError(
            f"Failed to load module asset: {resolved_path}",
            operation="niagara_add_module",
            details={"resolved_path": resolved_path},
        )

    # Add the module to the appropriate script section on the emitter
    instance = handle.get_instance()
    if not instance:
        raise ProcessingError(
            f"Cannot access emitter instance for '{emitter_name}'",
            operation="niagara_add_module",
            details={"emitter_name": emitter_name},
        )

    script_attr = _SECTION_SCRIPT_MAP.get(section_lower)
    if not script_attr:
        raise ProcessingError(
            f"No script mapping found for section '{section_lower}'",
            operation="niagara_add_module",
            details={"section": section_lower},
        )

    script = getattr(instance, script_attr, None)
    if script is None:
        raise ProcessingError(
            f"Emitter script section '{section_lower}' (attribute '{script_attr}') is not "
            f"available for emitter '{emitter_name}'",
            operation="niagara_add_module",
            details={
                "section": section_lower,
                "script_attr": script_attr,
                "emitter_name": emitter_name,
            },
        )

    script.add_module(module_asset)

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
    handle = _find_emitter_handle(system, emitter_name)

    # Locate the emitter instance to apply the parameter
    instance = handle.get_instance()
    if not instance:
        raise ProcessingError(
            f"Cannot access emitter instance for '{emitter_name}'",
            operation="niagara_configure_module",
            details={"emitter_name": emitter_name},
        )

    # Convert value to the appropriate type
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

    # Apply the parameter override via the Niagara editor API
    ue_value = _convert_to_ue_value(applied_value, value_type)
    if ue_value is not None:
        override_key = f"{emitter_name}.{module_name}.{parameter_name}"
        if not system.has_editor_property(override_key):
            raise ProcessingError(
                "Cannot apply Niagara module parameter override: " "editor property not found on NiagaraSystem",
                operation="niagara_configure_module",
                details={
                    "system_path": system_path,
                    "override_key": override_key,
                    "emitter_name": emitter_name,
                    "module_name": module_name,
                    "parameter_name": parameter_name,
                },
            )
        system.set_editor_property(override_key, ue_value)

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
        mesh_path: Optional mesh asset path (required for mesh renderer type)
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

    # Mesh renderer requires mesh_path
    if renderer_lower == "mesh" and not mesh_path:
        raise ProcessingError(
            "mesh_path is required for mesh renderer type",
            operation="niagara_set_renderer",
            details={"renderer_type": renderer_lower},
        )

    system = _load_niagara_system(system_path)
    handle = _find_emitter_handle(system, emitter_name)

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

    # Create and configure the renderer via Niagara editor API
    renderer_class_name = _RENDERER_CLASS_MAP[renderer_lower]
    renderer_class = getattr(unreal, renderer_class_name)
    instance = handle.get_instance()
    if not instance:
        raise ProcessingError(
            f"Cannot access emitter instance for '{emitter_name}'",
            operation="niagara_set_renderer",
            details={"emitter_name": emitter_name},
        )

    # Create renderer properties and configure
    renderer_props = renderer_class()
    if material_path:
        material = unreal.EditorAssetLibrary.load_asset(material_path)
        if material:
            renderer_props.set_editor_property("material", material)
    if mesh_path and renderer_lower == "mesh":
        mesh = unreal.EditorAssetLibrary.load_asset(mesh_path)
        if mesh:
            renderer_props.set_editor_property("particle_mesh", mesh)

    # Apply additional settings if provided
    if settings:
        for key, val in settings.items():
            renderer_props.set_editor_property(key, val)

    # Add the renderer to the emitter
    instance.add_renderer(renderer_props)

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
        "force": [TypeRule(bool)],
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
        Dictionary with compile result including status
    """
    system = _load_niagara_system(system_path)

    # Request compilation
    system.request_compile(force)

    # Check compile status
    compile_status = system.get_compile_status()
    compiled_ok = compile_status != unreal.NiagaraScriptCompileStatus.ERROR

    # Save the compiled asset
    unreal.EditorAssetLibrary.save_asset(system_path)

    if not compiled_ok:
        raise ProcessingError(
            f"Niagara system compilation failed for {system_path}",
            operation="niagara_compile",
            details={"system_path": system_path, "compile_status": str(compile_status)},
        )

    log_debug(f"Compiled Niagara system: {system_path} (force={force})")

    return {
        "success": True,
        "systemPath": system_path,
        "compiled": True,
        "forced": force,
        "compileStatus": str(compile_status),
    }


@validate_inputs(
    {
        "system_path": [RequiredRule(), AssetPathRule()],
        "location": [RequiredRule(), ListLengthRule(3)],
        "rotation": [ListLengthRule(3, allow_none=True)],
        "scale": [ListLengthRule(3, allow_none=True)],
        "auto_activate": [TypeRule(bool)],
        "actor_name": [TypeRule(str, allow_none=True)],
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

    # Build location and rotation using project helpers to avoid constructor pitfalls
    spawn_location = create_vector(location)
    rot = rotation or [0.0, 0.0, 0.0]
    spawn_rotation = create_rotator(rot)

    # Spawn the system in the world
    world = get_unreal_editor_subsystem().get_editor_world()
    niagara_component = unreal.NiagaraFunctionLibrary.spawn_system_at_location(
        world_context_object=world,
        system_template=system,
        location=spawn_location,
        rotation=spawn_rotation,
        scale=create_vector(scale) if scale else create_vector([1.0, 1.0, 1.0]),
        auto_activate=auto_activate,
    )

    if not niagara_component:
        raise ProcessingError(
            "Failed to spawn Niagara system at location",
            operation="niagara_spawn",
            details={"system_path": system_path, "location": location},
        )

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
    """Inspect a Niagara system's basic structure and emitter configuration.

    Args:
        system_path: Path to the Niagara system asset

    Returns:
        Dictionary with system metadata, including:
            - success: Whether the operation succeeded
            - systemPath: The asset path of the Niagara system
            - systemInfo: Basic system info such as:
                - warmupTime: Warmup time for the system (float)
                - fixedBounds: Whether fixed bounds are set (bool)
            - emitterCount: Number of emitters in the system
            - emitters: List of emitter dictionaries, each containing:
                - name: Emitter name
                - enabled: Whether the emitter is enabled
                - hasInstance: Whether an emitter instance could be retrieved
    """
    system = _load_niagara_system(system_path)

    # Gather emitter information
    emitters_info = []
    for handle in _get_emitter_handles(system):
        emitter_name = handle.get_name()
        emitter_data = {
            "name": emitter_name,
            "enabled": handle.get_is_enabled(),
            "hasInstance": handle.get_instance() is not None,
        }
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
