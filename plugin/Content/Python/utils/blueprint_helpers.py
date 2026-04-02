"""
Shared Blueprint utility functions used across blueprint_graph and blueprint_nodes modules.

Provides compatibility across UE versions:
- UE 5.4-5.6: Uses Blueprint.simple_construction_script (SCS) + KismetEditorUtilities
- UE 5.7+: Uses SubobjectDataSubsystem + BlueprintEditorLibrary
"""

import unreal

from utils.error_handling import ProcessingError, require_asset


def resolve_blueprint(blueprint_path):
    """Load and validate a Blueprint asset, returning the Blueprint object."""
    bp_asset = require_asset(blueprint_path)
    if not isinstance(bp_asset, unreal.Blueprint):
        raise ProcessingError(
            f"Not a Blueprint asset: {blueprint_path}",
            operation="blueprint",
            details={"asset_path": blueprint_path},
        )
    return bp_asset


def compile_blueprint(blueprint):
    """Compile a Blueprint using the available API.

    Uses KismetEditorUtilities (UE 5.4-5.6) or BlueprintEditorLibrary (UE 5.7+).
    """
    if hasattr(unreal, "KismetEditorUtilities"):
        unreal.KismetEditorUtilities.compile_blueprint(blueprint)
    else:
        unreal.BlueprintEditorLibrary.compile_blueprint(blueprint)


def compile_and_save(blueprint, blueprint_path, force_save=False):
    """Compile and save a Blueprint after modifications.

    Args:
        blueprint: The Blueprint object
        blueprint_path: Asset path for saving
        force_save: If True, save even if package is not marked dirty
                    (needed for CDO property changes that may not dirty the package)
    """
    compile_blueprint(blueprint)
    if force_save:
        unreal.EditorAssetLibrary.save_asset(blueprint_path, only_if_is_dirty=False)
    else:
        unreal.EditorAssetLibrary.save_asset(blueprint_path)


def list_pin_names(node):
    """Get list of available pin names on a node for error reporting."""
    return [str(p.get_editor_property("pin_name")) for p in (node.get_editor_property("pins") or [])]


# ---------------------------------------------------------------------------
# SCS compatibility layer (UE 5.4-5.6 SCS vs UE 5.7+ SubobjectDataSubsystem)
# ---------------------------------------------------------------------------


def _has_legacy_scs(blueprint):
    """Check if the legacy simple_construction_script API is available."""
    return hasattr(blueprint, "simple_construction_script")


def get_scs(blueprint):
    """Get the SimpleConstructionScript for a Blueprint (legacy API only).

    Returns None if the legacy API is unavailable (UE 5.7+).
    Callers should use the subobject helper functions instead.
    """
    if _has_legacy_scs(blueprint):
        return blueprint.simple_construction_script
    return None


def get_subobject_subsystem():
    """Get the SubobjectDataSubsystem (UE 5.7+). Returns None if unavailable."""
    if hasattr(unreal, "SubobjectDataSubsystem"):
        return unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)
    return None


def gather_component_handles(blueprint):
    """Gather all subobject handles for a Blueprint.

    Returns:
        list of (handle, SubobjectData) tuples
    """
    sds = get_subobject_subsystem()
    if not sds:
        return []
    bfl = unreal.SubobjectDataBlueprintFunctionLibrary
    handles = sds.k2_gather_subobject_data_for_blueprint(blueprint)
    result = []
    for h in handles:
        data = sds.k2_find_subobject_data_from_handle(h)
        if data and bfl.is_component(data):
            result.append((h, data))
    return result


def find_root_handle(blueprint):
    """Find the root component handle for a Blueprint.

    Returns:
        SubobjectDataHandle for the root component, or the first actor handle
    """
    sds = get_subobject_subsystem()
    if not sds:
        return None
    bfl = unreal.SubobjectDataBlueprintFunctionLibrary
    handles = sds.k2_gather_subobject_data_for_blueprint(blueprint)
    for h in handles:
        data = sds.k2_find_subobject_data_from_handle(h)
        if data and (bfl.is_root_component(data) or bfl.is_default_scene_root(data)):
            return h
    # Fallback: return first handle (actor root)
    return handles[0] if handles else None


def find_component_handle(blueprint, component_name):
    """Find a component handle by display name.

    Args:
        blueprint: The Blueprint object
        component_name: Display name of the component

    Returns:
        SubobjectDataHandle or None
    """
    sds = get_subobject_subsystem()
    if not sds:
        return None
    bfl = unreal.SubobjectDataBlueprintFunctionLibrary
    handles = sds.k2_gather_subobject_data_for_blueprint(blueprint)
    for h in handles:
        data = sds.k2_find_subobject_data_from_handle(h)
        if not data:
            continue
        display = bfl.get_display_name(data)
        # Match by display name or variable name
        if display == component_name:
            return h
        var_name = str(bfl.get_variable_name(data))
        if var_name == component_name:
            return h
    return None


def get_component_template(handle, blueprint, data=None):
    """Get the component template object from a subobject handle.

    Args:
        handle: SubobjectDataHandle
        blueprint: The Blueprint object
        data: Optional pre-fetched SubobjectData (avoids redundant lookup)

    Returns:
        The component template (UObject), or None
    """
    if not data:
        sds = get_subobject_subsystem()
        if not sds:
            return None
        data = sds.k2_find_subobject_data_from_handle(handle)
    if data:
        return unreal.SubobjectDataBlueprintFunctionLibrary.get_object_for_blueprint(data, blueprint)
    return None


def add_component_subobject(blueprint, component_class, parent_handle=None):
    """Add a component to a Blueprint using SubobjectDataSubsystem.

    Args:
        blueprint: The Blueprint object
        component_class: The UE component class (e.g., unreal.CameraComponent)
        parent_handle: Optional parent SubobjectDataHandle (defaults to root)

    Returns:
        tuple: (SubobjectDataHandle, fail_reason_str)
    """
    sds = get_subobject_subsystem()
    if not sds:
        raise ProcessingError(
            "SubobjectDataSubsystem not available",
            operation="blueprint_add_component",
        )
    parent = parent_handle or find_root_handle(blueprint)
    if not parent:
        raise ProcessingError(
            "No root component found in Blueprint",
            operation="blueprint_add_component",
            details={"blueprint": str(blueprint)},
        )
    params = unreal.AddNewSubobjectParams()
    params.set_editor_property("parent_handle", parent)
    params.set_editor_property("new_class", component_class)
    params.set_editor_property("blueprint_context", blueprint)
    new_handle, fail_reason = sds.add_new_subobject(params)
    return new_handle, str(fail_reason)
