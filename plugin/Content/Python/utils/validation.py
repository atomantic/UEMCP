"""
UEMCP Validation Framework - Validates operations succeeded by checking actual state
"""

import unreal
import time
import math


class ValidationResult:
    """Result of a validation check"""
    def __init__(self, success=True, errors=None, warnings=None):
        self.success = success
        self.errors = errors or []
        self.warnings = warnings or []
    
    def add_error(self, error):
        self.success = False
        self.errors.append(error)
    
    def add_warning(self, warning):
        self.warnings.append(warning)
    
    def to_dict(self):
        return {
            'success': self.success,
            'errors': self.errors,
            'warnings': self.warnings
        }


def validate_actor_location(actor, expected_location, tolerance=0.1):
    """Validate actor location matches expected values"""
    result = ValidationResult()
    
    try:
        actual_location = actor.get_actor_location()
        
        # Check each axis
        for axis, expected, actual in [
            ('X', expected_location[0], actual_location.x),
            ('Y', expected_location[1], actual_location.y),
            ('Z', expected_location[2], actual_location.z)
        ]:
            diff = abs(expected - actual)
            if diff > tolerance:
                result.add_error(
                    f"Location {axis} mismatch: expected {expected:.2f}, got {actual:.2f} (diff: {diff:.2f})"
                )
    except Exception as e:
        result.add_error(f"Failed to validate location: {str(e)}")
    
    return result


def validate_actor_rotation(actor, expected_rotation, tolerance=0.1):
    """Validate actor rotation matches expected values"""
    result = ValidationResult()
    
    try:
        actual_rotation = actor.get_actor_rotation()
        
        # Normalize angles to -180 to 180 range
        def normalize_angle(angle):
            # More efficient modulo-based normalization
            return ((angle + 180) % 360) - 180
        
        # Check each rotation component
        for component, expected, actual in [
            ('Roll', expected_rotation[0], actual_rotation.roll),
            ('Pitch', expected_rotation[1], actual_rotation.pitch),
            ('Yaw', expected_rotation[2], actual_rotation.yaw)
        ]:
            # Normalize both angles
            expected_norm = normalize_angle(expected)
            actual_norm = normalize_angle(actual)
            
            # Calculate angular difference
            diff = abs(expected_norm - actual_norm)
            # Handle wrap-around at 180/-180
            if diff > 180:
                diff = 360 - diff
            
            if diff > tolerance:
                result.add_error(
                    f"Rotation {component} mismatch: expected {expected:.2f}°, got {actual:.2f}° (diff: {diff:.2f}°)"
                )
    except Exception as e:
        result.add_error(f"Failed to validate rotation: {str(e)}")
    
    return result


def validate_actor_scale(actor, expected_scale, tolerance=0.001):
    """Validate actor scale matches expected values"""
    result = ValidationResult()
    
    try:
        actual_scale = actor.get_actor_scale3d()
        
        # Check each axis
        for axis, expected, actual in [
            ('X', expected_scale[0], actual_scale.x),
            ('Y', expected_scale[1], actual_scale.y),
            ('Z', expected_scale[2], actual_scale.z)
        ]:
            diff = abs(expected - actual)
            if diff > tolerance:
                result.add_error(
                    f"Scale {axis} mismatch: expected {expected:.3f}, got {actual:.3f} (diff: {diff:.3f})"
                )
    except Exception as e:
        result.add_error(f"Failed to validate scale: {str(e)}")
    
    return result


def validate_actor_folder(actor, expected_folder):
    """Validate actor folder path matches expected value"""
    result = ValidationResult()
    
    try:
        actual_folder = actor.get_folder_path()
        # Convert Name to string if necessary
        if hasattr(actual_folder, 'to_string'):
            actual_folder = actual_folder.to_string()
        else:
            actual_folder = str(actual_folder) if actual_folder else ""
        
        if actual_folder != expected_folder:
            result.add_error(
                f"Folder mismatch: expected '{expected_folder}', got '{actual_folder}'"
            )
    except Exception as e:
        result.add_error(f"Failed to validate folder: {str(e)}")
    
    return result


def validate_actor_mesh(actor, expected_mesh_path):
    """Validate actor has the expected static mesh"""
    result = ValidationResult()
    
    try:
        # Get mesh component
        mesh_component = actor.get_component_by_class(unreal.StaticMeshComponent)
        if not mesh_component:
            result.add_error("Actor does not have a StaticMeshComponent")
            return result
        
        # Get current mesh
        current_mesh = mesh_component.static_mesh
        if not current_mesh:
            result.add_error("Actor has no static mesh assigned")
            return result
        
        # Get mesh path (handle paths with or without ':')
        full_path = current_mesh.get_path_name()
        current_path = full_path.split(':')[0] if ':' in full_path else full_path
        
        # Compare paths
        if current_path != expected_mesh_path:
            result.add_error(
                f"Mesh mismatch: expected '{expected_mesh_path}', got '{current_path}'"
            )
    except Exception as e:
        result.add_error(f"Failed to validate mesh: {str(e)}")
    
    return result


def validate_actor_exists(actor_name):
    """Validate that an actor with the given name exists"""
    result = ValidationResult()
    
    try:
        all_actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
        
        for actor in all_actors:
            try:
                if actor and hasattr(actor, 'get_actor_label') and actor.get_actor_label() == actor_name:
                    return result  # Success
            except Exception:
                continue
        
        result.add_error(f"Actor '{actor_name}' not found in level")
    except Exception as e:
        result.add_error(f"Failed to check actor existence: {str(e)}")
    
    return result


def validate_actor_deleted(actor_name):
    """Validate that an actor with the given name does NOT exist (for delete validation)"""
    result = ValidationResult()
    
    try:
        all_actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
        
        for actor in all_actors:
            try:
                if actor and hasattr(actor, 'get_actor_label') and actor.get_actor_label() == actor_name:
                    result.add_error(f"Actor '{actor_name}' still exists in level")
                    return result
            except Exception:
                continue
        
        # Success - actor not found
        return result
    except Exception as e:
        result.add_error(f"Failed to validate actor deletion: {str(e)}")
    
    return result


def find_actor_by_name(actor_name):
    """Find an actor by name, returning None if not found"""
    try:
        all_actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
        
        for actor in all_actors:
            try:
                if actor and hasattr(actor, 'get_actor_label') and actor.get_actor_label() == actor_name:
                    return actor
            except Exception:
                continue
        
        return None
    except Exception:
        return None


def validate_actor_spawn(actor_name, expected_location=None, expected_rotation=None, 
                        expected_scale=None, expected_mesh_path=None, expected_folder=None):
    """Comprehensive validation for spawned actors"""
    result = ValidationResult()
    
    # First check if actor exists
    actor = find_actor_by_name(actor_name)
    if not actor:
        result.add_error(f"Spawned actor '{actor_name}' not found in level")
        return result
    
    # Validate each property if expected value provided
    if expected_location is not None:
        loc_result = validate_actor_location(actor, expected_location)
        if not loc_result.success:
            for error in loc_result.errors:
                result.add_error(error)
    
    if expected_rotation is not None:
        rot_result = validate_actor_rotation(actor, expected_rotation)
        if not rot_result.success:
            for error in rot_result.errors:
                result.add_error(error)
    
    if expected_scale is not None:
        scale_result = validate_actor_scale(actor, expected_scale)
        if not scale_result.success:
            for error in scale_result.errors:
                result.add_error(error)
    
    if expected_mesh_path is not None:
        mesh_result = validate_actor_mesh(actor, expected_mesh_path)
        if not mesh_result.success:
            for error in mesh_result.errors:
                result.add_error(error)
    
    if expected_folder is not None:
        folder_result = validate_actor_folder(actor, expected_folder)
        if not folder_result.success:
            for error in folder_result.errors:
                result.add_error(error)
    
    return result


def validate_actor_modifications(actor, modifications):
    """Validate multiple modifications to an actor"""
    result = ValidationResult()
    
    if not actor:
        result.add_error("Actor is None")
        return result
    
    # Check each modification
    if 'location' in modifications:
        loc_result = validate_actor_location(actor, modifications['location'])
        if not loc_result.success:
            for error in loc_result.errors:
                result.add_error(error)
    
    if 'rotation' in modifications:
        rot_result = validate_actor_rotation(actor, modifications['rotation'])
        if not rot_result.success:
            for error in rot_result.errors:
                result.add_error(error)
    
    if 'scale' in modifications:
        scale_result = validate_actor_scale(actor, modifications['scale'])
        if not scale_result.success:
            for error in scale_result.errors:
                result.add_error(error)
    
    if 'folder' in modifications:
        folder_result = validate_actor_folder(actor, modifications['folder'])
        if not folder_result.success:
            for error in folder_result.errors:
                result.add_error(error)
    
    if 'mesh' in modifications:
        mesh_result = validate_actor_mesh(actor, modifications['mesh'])
        if not mesh_result.success:
            for error in mesh_result.errors:
                result.add_error(error)
    
    return result


class ValidationManager:
    """Manager class for validation operations - provides a namespace for validation functions"""
    
    @staticmethod
    def validate_spawn(actor_name, **kwargs):
        """Validate a spawned actor with expected properties"""
        return validate_actor_spawn(actor_name, **kwargs)
    
    @staticmethod
    def validate_deletion(actor_name):
        """Validate an actor was successfully deleted"""
        return validate_actor_deleted(actor_name)
    
    @staticmethod
    def validate_modifications(actor, modifications):
        """Validate modifications to an actor"""
        return validate_actor_modifications(actor, modifications)
    
    @staticmethod
    def find_actor(actor_name):
        """Find an actor by name"""
        return find_actor_by_name(actor_name)