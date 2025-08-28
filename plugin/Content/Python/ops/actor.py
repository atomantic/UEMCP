"""
UEMCP Actor Operations - All actor-related operations
"""

import unreal
import time
from utils import create_vector, create_rotator, create_transform, find_actor_by_name, load_asset, log_debug, log_error


class ActorOperations:
    """Handles all actor-related operations."""

    def spawn(
        self,
        assetPath,
        location=[0, 0, 100],
        rotation=[0, 0, 0],
        scale=[1, 1, 1],
        name=None,
        folder=None,
        validate=True,
    ):
        """Spawn an actor in the level.

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
        """
        try:
            # Generate name if not provided
            if not name:
                name = f"UEMCP_Actor_{int(time.time())}"

            # Create transform
            ue_location, ue_rotation, ue_scale = create_transform(location, rotation, scale)

            # Load asset
            asset = load_asset(assetPath)
            if not asset:
                return {"success": False, "error": f"Could not load asset: {assetPath}"}

            # Spawn based on asset type
            actor = None
            if isinstance(asset, unreal.StaticMesh):
                # Spawn static mesh actor
                actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
                    unreal.StaticMeshActor.static_class(), ue_location, ue_rotation
                )

                if actor:
                    # Set mesh
                    mesh_comp = actor.get_editor_property("static_mesh_component")
                    mesh_comp.set_static_mesh(asset)

            elif isinstance(asset, unreal.Blueprint):
                # Spawn blueprint actor
                actor = unreal.EditorLevelLibrary.spawn_actor_from_object(asset, ue_location, ue_rotation)
            else:
                return {"success": False, "error": f"Unsupported asset type: {type(asset).__name__}"}

            if not actor:
                return {"success": False, "error": "Failed to spawn actor"}

            # Configure actor
            actor.set_actor_label(name)
            actor.set_actor_scale3d(ue_scale)

            if folder:
                actor.set_folder_path(folder)

            log_debug(f"Spawned {name} at {location}")

            # Prepare response
            result = {
                "success": True,
                "actorName": name,
                "location": location,
                "rotation": rotation,
                "scale": scale,
                "assetPath": assetPath,
                "message": f"Created {name} at {location}",
            }

            # Add validation if requested
            if validate:
                from utils import validate_actor_spawn

                validation_result = validate_actor_spawn(
                    name,
                    expected_location=location,
                    expected_rotation=rotation,
                    expected_scale=scale,
                    expected_mesh_path=assetPath if isinstance(asset, unreal.StaticMesh) else None,
                    expected_folder=folder,
                )
                result["validated"] = validation_result.success
                if validation_result.errors:
                    result["validation_errors"] = validation_result.errors
                if validation_result.warnings:
                    result["validation_warnings"] = validation_result.warnings

            return result

        except Exception as e:
            log_error(f"Failed to spawn actor: {str(e)}")
            return {"success": False, "error": str(e)}

    def delete(self, actorName, validate=True):
        """Delete an actor from the level.

        Args:
            actorName: Name of the actor to delete
            validate: Whether to validate the deletion

        Returns:
            dict: Result with success status
        """
        try:
            actor = find_actor_by_name(actorName)

            if not actor:
                return {"success": False, "error": f"Actor not found: {actorName}"}

            # Delete the actor
            unreal.EditorLevelLibrary.destroy_actor(actor)
            log_debug(f"Deleted actor {actorName}")

            result = {"success": True, "message": f"Deleted actor: {actorName}"}

            # Add validation if requested
            if validate:
                from utils import validate_actor_deleted

                validation_result = validate_actor_deleted(actorName)
                result["validated"] = validation_result.success
                if validation_result.errors:
                    result["validation_errors"] = validation_result.errors
                if validation_result.warnings:
                    result["validation_warnings"] = validation_result.warnings

            return result

        except Exception as e:
            log_error(f"Failed to delete actor: {str(e)}")
            return {"success": False, "error": str(e)}

    def modify(self, actorName, location=None, rotation=None, scale=None, folder=None, mesh=None, validate=True):
        """Modify properties of an existing actor.

        Args:
            actorName: Name of the actor to modify
            location: New [X, Y, Z] location
            rotation: New [Roll, Pitch, Yaw] rotation
            scale: New [X, Y, Z] scale
            folder: New World Outliner folder
            mesh: New static mesh asset path
            validate: Whether to validate the modifications

        Returns:
            dict: Result with success status and new properties
        """
        try:
            actor = find_actor_by_name(actorName)
            if not actor:
                return {"success": False, "error": f"Actor not found: {actorName}"}

            # Apply all modifications
            modifications = self._apply_actor_modifications(
                actor, location, rotation, scale, folder, mesh
            )
            if not modifications["success"]:
                return modifications

            # Build result
            result = self._build_modification_result(actor, actorName)

            # Add validation if requested
            if validate:
                self._add_validation_to_result(
                    result, actor, location, rotation, scale, folder, mesh
                )

            return result

        except Exception as e:
            log_error(f"Failed to modify actor: {str(e)}")
            return {"success": False, "error": str(e)}

    def _apply_actor_modifications(self, actor, location, rotation, scale, folder, mesh):
        """Apply modifications to an actor.

        Args:
            actor: Actor to modify
            location: New location or None
            rotation: New rotation or None
            scale: New scale or None
            folder: New folder or None
            mesh: New mesh path or None

        Returns:
            dict: Success status and error if any
        """
        # Apply transform modifications
        if location is not None:
            actor.set_actor_location(create_vector(location), False, False)

        if rotation is not None:
            actor.set_actor_rotation(create_rotator(rotation), False)

        if scale is not None:
            actor.set_actor_scale3d(create_vector(scale))

        if folder is not None:
            actor.set_folder_path(folder)

        # Apply mesh modification if needed
        if mesh is not None:
            mesh_result = self._apply_mesh_modification(actor, mesh)
            if not mesh_result["success"]:
                return mesh_result

        return {"success": True}

    def _apply_mesh_modification(self, actor, mesh_path):
        """Apply mesh modification to an actor.

        Args:
            actor: Actor to modify
            mesh_path: Path to new mesh

        Returns:
            dict: Success status and error if any
        """
        mesh_component = actor.get_component_by_class(unreal.StaticMeshComponent)
        if not mesh_component:
            return {
                "success": False,
                "error": f"Actor {actor.get_actor_label()} does not have a StaticMeshComponent"
            }

        new_mesh = load_asset(mesh_path)
        if not new_mesh:
            return {"success": False, "error": f"Could not load mesh: {mesh_path}"}

        mesh_component.set_static_mesh(new_mesh)
        actor.modify()  # Force update
        return {"success": True}

    def _build_modification_result(self, actor, actor_name):
        """Build the result dictionary after modifications.

        Args:
            actor: Modified actor
            actor_name: Name of the actor

        Returns:
            dict: Result with actor properties
        """
        current_location = actor.get_actor_location()
        current_rotation = actor.get_actor_rotation()
        current_scale = actor.get_actor_scale3d()

        return {
            "success": True,
            "actorName": actor_name,
            "location": [current_location.x, current_location.y, current_location.z],
            "rotation": [current_rotation.roll, current_rotation.pitch, current_rotation.yaw],
            "scale": [current_scale.x, current_scale.y, current_scale.z],
            "message": f"Modified actor: {actor_name}",
        }

    def _add_validation_to_result(self, result, actor, location, rotation, scale, folder, mesh):
        """Add validation information to the result.

        Args:
            result: Result dictionary to update
            actor: Actor that was modified
            location: Location modification or None
            rotation: Rotation modification or None
            scale: Scale modification or None
            folder: Folder modification or None
            mesh: Mesh modification or None
        """
        from utils import validate_actor_modifications

        # Build modifications dict
        modifications = {}
        for key, value in [
            ("location", location),
            ("rotation", rotation),
            ("scale", scale),
            ("folder", folder),
            ("mesh", mesh),
        ]:
            if value is not None:
                modifications[key] = value

        validation_result = validate_actor_modifications(actor, modifications)
        result["validated"] = validation_result.success
        if validation_result.errors:
            result["validation_errors"] = validation_result.errors
        if validation_result.warnings:
            result["validation_warnings"] = validation_result.warnings

    def duplicate(self, sourceName, name=None, offset={"x": 0, "y": 0, "z": 0}, validate=True):
        """Duplicate an existing actor.

        Args:
            sourceName: Name of the actor to duplicate
            name: Name for the new actor
            offset: Position offset from source
            validate: Whether to validate the duplication

        Returns:
            dict: Result with success status and new actor details
        """
        try:
            source_actor = find_actor_by_name(sourceName)

            if not source_actor:
                return {"success": False, "error": f'Source actor "{sourceName}" not found'}

            # Get source properties
            source_location = source_actor.get_actor_location()
            source_rotation = source_actor.get_actor_rotation()
            source_scale = source_actor.get_actor_scale3d()

            # Calculate new location with offset
            new_location = unreal.Vector(
                source_location.x + offset.get("x", 0),
                source_location.y + offset.get("y", 0),
                source_location.z + offset.get("z", 0),
            )

            # Duplicate based on actor type
            new_actor = None
            if hasattr(source_actor, "static_mesh_component"):
                mesh_component = source_actor.static_mesh_component
                if mesh_component and mesh_component.static_mesh:
                    # Spawn new actor with same mesh
                    new_actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
                        mesh_component.static_mesh, new_location, source_rotation
                    )

            if not new_actor:
                return {"success": False, "error": "Failed to duplicate actor"}

            # Configure new actor
            new_actor.set_actor_scale3d(source_scale)

            if name:
                new_actor.set_actor_label(name)
            else:
                new_actor.set_actor_label(f"{sourceName}_Copy")

            # Copy folder path
            source_folder = source_actor.get_folder_path()
            if source_folder:
                new_actor.set_folder_path(source_folder)

            log_debug(f"Duplicated actor {sourceName} to {new_actor.get_actor_label()}")

            result = {
                "success": True,
                "actorName": new_actor.get_actor_label(),
                "location": {"x": float(new_location.x), "y": float(new_location.y), "z": float(new_location.z)},
            }

            # Add validation if requested
            if validate:
                from utils import validate_actor_spawn

                validation_result = validate_actor_spawn(
                    new_actor.get_actor_label(),
                    expected_location=[new_location.x, new_location.y, new_location.z],
                    expected_rotation=[source_rotation.roll, source_rotation.pitch, source_rotation.yaw],
                    expected_scale=[source_scale.x, source_scale.y, source_scale.z],
                    expected_folder=str(source_folder) if source_folder else None,
                )
                result["validated"] = validation_result.success
                if validation_result.errors:
                    result["validation_errors"] = validation_result.errors
                if validation_result.warnings:
                    result["validation_warnings"] = validation_result.warnings

            return result

        except Exception as e:
            log_error(f"Failed to duplicate actor: {str(e)}")
            return {"success": False, "error": str(e)}

    def organize(self, actors=None, pattern=None, folder=""):
        """Organize actors into World Outliner folders.

        Args:
            actors: List of specific actor names
            pattern: Pattern to match actor names
            folder: Target folder path

        Returns:
            dict: Result with success status and organized actors
        """
        try:
            if not folder:
                return {"success": False, "error": "Folder path is required"}

            editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
            all_actors = editor_actor_subsystem.get_all_level_actors()

            organized_actors = []

            # If specific actors are provided
            if actors:
                for actor in all_actors:
                    try:
                        if actor and hasattr(actor, "get_actor_label"):
                            actor_name = actor.get_actor_label()
                            if actor_name in actors:
                                actor.set_folder_path(folder)
                                organized_actors.append(actor_name)
                    except Exception:
                        continue

            # If pattern is provided
            elif pattern:
                for actor in all_actors:
                    try:
                        if actor and hasattr(actor, "get_actor_label"):
                            actor_name = actor.get_actor_label()
                            if pattern in actor_name:
                                actor.set_folder_path(folder)
                                organized_actors.append(actor_name)
                    except Exception:
                        continue

            organized_actors.sort()

            return {
                "success": True,
                "count": len(organized_actors),
                "organizedActors": organized_actors,
                "folder": folder,
                "message": f"Organized {len(organized_actors)} actors into {folder}",
            }

        except Exception as e:
            log_error(f"Failed to organize actors: {str(e)}")
            return {"success": False, "error": str(e)}

    def batch_spawn(self, actors, commonFolder=None, validate=True):
        """Spawn multiple actors efficiently in a single operation.

        Args:
            actors: List of actor configurations to spawn
            commonFolder: Optional common folder for all spawned actors
            validate: Whether to validate spawns after creation (default: True).
                     Note: For large batches (>100 actors), validation may add
                     0.5-2 seconds. Set to False for maximum performance if you are
                     confident in the spawn parameters.

        Returns:
            dict: Results with spawned actors and any failures
        """
        import time

        start_time = time.time()

        spawned_actors = []
        failed_spawns = []

        try:
            # Disable viewport updates during batch operation for performance
            viewport_disabled = False
            try:
                unreal.EditorLevelLibrary.set_level_viewport_realtime(False)
                viewport_disabled = True
            except AttributeError as e:
                log_error(f"Failed to disable viewport updates: {str(e)}")
                log_debug(
                    "This Unreal Engine version may not support disabling viewport updates. "
                    "Continuing with normal performance."
                )
            except RuntimeError as e:
                log_error(f"Failed to disable viewport updates due to a runtime error: {str(e)}")
                log_debug("Viewport updates may already be disabled. Continuing with normal performance.")
            except Exception as e:
                log_error(f"Unexpected error while attempting to disable viewport updates: {str(e)}")
                log_debug("An unknown issue occurred. Continuing with normal performance.")

            for actor_config in actors:
                try:
                    # Extract spawn parameters
                    asset_path = actor_config.get("assetPath")
                    if not asset_path:
                        failed_spawns.append({"assetPath": "Unknown", "error": "Missing required assetPath"})
                        continue

                    # Load the asset
                    asset = load_asset(asset_path)
                    if not asset:
                        failed_spawns.append({"assetPath": asset_path, "error": f"Failed to load asset: {asset_path}"})
                        continue

                    # Set up spawn parameters
                    location = unreal.Vector(*actor_config.get("location", [0, 0, 0]))
                    rotation = unreal.Rotator(*actor_config.get("rotation", [0, 0, 0]))
                    scale = unreal.Vector(*actor_config.get("scale", [1, 1, 1]))

                    # Spawn the actor
                    spawned_actor = unreal.EditorLevelLibrary.spawn_actor_from_object(asset, location, rotation)

                    if not spawned_actor:
                        failed_spawns.append(
                            {"assetPath": asset_path, "error": "Spawn failed - check location for collisions"}
                        )
                        continue

                    # Set scale
                    spawned_actor.set_actor_scale3d(scale)

                    # Set name if provided
                    actor_name = actor_config.get("name")
                    if actor_name:
                        spawned_actor.set_actor_label(actor_name)
                    else:
                        # Use default generated name
                        actor_name = spawned_actor.get_actor_label()

                    # Set folder
                    folder = commonFolder or actor_config.get("folder")
                    if folder:
                        spawned_actor.set_folder_path(folder)

                    # Add to results with actor reference for validation
                    spawned_actors.append(
                        {
                            "name": actor_name,
                            "assetPath": asset_path,
                            "location": [location.x, location.y, location.z],
                            "rotation": [rotation.roll, rotation.pitch, rotation.yaw],
                            "scale": [scale.x, scale.y, scale.z],
                            "_actor_ref": spawned_actor,  # Keep reference for validation
                        }
                    )

                except Exception as e:
                    log_error(f"Failed to spawn actor: {str(e)}")
                    failed_spawns.append({"assetPath": actor_config.get("assetPath", "Unknown"), "error": str(e)})

        finally:
            # Re-enable viewport updates only if we successfully disabled them
            if viewport_disabled:
                try:
                    unreal.EditorLevelLibrary.set_level_viewport_realtime(True)
                except Exception as e:
                    log_error(f"Failed to re-enable viewport updates: {str(e)}")

        # Calculate execution time
        execution_time = time.time() - start_time

        # Validate if requested
        if validate and spawned_actors:
            # Optimize validation for large batches
            # For >100 actors, validation can add significant overhead (~0.5-2s)
            if len(spawned_actors) > 100:
                log_debug(f"Validating {len(spawned_actors)} actors - this may take a moment...")

            # Efficient validation - check actor references directly
            validation_failed = []
            validated_spawned_actors = []

            for actor_data in spawned_actors:
                actor_ref = actor_data.get("_actor_ref")

                # Check if actor is valid
                if actor_ref and unreal.EditorLevelLibrary.is_actor_valid(actor_ref):
                    # Create clean actor data without '_actor_ref'
                    clean_actor_data = {k: v for k, v in actor_data.items() if k != "_actor_ref"}
                    validated_spawned_actors.append(clean_actor_data)
                else:
                    validation_failed.append(actor_data["name"])
                    # Don't include invalid actors in the final success list

            # Replace spawned_actors with validated list
            spawned_actors = validated_spawned_actors

            if validation_failed:
                log_error(f"Validation failed for actors: {validation_failed}")
                # Add failed actors to the failed_spawns list
                for failed_name in validation_failed:
                    failed_spawns.append(
                        {"assetPath": "Unknown", "error": f"Actor {failed_name} failed validation - not found in level"}
                    )
        else:
            # Clean up _actor_ref from spawned_actors even when validation is disabled
            spawned_actors = [
                {k: v for k, v in actor_data.items() if k != "_actor_ref"} for actor_data in spawned_actors
            ]

        return {
            "success": True,
            "spawnedActors": spawned_actors,
            "failedSpawns": failed_spawns,
            "totalRequested": len(actors),
            "executionTime": execution_time,
        }

    def placement_validate(self, actors, tolerance=10.0, checkAlignment=True, modularSize=300.0):
        """Validate placement of modular building components.

        Detects gaps, overlaps, and alignment issues in modular building placement.
        Essential for ensuring proper modular building assembly.

        Args:
            actors: List of actor names to validate
            tolerance: Acceptable gap/overlap distance (default: 10.0 units)
            checkAlignment: Whether to check modular grid alignment (default: True)
            modularSize: Size of modular grid in units (default: 300.0 for ModularOldTown)

        Returns:
            dict: Detailed validation results with gaps, overlaps, and alignment issues
        """
        import time
#         import math

        start_time = time.time()

        # Constants
        GAP_THRESHOLD = 3  # Maximum number of gaps before marking as major issues

        try:
            # Find all actors to validate
            actor_objects = []
            missing_actors = []

            for actor_name in actors:
                actor = find_actor_by_name(actor_name)
                if actor:
                    actor_objects.append(actor)
                else:
                    missing_actors.append(actor_name)

            if missing_actors:
                return {"success": False, "error": f'Actors not found: {", ".join(missing_actors)}'}

            if len(actor_objects) < 2:
                return {"success": False, "error": "At least 2 actors are required for placement validation"}

            # Get actor bounds and positions
            actor_data = []
            for actor in actor_objects:
                try:
                    location = actor.get_actor_location()
                    bounds = actor.get_actor_bounds(only_colliding_components=False)

                    # Get bounding box
                    box_extent = bounds[1]  # bounds[1] is the extent (half-size)

                    actor_info = {
                        "actor": actor,
                        "name": actor.get_actor_label(),
                        "location": [location.x, location.y, location.z],
                        "bounds_min": [location.x - box_extent.x, location.y - box_extent.y, location.z - box_extent.z],
                        "bounds_max": [location.x + box_extent.x, location.y + box_extent.y, location.z + box_extent.z],
                        "size": [box_extent.x * 2, box_extent.y * 2, box_extent.z * 2],
                    }
                    actor_data.append(actor_info)

                except Exception as e:
                    log_error(f"Failed to get bounds for actor {actor.get_actor_label()}: {str(e)}")
                    continue

            if len(actor_data) < 2:
                return {"success": False, "error": "Could not get bounds for enough actors to perform validation"}

            # Detect gaps and overlaps
            gaps = []
            overlaps = []

            for i, actor1 in enumerate(actor_data):
                for j, actor2 in enumerate(actor_data):
                    if i >= j:  # Avoid duplicate checks
                        continue

                    # Calculate distances between bounding boxes
                    gap_overlap = self._calculate_gap_overlap(actor1, actor2, tolerance)

                    if gap_overlap["type"] == "gap" and gap_overlap["distance"] > tolerance:
                        gaps.append(
                            {
                                "location": gap_overlap["location"],
                                "distance": gap_overlap["distance"],
                                "actors": [actor1["name"], actor2["name"]],
                                "direction": gap_overlap["direction"],
                            }
                        )
                    elif gap_overlap["type"] == "overlap" and gap_overlap["distance"] > tolerance:
                        # Determine overlap severity
                        severity = "minor"
                        if gap_overlap["distance"] > modularSize * 0.1:  # >10% of modular size
                            severity = "major"
                        if gap_overlap["distance"] > modularSize * 0.25:  # >25% of modular size
                            severity = "critical"

                        overlaps.append(
                            {
                                "location": gap_overlap["location"],
                                "amount": gap_overlap["distance"],
                                "actors": [actor1["name"], actor2["name"]],
                                "severity": severity,
                            }
                        )

            # Check alignment to modular grid
            alignment_issues = []
            if checkAlignment:
                for actor_info in actor_data:
                    alignment_issue = self._check_modular_alignment(actor_info, modularSize, tolerance)
                    if alignment_issue:
                        alignment_issues.append(alignment_issue)

            # Calculate summary statistics
            total_issues = len(gaps) + len(overlaps) + len(alignment_issues)
            critical_overlaps = len([o for o in overlaps if o["severity"] == "critical"])
            major_overlaps = len([o for o in overlaps if o["severity"] == "major"])

            # Determine overall status
            if critical_overlaps > 0:
                overall_status = "critical_issues"
            elif major_overlaps > 0 or len(gaps) > GAP_THRESHOLD:
                overall_status = "major_issues"
            elif total_issues > 0:
                overall_status = "minor_issues"
            else:
                overall_status = "good"

            execution_time = time.time() - start_time

            return {
                "success": True,
                "gaps": gaps,
                "overlaps": overlaps,
                "alignmentIssues": alignment_issues,
                "summary": {
                    "totalActors": len(actor_data),
                    "gapsFound": len(gaps),
                    "overlapsFound": len(overlaps),
                    "alignmentIssuesFound": len(alignment_issues),
                    "overallStatus": overall_status,
                },
                "executionTime": execution_time,
            }

        except Exception as e:
            log_error(f"Failed to validate placement: {str(e)}")
            return {"success": False, "error": str(e)}

    def _calculate_gap_overlap(self, actor1, actor2, tolerance):
        """Calculate gap or overlap between two actors."""

        # Calculate minimum distance between bounding boxes on each axis
        x_gap = max(
            0, max(actor1["bounds_min"][0] - actor2["bounds_max"][0], actor2["bounds_min"][0] - actor1["bounds_max"][0])
        )
        y_gap = max(
            0, max(actor1["bounds_min"][1] - actor2["bounds_max"][1], actor2["bounds_min"][1] - actor1["bounds_max"][1])
        )
        z_gap = max(
            0, max(actor1["bounds_min"][2] - actor2["bounds_max"][2], actor2["bounds_min"][2] - actor1["bounds_max"][2])
        )

        # Calculate overlap on each axis
        x_overlap = max(
            0,
            min(actor1["bounds_max"][0], actor2["bounds_max"][0])
            - max(actor1["bounds_min"][0], actor2["bounds_min"][0]),
        )
        y_overlap = max(
            0,
            min(actor1["bounds_max"][1], actor2["bounds_max"][1])
            - max(actor1["bounds_min"][1], actor2["bounds_min"][1]),
        )
        z_overlap = max(
            0,
            min(actor1["bounds_max"][2], actor2["bounds_max"][2])
            - max(actor1["bounds_min"][2], actor2["bounds_min"][2]),
        )

        # Find the primary axis (smallest gap or largest overlap)
        gaps = [x_gap, y_gap, z_gap]
        overlaps = [x_overlap, y_overlap, z_overlap]
        axis_names = ["X", "Y", "Z"]

        # If there's any gap, find the smallest gap
        if any(gap > 0 for gap in gaps):
            min_gap_index = gaps.index(min(gap for gap in gaps if gap > 0))
            min_gap = gaps[min_gap_index]

            # Calculate midpoint location for gap
            midpoint = [
                (actor1["location"][0] + actor2["location"][0]) / 2,
                (actor1["location"][1] + actor2["location"][1]) / 2,
                (actor1["location"][2] + actor2["location"][2]) / 2,
            ]

            return {"type": "gap", "distance": min_gap, "location": midpoint, "direction": axis_names[min_gap_index]}

        # If there's overlap, find the largest overlap
        elif any(overlap > 0 for overlap in overlaps):
            max_overlap_index = overlaps.index(max(overlaps))
            max_overlap = overlaps[max_overlap_index]

            # Calculate overlap center location
            overlap_center = [
                (
                    max(actor1["bounds_min"][0], actor2["bounds_min"][0])
                    + min(actor1["bounds_max"][0], actor2["bounds_max"][0])
                )
                / 2,
                (
                    max(actor1["bounds_min"][1], actor2["bounds_min"][1])
                    + min(actor1["bounds_max"][1], actor2["bounds_max"][1])
                )
                / 2,
                (
                    max(actor1["bounds_min"][2], actor2["bounds_min"][2])
                    + min(actor1["bounds_max"][2], actor2["bounds_max"][2])
                )
                / 2,
            ]

            return {
                "type": "overlap",
                "distance": max_overlap,
                "location": overlap_center,
                "direction": axis_names[max_overlap_index],
            }

        # Actors are touching (within tolerance)
        return {
            "type": "touching",
            "distance": 0,
            "location": [
                (actor1["location"][0] + actor2["location"][0]) / 2,
                (actor1["location"][1] + actor2["location"][1]) / 2,
                (actor1["location"][2] + actor2["location"][2]) / 2,
            ],
            "direction": "None",
        }

    def _check_modular_alignment(self, actor_info, modular_size, tolerance):
        """Check if an actor is aligned to the modular grid."""
        location = actor_info["location"]
        name = actor_info["name"]

        # Only X and Y axes are checked for alignment because Z is typically not critical for modular building pieces.
        # Check alignment on X and Y axes (Z is usually fine for building pieces)

        for axis_index, axis_name in enumerate(["X", "Y"]):
            coord = location[axis_index]

            # Find nearest grid position
            nearest_grid = round(coord / modular_size) * modular_size
            offset = coord - nearest_grid

            if abs(offset) > tolerance:
                # Create suggested position
                suggested_location = location.copy()
                suggested_location[axis_index] = nearest_grid

                # Create offset array with proper indexing
                offset_array = [0, 0, 0]
                offset_array[axis_index] = offset

                return {
                    "actor": name,
                    "currentLocation": location,
                    "suggestedLocation": suggested_location,
                    "offset": offset_array,
                    "axis": axis_name,
                }

        return None

    def snap_to_socket(
        self, sourceActor, targetActor, targetSocket, sourceSocket=None, offset=[0, 0, 0], validate=True
    ):
        """Snap an actor to another actor's socket for precise modular placement.

        Args:
            sourceActor: Name of the actor to snap (will be moved)
            targetActor: Name of the target actor with the socket
            targetSocket: Name of the socket on the target actor
            sourceSocket: Optional socket on source actor to align (defaults to pivot)
            offset: Optional offset from socket position [X, Y, Z]
            validate: Whether to validate the snap operation

        Returns:
            dict: Result with new location and rotation
        """
        try:
            # Find the actors
            source = find_actor_by_name(sourceActor)
            if not source:
                return {"success": False, "error": f"Source actor not found: {sourceActor}"}

            target = find_actor_by_name(targetActor)
            if not target:
                return {"success": False, "error": f"Target actor not found: {targetActor}"}

            # Get the target socket transform
            socket_transform = None

            # Try to get socket from static mesh component
            if hasattr(target, "static_mesh_component"):
                mesh_comp = target.static_mesh_component
                if mesh_comp:
                    static_mesh = mesh_comp.get_static_mesh()
                    if static_mesh:
                        # Get socket transform relative to component
                        socket_found = static_mesh.find_socket(targetSocket)
                        if socket_found:
                            # Get world transform of the socket
                            socket_transform = mesh_comp.get_socket_transform(targetSocket)
                        else:
                            # Try to list available sockets for debugging
                            sockets = static_mesh.get_sockets()
                            socket_names = [s.socket_name for s in sockets] if sockets else []
                            return {
                                "success": False,
                                "error": f'Socket "{targetSocket}" not found on {targetActor}',
                                "availableSockets": socket_names,
                            }

            # If socket not found on static mesh, try blueprint components
            if not socket_transform:
                # Try to get socket from any scene component
                components = target.get_components_by_class(unreal.SceneComponent)
                for comp in components:
                    if comp.does_socket_exist(targetSocket):
                        socket_transform = comp.get_socket_transform(targetSocket)
                        break

            if not socket_transform:
                return {
                    "success": False,
                    "error": f'Socket "{targetSocket}" not found on any component of {targetActor}',
                }

            # Calculate new transform for source actor
            new_location = socket_transform.translation
            new_rotation = socket_transform.rotation.rotator()

            # Apply offset if provided
            if offset and any(v != 0 for v in offset):
                offset_vector = unreal.Vector(offset[0], offset[1], offset[2])
                # Transform offset to world space using socket rotation
                rotated_offset = new_rotation.rotate_vector(offset_vector)
                new_location = new_location + rotated_offset

            # If source socket is specified, calculate additional offset
            if sourceSocket:
                # Get source socket transform relative to source actor
                source_socket_found = False

                if hasattr(source, "static_mesh_component"):
                    mesh_comp = source.static_mesh_component
                    if mesh_comp and mesh_comp.does_socket_exist(sourceSocket):
                        # Get socket location relative to actor
                        source_socket_transform = mesh_comp.get_socket_transform(
                            sourceSocket, unreal.RelativeTransformSpace.RTS_ACTOR
                        )
                        # Adjust position to align source socket with target socket
                        new_location = new_location - source_socket_transform.translation
                        source_socket_found = True

                if not source_socket_found:
                    log_debug(f"Warning: Source socket '{sourceSocket}' not found, using actor pivot")

            # Apply the new transform to the source actor
            source.set_actor_location(new_location, sweep=False, teleport=True)
            source.set_actor_rotation(new_rotation)

            log_debug(f"Snapped {sourceActor} to {targetActor}'s socket '{targetSocket}'")

            # Prepare response
            result = {
                "success": True,
                "sourceActor": sourceActor,
                "targetActor": targetActor,
                "targetSocket": targetSocket,
                "newLocation": [new_location.x, new_location.y, new_location.z],
                "newRotation": [new_rotation.roll, new_rotation.pitch, new_rotation.yaw],
                "message": f'Snapped {sourceActor} to {targetActor} socket "{targetSocket}"',
            }

            if sourceSocket:
                result["sourceSocket"] = sourceSocket

            # Add validation if requested
            if validate:
                actual_loc = source.get_actor_location()
                _ = source.get_actor_rotation()

                location_match = (
                    abs(actual_loc.x - new_location.x) < 0.01
                    and abs(actual_loc.y - new_location.y) < 0.01
                    and abs(actual_loc.z - new_location.z) < 0.01
                )

                if not location_match:
                    result["validation"] = {
                        "success": False,
                        "message": "Actor position does not match expected socket location",
                    }
                else:
                    result["validation"] = {"success": True, "message": "Actor successfully snapped to socket"}

            return result

        except Exception as e:
            log_error(f"Error in snap_to_socket: {str(e)}")
            return {"success": False, "error": f"Failed to snap actor: {str(e)}"}
