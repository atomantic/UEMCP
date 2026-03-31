"""
Niagara VFX system operations for creating and managing particle effects.

UE 5.7 Python API notes:
- NiagaraSystem has no get_emitter_handles() or emitter management methods
- NiagaraSystemEditorLibrary does not exist in Python
- Emitter manipulation must use NiagaraPythonEmitter / NiagaraPythonModule
- Spawning persistent actors requires EditorActorSubsystem + NiagaraComponent.set_asset
- Systems auto-compile on save; no explicit request_compile is available
"""

from typing import Any, Optional

import unreal

# Fail fast at import time if Niagara plugin is not available, so that
# try/except ImportError guards in __init__.py and command_registry work.
if not hasattr(unreal, "NiagaraSystem"):
    raise ImportError("Niagara plugin is not available (unreal.NiagaraSystem not found)")

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
from utils.general import create_rotator, create_vector, log_debug

# ---------------------------------------------------------------------------
# Built-in Niagara template systems that ship with the engine.
# These already have emitters, renderers, and modules pre-configured.
# ---------------------------------------------------------------------------
_BUILTIN_TEMPLATES = {
    "fountain": {
        "source": "/Niagara/DefaultAssets/Templates/Systems/FountainLightweight",
        "description": "Continuous upward particle fountain (lightweight)",
    },
    "burst": {
        "source": "/Niagara/DefaultAssets/Templates/Systems/DirectionalBurst",
        "description": "One-shot directional burst of particles",
    },
    "burst_lightweight": {
        "source": "/Niagara/DefaultAssets/Templates/Systems/DirectionalBurstLightweight",
        "description": "One-shot directional burst (lightweight)",
    },
    "explosion": {
        "source": "/Niagara/DefaultAssets/Templates/Systems/SimpleExplosion",
        "description": "Simple explosion with radial burst",
    },
    "radial_burst": {
        "source": "/Niagara/DefaultAssets/Templates/Systems/RadialBurst",
        "description": "Radial particle burst in all directions",
    },
    "minimal": {
        "source": "/Niagara/DefaultAssets/Templates/Systems/MinimalLightweight",
        "description": "Minimal lightweight system (good starting point)",
    },
    "trails": {
        "source": "/Niagara/DefaultAssets/Templates/Systems/AttributeReaderTrails",
        "description": "Particle trails using attribute reader",
    },
}

# Valid parameter value types for set_parameter
_VALID_PARAM_TYPES = ("float", "int", "bool", "vector", "color")


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

    When a template is provided, the system is duplicated from a built-in Niagara
    template that already has emitters, renderers, and modules configured. Without
    a template, an empty system is created via the factory.

    Args:
        system_path: Content browser path for the new system (e.g. /Game/VFX/MyFire)
        template: Optional template name. Available templates:
                  fountain, burst, burst_lightweight, explosion,
                  radial_burst, minimal, trails.
                  Or pass a full asset path to duplicate any existing system.

    Returns:
        Dictionary with creation result including system path and template info
    """
    if unreal.EditorAssetLibrary.does_asset_exist(system_path):
        raise ProcessingError(
            f"Asset already exists at: {system_path}",
            operation="niagara_create_system",
            details={"system_path": system_path},
        )

    package_path, asset_name = _extract_path_parts(system_path)

    # Ensure target directory exists
    if not unreal.EditorAssetLibrary.does_directory_exist(package_path):
        unreal.EditorAssetLibrary.make_directory(package_path)

    template_info = None

    if template:
        # Check built-in templates first, then treat as a raw asset path
        template_lower = template.lower()
        if template_lower in _BUILTIN_TEMPLATES:
            source_path = _BUILTIN_TEMPLATES[template_lower]["source"]
            template_info = {
                "template": template_lower,
                "description": _BUILTIN_TEMPLATES[template_lower]["description"],
                "source": source_path,
            }
        elif unreal.EditorAssetLibrary.does_asset_exist(template):
            source_path = template
            template_info = {"template": "custom", "source": source_path}
        else:
            raise ProcessingError(
                f"Unknown template: {template}",
                operation="niagara_create_system",
                details={
                    "template": template,
                    "available_templates": list(_BUILTIN_TEMPLATES.keys()),
                },
            )

        # Validate custom asset paths are actually NiagaraSystems
        if template_info.get("template") == "custom":
            source_asset = unreal.EditorAssetLibrary.load_asset(source_path)
            if not isinstance(source_asset, unreal.NiagaraSystem):
                raise ProcessingError(
                    f"Source asset is not a NiagaraSystem: {source_path}",
                    operation="niagara_create_system",
                    details={"source": source_path, "actual_type": type(source_asset).__name__},
                )

        # Duplicate the source system to the target path
        success = unreal.EditorAssetLibrary.duplicate_asset(source_path, system_path)
        if not success:
            raise ProcessingError(
                f"Failed to duplicate template '{source_path}' to {system_path}",
                operation="niagara_create_system",
                details={"source": source_path, "target": system_path},
            )
    else:
        # Create an empty system via the factory
        factory = unreal.NiagaraSystemFactoryNew()
        asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
        system = asset_tools.create_asset(asset_name, package_path, unreal.NiagaraSystem, factory)

        if not system:
            raise ProcessingError(
                f"Failed to create Niagara system at {system_path}",
                operation="niagara_create_system",
                details={"system_path": system_path},
            )

    # Save the asset (this triggers auto-compilation for Niagara)
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
    """Spawn a persistent Niagara actor in the editor level.

    Creates a NiagaraActor via EditorActorSubsystem and assigns the system
    asset to its NiagaraComponent, producing a persistent level actor that
    survives saves and reloads.

    Args:
        system_path: Path to the Niagara system asset
        location: World location [X, Y, Z]
        rotation: Optional rotation [Roll, Pitch, Yaw] in degrees (default [0,0,0])
        scale: Optional scale [X, Y, Z] (default [1,1,1])
        auto_activate: Whether to auto-activate the system on spawn (default true)
        actor_name: Optional label for the spawned actor

    Returns:
        Dictionary with spawn result including actor name and location
    """
    system = _load_niagara_system(system_path)

    spawn_location = create_vector(location)
    rot = rotation or [0.0, 0.0, 0.0]

    # Spawn a persistent NiagaraActor via the editor subsystem
    editor = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    actor = editor.spawn_actor_from_class(unreal.NiagaraActor, spawn_location)

    if not actor:
        raise ProcessingError(
            "Failed to spawn NiagaraActor",
            operation="niagara_spawn",
            details={"system_path": system_path, "location": location},
        )

    # Configure the NiagaraComponent
    nc = actor.niagara_component
    nc.set_asset(system)

    # Apply rotation
    actor.set_actor_rotation(create_rotator(rot), False)

    # Apply scale
    if scale:
        actor.set_actor_scale3d(create_vector(scale))

    # Auto-activate
    nc.set_auto_activate(auto_activate)
    if auto_activate:
        nc.activate(True)

    # Label
    spawned_name = actor_name or f"Niagara_{system_path.rsplit('/', 1)[-1]}"
    actor.set_actor_label(spawned_name)

    log_debug(
        f"Spawned Niagara actor '{spawned_name}' from {system_path} "
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
    """Inspect a Niagara system's properties and configuration.

    Args:
        system_path: Path to the Niagara system asset

    Returns:
        Dictionary with system metadata including warmup time, bounds, and asset info
    """
    system = _load_niagara_system(system_path)

    # System-level info via get_editor_property
    warmup_time = 0.0
    try:
        warmup_time = system.get_editor_property("warmup_time")
    except Exception:
        pass

    fixed_bounds = None
    try:
        bounds = system.get_editor_property("fixed_bounds")
        if bounds:
            fixed_bounds = {
                "min": {"x": bounds.min.x, "y": bounds.min.y, "z": bounds.min.z},
                "max": {"x": bounds.max.x, "y": bounds.max.y, "z": bounds.max.z},
            }
    except Exception:
        pass

    log_debug(f"Retrieved metadata for {system_path}")

    return {
        "success": True,
        "systemPath": system_path,
        "systemInfo": {
            "warmupTime": warmup_time,
            "hasFixedBounds": fixed_bounds is not None,
            "fixedBounds": fixed_bounds,
        },
        "assetName": system.get_name(),
        "assetClass": type(system).__name__,
    }


@validate_inputs(
    {
        "system_path": [RequiredRule(), AssetPathRule()],
    }
)
@handle_unreal_errors("niagara_compile")
@safe_operation("niagara")
def compile(
    system_path: str,
) -> dict[str, Any]:
    """Save a Niagara system, triggering recompilation.

    In UE 5.7, Niagara systems auto-compile when saved. This tool forces a
    save to ensure the latest state is compiled and persisted.

    Args:
        system_path: Path to the Niagara system asset

    Returns:
        Dictionary with compile/save result
    """
    _load_niagara_system(system_path)

    # Saving triggers Niagara auto-compilation
    unreal.EditorAssetLibrary.save_asset(system_path)

    log_debug(f"Saved/compiled Niagara system: {system_path}")

    return {
        "success": True,
        "systemPath": system_path,
        "compiled": True,
    }


@validate_inputs(
    {
        "actor_name": [RequiredRule(), TypeRule(str)],
        "parameter_name": [RequiredRule(), TypeRule(str)],
        "value": [RequiredRule()],
        "value_type": [RequiredRule(), TypeRule(str)],
    }
)
@handle_unreal_errors("niagara_set_parameter")
@safe_operation("niagara")
def set_parameter(
    actor_name: str,
    parameter_name: str,
    value: Any = 0,
    value_type: str = "float",
) -> dict[str, Any]:
    """Set a user parameter on a spawned Niagara actor's component.

    Operates on a live NiagaraComponent in the level, setting Niagara user
    parameters (exposed variables) by name and type.

    Args:
        actor_name: Label of the NiagaraActor in the level
        parameter_name: Name of the Niagara user parameter
        value: The value to set
        value_type: Type of the value (float, int, bool, vector, color)

    Returns:
        Dictionary with parameter set result
    """
    if value_type not in _VALID_PARAM_TYPES:
        raise ProcessingError(
            f"Invalid value_type: {value_type}",
            operation="niagara_set_parameter",
            details={"value_type": value_type, "valid_types": list(_VALID_PARAM_TYPES)},
        )

    # Find the actor
    editor = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    actors = editor.get_all_level_actors()
    target = None
    for a in actors:
        if a.get_actor_label() == actor_name:
            target = a
            break

    if not target:
        raise ProcessingError(
            f"Actor '{actor_name}' not found in level",
            operation="niagara_set_parameter",
            details={"actor_name": actor_name},
        )

    nc = getattr(target, "niagara_component", None)
    if not nc:
        raise ProcessingError(
            f"Actor '{actor_name}' has no NiagaraComponent",
            operation="niagara_set_parameter",
            details={"actor_name": actor_name, "actor_class": type(target).__name__},
        )

    # Apply the parameter using the typed setter methods on NiagaraComponent
    if value_type == "float":
        nc.set_variable_float(parameter_name, float(value))
    elif value_type == "int":
        nc.set_variable_int(parameter_name, int(value))
    elif value_type == "bool":
        if isinstance(value, bool):
            bool_val = value
        elif isinstance(value, (int, float)):
            bool_val = value != 0
        else:
            raise ProcessingError(
                f"Bool value must be a boolean or number, got {type(value).__name__}: {value!r}",
                operation="niagara_set_parameter",
                details={"value": value, "value_type": type(value).__name__},
            )
        nc.set_variable_bool(parameter_name, bool_val)
    elif value_type == "vector":
        if isinstance(value, (list, tuple)) and len(value) == 3:
            nc.set_variable_vec3(parameter_name, create_vector(value))
        elif isinstance(value, dict):
            for key in ("x", "y", "z"):
                if key not in value:
                    raise ProcessingError(
                        f"Vector dict missing required key '{key}': need {{x, y, z}}",
                        operation="niagara_set_parameter",
                        details={"value": value, "missing_key": key},
                    )
            nc.set_variable_vec3(parameter_name, create_vector([value["x"], value["y"], value["z"]]))
        else:
            raise ProcessingError(
                "Vector value must be [x, y, z] or {x, y, z}",
                operation="niagara_set_parameter",
                details={"value": value},
            )
    elif value_type == "color":
        if isinstance(value, (list, tuple)):
            if len(value) not in (3, 4):
                raise ProcessingError(
                    "Color value must have 3 or 4 components (RGB or RGBA)",
                    operation="niagara_set_parameter",
                    details={"value": value},
                )
            color = unreal.LinearColor(
                r=float(value[0]),
                g=float(value[1]),
                b=float(value[2]),
                a=float(value[3]) if len(value) > 3 else 1.0,
            )
        elif isinstance(value, dict):
            for key in ("r", "g", "b"):
                if key not in value:
                    raise ProcessingError(
                        f"Color dict missing required key '{key}': need {{r, g, b[, a]}}",
                        operation="niagara_set_parameter",
                        details={"value": value, "missing_key": key},
                    )
            color = unreal.LinearColor(
                r=float(value["r"]),
                g=float(value["g"]),
                b=float(value["b"]),
                a=float(value.get("a", 1.0)),
            )
        else:
            raise ProcessingError(
                "Color value must be [r, g, b, a] or {r, g, b, a}",
                operation="niagara_set_parameter",
                details={"value": value},
            )
        nc.set_variable_linear_color(parameter_name, color)

    log_debug(f"Set parameter '{parameter_name}'={value} ({value_type}) on {actor_name}")

    return {
        "success": True,
        "actorName": actor_name,
        "parameterName": parameter_name,
        "valueType": value_type,
        "appliedValue": value,
    }


@handle_unreal_errors("niagara_list_templates")
@safe_operation("niagara")
def list_templates() -> dict[str, Any]:
    """List available built-in Niagara system templates.

    Returns:
        Dictionary with available templates and their descriptions
    """
    templates = []
    for name, info in _BUILTIN_TEMPLATES.items():
        exists = unreal.EditorAssetLibrary.does_asset_exist(info["source"])
        templates.append(
            {
                "name": name,
                "description": info["description"],
                "source": info["source"],
                "available": exists,
            }
        )

    return {
        "success": True,
        "templates": templates,
        "count": len(templates),
    }
