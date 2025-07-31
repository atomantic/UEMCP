"""
UEMCP Actor Operations - All actor-related operations
"""

import unreal
import time
from utils import (
    create_vector, create_rotator, create_transform,
    find_actor_by_name, load_asset, log_debug, log_error
)


class ActorOperations:
    """Handles all actor-related operations."""
    
    def spawn(self, assetPath, location=[0, 0, 100], rotation=[0, 0, 0], 
              scale=[1, 1, 1], name=None, folder=None, validate=True):
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
                name = f'UEMCP_Actor_{int(time.time())}'
            
            # Create transform
            ue_location, ue_rotation, ue_scale = create_transform(location, rotation, scale)
            
            # Load asset
            asset = load_asset(assetPath)
            if not asset:
                return {'success': False, 'error': f'Could not load asset: {assetPath}'}
            
            # Spawn based on asset type
            actor = None
            if isinstance(asset, unreal.StaticMesh):
                # Spawn static mesh actor
                actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
                    unreal.StaticMeshActor.static_class(),
                    ue_location,
                    ue_rotation
                )
                
                if actor:
                    # Set mesh
                    mesh_comp = actor.get_editor_property('static_mesh_component')
                    mesh_comp.set_static_mesh(asset)
                    
            elif isinstance(asset, unreal.Blueprint):
                # Spawn blueprint actor
                actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
                    asset,
                    ue_location,
                    ue_rotation
                )
            else:
                return {'success': False, 'error': f'Unsupported asset type: {type(asset).__name__}'}
            
            if not actor:
                return {'success': False, 'error': 'Failed to spawn actor'}
            
            # Configure actor
            actor.set_actor_label(name)
            actor.set_actor_scale3d(ue_scale)
            
            if folder:
                actor.set_folder_path(folder)
            
            log_debug(f"Spawned {name} at {location}")
            
            # Prepare response
            result = {
                'success': True,
                'actorName': name,
                'location': location,
                'rotation': rotation,
                'scale': scale,
                'assetPath': assetPath,
                'message': f'Created {name} at {location}'
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
                    expected_folder=folder
                )
                result['validated'] = validation_result.success
                if validation_result.errors:
                    result['validation_errors'] = validation_result.errors
                if validation_result.warnings:
                    result['validation_warnings'] = validation_result.warnings
            
            return result
            
        except Exception as e:
            log_error(f"Failed to spawn actor: {str(e)}")
            return {'success': False, 'error': str(e)}
    
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
                return {'success': False, 'error': f'Actor not found: {actorName}'}
            
            # Delete the actor
            unreal.EditorLevelLibrary.destroy_actor(actor)
            log_debug(f"Deleted actor {actorName}")
            
            result = {
                'success': True,
                'message': f'Deleted actor: {actorName}'
            }
            
            # Add validation if requested
            if validate:
                from utils import validate_actor_deleted
                validation_result = validate_actor_deleted(actorName)
                result['validated'] = validation_result.success
                if validation_result.errors:
                    result['validation_errors'] = validation_result.errors
                if validation_result.warnings:
                    result['validation_warnings'] = validation_result.warnings
            
            return result
            
        except Exception as e:
            log_error(f"Failed to delete actor: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def modify(self, actorName, location=None, rotation=None, scale=None, 
               folder=None, mesh=None, validate=True):
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
                return {'success': False, 'error': f'Actor not found: {actorName}'}
            
            # Apply modifications
            if location is not None:
                ue_location = create_vector(location)
                actor.set_actor_location(ue_location, False, False)
            
            if rotation is not None:
                ue_rotation = create_rotator(rotation)
                actor.set_actor_rotation(ue_rotation, False)
            
            if scale is not None:
                ue_scale = create_vector(scale)
                actor.set_actor_scale3d(ue_scale)
            
            if folder is not None:
                actor.set_folder_path(folder)
            
            if mesh is not None:
                # Change static mesh for StaticMeshActors
                mesh_component = actor.get_component_by_class(unreal.StaticMeshComponent)
                if mesh_component:
                    # Try to load the new mesh
                    new_mesh = load_asset(mesh)
                    if new_mesh:
                        mesh_component.set_static_mesh(new_mesh)
                        actor.modify()  # Force update
                    else:
                        return {'success': False, 'error': f'Could not load mesh: {mesh}'}
                else:
                    return {'success': False, 'error': f'Actor {actorName} does not have a StaticMeshComponent'}
            
            # Get updated transform
            current_location = actor.get_actor_location()
            current_rotation = actor.get_actor_rotation()
            current_scale = actor.get_actor_scale3d()
            
            result = {
                'success': True,
                'actorName': actorName,
                'location': [current_location.x, current_location.y, current_location.z],
                'rotation': [current_rotation.roll, current_rotation.pitch, current_rotation.yaw],
                'scale': [current_scale.x, current_scale.y, current_scale.z],
                'message': f'Modified actor: {actorName}'
            }
            
            # Add validation if requested
            if validate:
                from utils import validate_actor_modifications
                modifications = {}
                if location is not None:
                    modifications['location'] = location
                if rotation is not None:
                    modifications['rotation'] = rotation
                if scale is not None:
                    modifications['scale'] = scale
                if folder is not None:
                    modifications['folder'] = folder
                if mesh is not None:
                    modifications['mesh'] = mesh
                
                validation_result = validate_actor_modifications(actor, modifications)
                result['validated'] = validation_result.success
                if validation_result.errors:
                    result['validation_errors'] = validation_result.errors
                if validation_result.warnings:
                    result['validation_warnings'] = validation_result.warnings
            
            return result
            
        except Exception as e:
            log_error(f"Failed to modify actor: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def duplicate(self, sourceName, name=None, offset={'x': 0, 'y': 0, 'z': 0}, validate=True):
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
                return {'success': False, 'error': f'Source actor "{sourceName}" not found'}
            
            # Get source properties
            source_location = source_actor.get_actor_location()
            source_rotation = source_actor.get_actor_rotation()
            source_scale = source_actor.get_actor_scale3d()
            
            # Calculate new location with offset
            new_location = unreal.Vector(
                source_location.x + offset.get('x', 0),
                source_location.y + offset.get('y', 0),
                source_location.z + offset.get('z', 0)
            )
            
            # Duplicate based on actor type
            new_actor = None
            if hasattr(source_actor, 'static_mesh_component'):
                mesh_component = source_actor.static_mesh_component
                if mesh_component and mesh_component.static_mesh:
                    # Spawn new actor with same mesh
                    new_actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
                        mesh_component.static_mesh,
                        new_location,
                        source_rotation
                    )
            
            if not new_actor:
                return {'success': False, 'error': 'Failed to duplicate actor'}
            
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
                'success': True,
                'actorName': new_actor.get_actor_label(),
                'location': {
                    'x': float(new_location.x),
                    'y': float(new_location.y),
                    'z': float(new_location.z)
                }
            }
            
            # Add validation if requested
            if validate:
                from utils import validate_actor_spawn
                validation_result = validate_actor_spawn(
                    new_actor.get_actor_label(),
                    expected_location=[new_location.x, new_location.y, new_location.z],
                    expected_rotation=[source_rotation.roll, source_rotation.pitch, source_rotation.yaw],
                    expected_scale=[source_scale.x, source_scale.y, source_scale.z],
                    expected_folder=str(source_folder) if source_folder else None
                )
                result['validated'] = validation_result.success
                if validation_result.errors:
                    result['validation_errors'] = validation_result.errors
                if validation_result.warnings:
                    result['validation_warnings'] = validation_result.warnings
            
            return result
            
        except Exception as e:
            log_error(f"Failed to duplicate actor: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def organize(self, actors=None, pattern=None, folder=''):
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
                return {'success': False, 'error': 'Folder path is required'}
            
            editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
            all_actors = editor_actor_subsystem.get_all_level_actors()
            
            organized_actors = []
            
            # If specific actors are provided
            if actors:
                for actor in all_actors:
                    try:
                        if actor and hasattr(actor, 'get_actor_label'):
                            actor_name = actor.get_actor_label()
                            if actor_name in actors:
                                actor.set_folder_path(folder)
                                organized_actors.append(actor_name)
                    except:
                        continue
            
            # If pattern is provided
            elif pattern:
                for actor in all_actors:
                    try:
                        if actor and hasattr(actor, 'get_actor_label'):
                            actor_name = actor.get_actor_label()
                            if pattern in actor_name:
                                actor.set_folder_path(folder)
                                organized_actors.append(actor_name)
                    except:
                        continue
            
            organized_actors.sort()
            
            return {
                'success': True,
                'count': len(organized_actors),
                'organizedActors': organized_actors,
                'folder': folder,
                'message': f'Organized {len(organized_actors)} actors into {folder}'
            }
            
        except Exception as e:
            log_error(f"Failed to organize actors: {str(e)}")
            return {'success': False, 'error': str(e)}