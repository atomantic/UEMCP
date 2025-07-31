"""
UEMCP Utilities - Common utility functions for all modules
"""

import unreal
import os


def create_vector(location_array):
    """Create an Unreal Vector from a 3-element array.
    
    Args:
        location_array: [X, Y, Z] coordinates
        
    Returns:
        unreal.Vector
    """
    return unreal.Vector(
        float(location_array[0]), 
        float(location_array[1]), 
        float(location_array[2])
    )


def create_rotator(rotation_array):
    """Create an Unreal Rotator from a 3-element array.
    
    IMPORTANT: Sets properties explicitly to avoid constructor confusion.
    
    Args:
        rotation_array: [Roll, Pitch, Yaw] in degrees
        
    Returns:
        unreal.Rotator with properties set correctly
    """
    rotator = unreal.Rotator()
    rotator.roll = float(rotation_array[0])   # Roll (X axis rotation)
    rotator.pitch = float(rotation_array[1])  # Pitch (Y axis rotation)
    rotator.yaw = float(rotation_array[2])    # Yaw (Z axis rotation)
    return rotator


def create_transform(location, rotation, scale):
    """Create transform components from arrays.
    
    Args:
        location: [X, Y, Z] array
        rotation: [Roll, Pitch, Yaw] array in degrees
        scale: [X, Y, Z] scale array
        
    Returns:
        tuple: (ue_location, ue_rotation, ue_scale)
    """
    ue_location = create_vector(location)
    ue_rotation = create_rotator(rotation)
    ue_scale = create_vector(scale)
    return ue_location, ue_rotation, ue_scale


def find_actor_by_name(actor_name):
    """Find an actor in the level by name.
    
    Args:
        actor_name: Name of the actor to find
        
    Returns:
        Actor object or None if not found
    """
    editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    all_actors = editor_actor_subsystem.get_all_level_actors()
    
    for actor in all_actors:
        try:
            if actor and hasattr(actor, 'get_actor_label') and actor.get_actor_label() == actor_name:
                return actor
        except:
            # Skip actors that cause errors
            continue
    
    return None


def get_all_actors(filter_text=None, limit=30):
    """Get all actors in the level with optional filtering.
    
    Args:
        filter_text: Optional text to filter actor names/classes
        limit: Maximum number of actors to return
        
    Returns:
        list: List of actor dictionaries with properties
    """
    editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    all_actors = editor_actor_subsystem.get_all_level_actors()
    
    # Apply filter if provided
    if filter_text:
        filtered_actors = []
        filter_lower = filter_text.lower()
        
        for actor in all_actors:
            try:
                if not actor or not hasattr(actor, 'get_actor_label'):
                    continue
                    
                actor_name = actor.get_actor_label().lower()
                actor_class = actor.get_class().get_name().lower()
                
                if filter_lower in actor_name or filter_lower in actor_class:
                    filtered_actors.append(actor)
            except:
                continue
        
        actors_to_process = filtered_actors
    else:
        actors_to_process = [a for a in all_actors if a and hasattr(a, 'get_actor_label')]
    
    # Build actor list with limit
    actor_list = []
    for i, actor in enumerate(actors_to_process):
        if i >= limit:
            break
            
        try:
            location = actor.get_actor_location()
            rotation = actor.get_actor_rotation()
            scale = actor.get_actor_scale3d()
            
            actor_data = {
                'name': actor.get_actor_label(),
                'class': actor.get_class().get_name(),
                'location': {
                    'x': float(location.x),
                    'y': float(location.y),
                    'z': float(location.z)
                },
                'rotation': {
                    'roll': float(rotation.roll),
                    'pitch': float(rotation.pitch),
                    'yaw': float(rotation.yaw)
                },
                'scale': {
                    'x': float(scale.x),
                    'y': float(scale.y),
                    'z': float(scale.z)
                }
            }
            
            # Get asset path for static mesh actors
            if hasattr(actor, 'static_mesh_component'):
                mesh_component = actor.static_mesh_component
                if mesh_component and mesh_component.static_mesh:
                    actor_data['assetPath'] = mesh_component.static_mesh.get_path_name().split(':')[0]
            
            actor_list.append(actor_data)
        except:
            continue
    
    return actor_list


def get_project_info():
    """Get current project information.
    
    Returns:
        dict: Project information
    """
    return {
        'projectName': unreal.Paths.get_project_file_path().split('/')[-1].replace('.uproject', ''),
        'projectDirectory': unreal.Paths.project_dir(),
        'engineVersion': unreal.SystemLibrary.get_engine_version(),
        'currentLevel': unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world().get_name()
    }


def execute_console_command(command, world=None):
    """Execute a console command in Unreal Engine.
    
    Args:
        command: Console command to execute
        world: Optional world context (uses editor world if not provided)
    """
    if world is None:
        editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
        world = editor_subsystem.get_editor_world()
    
    unreal.SystemLibrary.execute_console_command(world, command)


def load_asset(asset_path):
    """Load an asset from the content browser.
    
    Args:
        asset_path: Path to the asset
        
    Returns:
        Asset object or None if not found
    """
    asset = unreal.EditorAssetLibrary.load_asset(asset_path)
    return asset


def asset_exists(asset_path):
    """Check if an asset exists at the given path.
    
    Args:
        asset_path: Path to check
        
    Returns:
        bool: True if asset exists
    """
    return unreal.EditorAssetLibrary.does_asset_exist(asset_path)


def normalize_angle(angle):
    """Normalize an angle to -180 to 180 range.
    
    Args:
        angle: Angle in degrees
        
    Returns:
        float: Normalized angle
    """
    return ((angle + 180) % 360) - 180


def log_debug(message):
    """Log a debug message if debug mode is enabled."""
    if os.environ.get('UEMCP_DEBUG'):
        unreal.log(f"UEMCP: {message}")


def log_error(message):
    """Log an error message."""
    unreal.log_error(f"UEMCP: {message}")