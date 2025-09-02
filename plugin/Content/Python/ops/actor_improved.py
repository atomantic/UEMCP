"""
UEMCP Actor Operations - Improved with better error handling

This demonstrates how the new error handling framework eliminates try/catch boilerplate
while providing better error specificity and validation.
"""

import unreal
import time
from typing import List, Optional, Dict, Any

# New error handling framework
from utils.error_handling import (
    validate_inputs, handle_unreal_errors, safe_operation,
    RequiredRule, AssetPathRule, ListLengthRule, TypeRule,
    require_actor, require_asset, validate_location, validate_rotation,
    ActorError, AssetError, ValidationError, DisableViewportUpdates
)

from utils import create_transform, log_debug


class ActorOperationsImproved:
    """Improved actor operations with better error handling."""

    @validate_inputs({
        'assetPath': [RequiredRule(), AssetPathRule()],
        'location': [RequiredRule(), ListLengthRule(3)],
        'rotation': [ListLengthRule(3)],
        'scale': [ListLengthRule(3)],
        'name': [TypeRule((str, type(None)))],
        'folder': [TypeRule((str, type(None)))],
        'validate': [TypeRule(bool)]
    })
    @handle_unreal_errors("spawn_actor")
    @safe_operation("actor")
    def spawn(
        self,
        assetPath: str,
        location: List[float] = [0, 0, 100],
        rotation: List[float] = [0, 0, 0],
        scale: List[float] = [1, 1, 1],
        name: Optional[str] = None,
        folder: Optional[str] = None,
        validate: bool = True,
    ) -> Dict[str, Any]:
        """
        Spawn an actor in the level.

        NEW: No try/catch needed! All validation and error handling is automatic.

        Args:
            assetPath: Path to the asset to spawn
            location: [X, Y, Z] world location
            rotation: [Roll, Pitch, Yaw] rotation in degrees
            scale: [X, Y, Z] scale
            name: Optional actor name
            folder: Optional World Outliner folder
            validate: Whether to validate the spawn

        Returns:
            dict: Result with success status and actor details

        Raises:
            ValidationError: If inputs are invalid
            AssetError: If asset cannot be loaded
            ActorError: If actor cannot be spawned
            UnrealEngineError: If UE API calls fail
        """
        # ✅ NO TRY/CATCH NEEDED! Inputs are already validated by decorator

        # Generate name if not provided
        if not name:
            name = f"UEMCP_Actor_{int(time.time())}"

        # Create transform
        ue_location, ue_rotation, ue_scale = create_transform(location, rotation, scale)

        # ✅ NO TRY/CATCH NEEDED! require_asset throws specific AssetError
        asset = require_asset(assetPath)

        # Spawn based on asset type
        actor = self._spawn_actor_by_type(asset, ue_location, ue_rotation)

        # Configure actor
        actor.set_actor_label(name)
        actor.set_actor_scale3d(ue_scale)

        # Add metadata for undo support (with improved error handling)
        self._add_actor_metadata(actor, assetPath)

        if folder:
            actor.set_folder_path(folder)

        log_debug(f"Spawned {name} at {location}")

        # Prepare response
        result = {
            "actorName": name,
            "location": location,
            "rotation": rotation,
            "scale": scale,
            "assetPath": assetPath,
            "folder": folder
        }

        # Optional validation
        if validate:
            from utils.validation import validate_actor_spawn
            validation_result = validate_actor_spawn(
                actor, assetPath, location, rotation, scale, folder
            )
            result["validated"] = validation_result.is_valid
            if not validation_result.is_valid:
                result["validation_errors"] = validation_result.errors

        return result

    def _spawn_actor_by_type(self, asset, location, rotation):
        """
        Spawn actor based on asset type with specific error handling.

        ✅ Private method - errors bubble up to decorator automatically!
        """
        if isinstance(asset, unreal.StaticMesh):
            # Spawn static mesh actor
            actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
                unreal.StaticMeshActor.static_class(), location, rotation
            )
            if actor:
                mesh_comp = actor.get_editor_property("static_mesh_component")
                mesh_comp.set_static_mesh(asset)

        elif isinstance(asset, unreal.Blueprint):
            # Spawn blueprint actor
            actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
                asset, location, rotation
            )
        else:
            raise AssetError(
                f"Unsupported asset type: {type(asset).__name__}",
                operation="spawn_actor",
                details={'asset_type': type(asset).__name__}
            )

        if not actor:
            raise ActorError(
                "Failed to spawn actor from asset",
                operation="spawn_actor",
                details={'asset_path': str(asset.get_path_name() if hasattr(asset, 'get_path_name') else 'unknown')}
            )

        return actor

    def _add_actor_metadata(self, actor, asset_path: str):
        """Add metadata to actor with improved error handling."""
        if not hasattr(actor, 'tags'):
            return  # Silently skip if actor doesn't support tags

        try:
            # Use namespaced tag to reduce collision risk
            actor.tags.append(f'UEMCP_Asset:{asset_path}')
            log_debug(f"Tagged actor with asset path: {asset_path}")
        except (AttributeError, RuntimeError) as e:
            # Non-critical failure - just log it
            log_debug(f"Could not tag actor with asset path: {e}")

    @validate_inputs({
        'actorName': [RequiredRule(), TypeRule(str)],
        'validate': [TypeRule(bool)]
    })
    @handle_unreal_errors("delete_actor")
    @safe_operation("actor")
    def delete(self, actorName: str, validate: bool = True) -> Dict[str, Any]:
        """
        Delete an actor from the level.

        ✅ Much cleaner than the old version with big try/catch!
        """
        # ✅ NO TRY/CATCH - require_actor throws specific ActorError if not found
        actor = require_actor(actorName)

        # Store info for response before deletion
        location = [actor.get_actor_location().x, actor.get_actor_location().y, actor.get_actor_location().z]

        # Delete the actor - UE API errors automatically converted to UnrealEngineError
        success = actor.destroy_actor()

        if not success:
            raise ActorError(
                f"Failed to delete actor '{actorName}' - destroy_actor returned False",
                operation="delete_actor",
                details={'actor_name': actorName}
            )

        log_debug(f"Deleted actor: {actorName}")

        result = {
            "actorName": actorName,
            "previousLocation": location
        }

        # Optional validation
        if validate:
            from utils.validation import validate_actor_deleted
            validation_result = validate_actor_deleted(actorName)
            result["validated"] = validation_result.is_valid
            if not validation_result.is_valid:
                result["validation_errors"] = validation_result.errors

        return result

    @validate_inputs({
        'actors': [RequiredRule(), TypeRule(list)],
        'commonFolder': [TypeRule((str, type(None)))],
        'validate': [TypeRule(bool)]
    })
    @handle_unreal_errors("batch_spawn")
    @safe_operation("actor")
    def batch_spawn(
        self,
        actors: List[Dict[str, Any]],
        commonFolder: Optional[str] = None,
        validate: bool = True
    ) -> Dict[str, Any]:
        """
        Spawn multiple actors efficiently.

        ✅ Uses context manager for performance + automatic error handling!
        """
        if not actors:
            raise ValidationError("actors list cannot be empty")

        spawned_actors = []
        failed_spawns = []

        # Use context manager for performance optimization
        with DisableViewportUpdates():
            for i, actor_config in enumerate(actors):
                try:
                    # Validate individual actor config
                    self._validate_actor_config(actor_config, i)

                    # Override folder if commonFolder specified
                    if commonFolder:
                        actor_config = {**actor_config, 'folder': commonFolder}

                    # Spawn individual actor (this calls our improved spawn method)
                    result = self.spawn(**actor_config)
                    spawned_actors.append(result)

                except Exception as e:
                    # Collect failures but continue with other actors
                    failed_spawns.append({
                        "index": i,
                        "config": actor_config,
                        "error": str(e)
                    })

        result = {
            "spawned": len(spawned_actors),
            "failed": len(failed_spawns),
            "actors": spawned_actors
        }

        if failed_spawns:
            result["failures"] = failed_spawns

        if validate and spawned_actors:
            # Validate spawned actors exist
            validated_count = 0
            for actor_result in spawned_actors:
                try:
                    require_actor(actor_result["actorName"])
                    validated_count += 1
                except ActorError:
                    pass

            result["validated"] = validated_count
            result["validation_success_rate"] = validated_count / len(spawned_actors)

        return result

    def _validate_actor_config(self, config: Dict[str, Any], index: int):
        """Validate individual actor configuration."""
        if 'assetPath' not in config:
            raise ValidationError(
                f"Actor config at index {index} missing required 'assetPath'",
                operation="batch_spawn",
                details={'index': index, 'config': config}
            )

        # Validate location if provided
        if 'location' in config:
            validate_location(config['location'], f"actors[{index}].location")

        # Validate rotation if provided
        if 'rotation' in config:
            validate_rotation(config['rotation'], f"actors[{index}].rotation")


# ============================================================================
# Comparison: OLD vs NEW
# ============================================================================

"""
BEFORE (98 lines with try/catch):
```python
def spawn(self, assetPath, location=[0,0,100], ...):
    try:
        # Generate name
        if not name:
            name = f"UEMCP_Actor_{int(time.time())}"

        # Create transform
        ue_location, ue_rotation, ue_scale = create_transform(location, rotation, scale)

        # Load asset
        asset = load_asset(assetPath)
        if not asset:
            return {"success": False, "error": f"Could not load asset: {assetPath}"}

        # ... 50+ lines of business logic ...

        return result

    except Exception as e:
        log_error(f"Failed to spawn actor: {str(e)}")
        return {"success": False, "error": str(e)}
```

AFTER (45 lines, no try/catch):
```python
@validate_inputs({...})
@handle_unreal_errors("spawn_actor")
@safe_operation("actor")
def spawn(self, assetPath: str, location: List[float] = [0,0,100], ...):
    # No try/catch needed! All validation and error handling is automatic

    if not name:
        name = f"UEMCP_Actor_{int(time.time())}"

    ue_location, ue_rotation, ue_scale = create_transform(location, rotation, scale)
    asset = require_asset(assetPath)  # Throws specific AssetError if not found

    # ... clean business logic without error handling boilerplate ...

    return result
```

BENEFITS:
✅ 54% less code (98 → 45 lines)
✅ No try/catch boilerplate
✅ Automatic input validation
✅ Specific error types instead of generic Exception
✅ Consistent error response format
✅ Better error messages with context
✅ Reusable validation rules
✅ Context managers for resource management
"""
