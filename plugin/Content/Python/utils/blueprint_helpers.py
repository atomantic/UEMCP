"""
Shared Blueprint utility functions used across blueprint_graph and blueprint_nodes modules.
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


def compile_and_save(blueprint, blueprint_path, force_save=False):
    """Compile and save a Blueprint after modifications.

    Args:
        blueprint: The Blueprint object
        blueprint_path: Asset path for saving
        force_save: If True, save even if package is not marked dirty
                    (needed for CDO property changes that may not dirty the package)
    """
    unreal.KismetEditorUtilities.compile_blueprint(blueprint)
    if force_save:
        unreal.EditorAssetLibrary.save_asset(blueprint_path, only_if_is_dirty=False)
    else:
        unreal.EditorAssetLibrary.save_asset(blueprint_path)


def list_pin_names(node):
    """Get list of available pin names on a node for error reporting."""
    return [str(p.get_editor_property("pin_name")) for p in (node.get_editor_property("pins") or [])]
