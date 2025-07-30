"""
UEMCP Viewport Operations - All viewport and camera-related operations
"""

import unreal
import os
import time
import math
import tempfile
import platform as py_platform
from uemcp_utils import (
    create_vector, create_rotator, find_actor_by_name,
    execute_console_command, log_debug, log_error
)


class ViewportOperations:
    """Handles all viewport and camera-related operations."""
    
    def screenshot(self, width=640, height=360, screenPercentage=50, 
                   compress=True, quality=60):
        """Take a viewport screenshot.
        
        Args:
            width: Screenshot width in pixels
            height: Screenshot height in pixels
            screenPercentage: Screen percentage for rendering
            compress: Whether to compress the image
            quality: JPEG compression quality (1-100)
            
        Returns:
            dict: Result with filepath
        """
        try:
            # Create temp directory for screenshots
            timestamp = int(time.time())
            base_filename = f'uemcp_screenshot_{timestamp}'
            
            # Take screenshot
            unreal.AutomationLibrary.take_high_res_screenshot(
                width, height,
                base_filename,
                None,  # Camera (None = current view)
                False,  # Mask enabled
                False,  # Capture HDR
                unreal.ComparisonTolerance.LOW
            )
            
            # Determine expected save path
            project_path = unreal.SystemLibrary.get_project_directory()
            system = py_platform.system()
            
            if system == 'Darwin':  # macOS
                expected_path = os.path.join(project_path, 'Saved', 'Screenshots', 
                                           'MacEditor', f'{base_filename}.png')
            elif system == 'Windows':
                expected_path = os.path.join(project_path, 'Saved', 'Screenshots', 
                                           'WindowsEditor', f'{base_filename}.png')
            else:
                expected_path = os.path.join(project_path, 'Saved', 'Screenshots', 
                                           'LinuxEditor', f'{base_filename}.png')
            
            log_debug(f"Screenshot requested: {expected_path}")
            
            return {
                'success': True,
                'filepath': expected_path,
                'message': f'Screenshot initiated. File will be saved to: {expected_path}'
            }
            
        except Exception as e:
            log_error(f"Failed to take screenshot: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def set_camera(self, location=None, rotation=None, focusActor=None, distance=500):
        """Set viewport camera position and rotation.
        
        Args:
            location: [X, Y, Z] camera location
            rotation: [Roll, Pitch, Yaw] camera rotation
            focusActor: Name of actor to focus on
            distance: Distance from focus actor
            
        Returns:
            dict: Result with camera info
        """
        try:
            editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
            
            if focusActor:
                # Find and focus on specific actor
                target_actor = find_actor_by_name(focusActor)
                
                if not target_actor:
                    return {'success': False, 'error': f'Actor not found: {focusActor}'}
                
                # Get actor location and bounds
                actor_location = target_actor.get_actor_location()
                actor_bounds = target_actor.get_actor_bounds(False)
                bounds_extent = actor_bounds[1]  # Box extent
                
                # Calculate camera position
                camera_offset = unreal.Vector(
                    -distance * 0.7,  # Back
                    0,                # Side
                    distance * 0.7    # Up
                )
                camera_location = actor_location + camera_offset
                
                # Calculate rotation to look at actor
                direction = actor_location - camera_location
                camera_rotation = direction.rotation()
                
                # Set viewport camera
                editor_subsystem.set_level_viewport_camera_info(
                    camera_location,
                    camera_rotation
                )
                
                # Also pilot the actor for better framing
                unreal.EditorLevelLibrary.pilot_level_actor(target_actor)
                unreal.EditorLevelLibrary.eject_pilot_level_actor()
                
                current_loc = camera_location
                current_rot = camera_rotation
                
            else:
                # Manual camera positioning
                if location is None:
                    return {'success': False, 'error': 'Location required when not focusing on an actor'}
                
                current_loc = create_vector(location)
                
                if rotation is not None:
                    current_rot = create_rotator(rotation)
                else:
                    # Default rotation looking forward and slightly down
                    current_rot = unreal.Rotator()
                    current_rot.pitch = -30.0
                    current_rot.yaw = 0.0
                    current_rot.roll = 0.0
                
                # Set the viewport camera
                editor_subsystem.set_level_viewport_camera_info(
                    current_loc,
                    current_rot
                )
            
            return {
                'success': True,
                'location': {
                    'x': float(current_loc.x),
                    'y': float(current_loc.y),
                    'z': float(current_loc.z)
                },
                'rotation': {
                    'pitch': float(current_rot.pitch),
                    'yaw': float(current_rot.yaw),
                    'roll': float(current_rot.roll)
                },
                'message': 'Viewport camera updated'
            }
            
        except Exception as e:
            log_error(f"Failed to set camera: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def focus_on_actor(self, actorName, preserveRotation=False):
        """Focus viewport on a specific actor.
        
        Args:
            actorName: Name of the actor to focus on
            preserveRotation: Whether to keep current camera angles
            
        Returns:
            dict: Result with focus info
        """
        try:
            actor = find_actor_by_name(actorName)
            
            if not actor:
                return {'success': False, 'error': f'Actor not found: {actorName}'}
            
            # Select the actor
            editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
            editor_actor_subsystem.set_selected_level_actors([actor])
            
            # Get editor subsystem
            editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
            
            # Get actor's location and bounds
            actor_location = actor.get_actor_location()
            actor_bounds = actor.get_actor_bounds(only_colliding_components=False)
            bounds_extent = actor_bounds[1]
            
            # Calculate camera distance
            max_extent = max(bounds_extent.x, bounds_extent.y, bounds_extent.z)
            camera_distance = max_extent * 3
            
            if preserveRotation:
                # Get current camera rotation
                current_location, current_rotation = editor_subsystem.get_level_viewport_camera_info()
                
                # Check if we're in a top-down view
                if abs(current_rotation.pitch + 90) < 5:
                    # Keep top-down view
                    camera_location = unreal.Vector(
                        actor_location.x,
                        actor_location.y,
                        actor_location.z + camera_distance
                    )
                    camera_rotation = current_rotation
                else:
                    # Calculate offset based on current rotation
                    forward_vector = current_rotation.get_forward_vector()
                    camera_location = actor_location - (forward_vector * camera_distance)
                    camera_rotation = current_rotation
            else:
                # Set camera to look at the actor from a nice angle
                camera_offset = unreal.Vector(-camera_distance, -camera_distance * 0.5, camera_distance * 0.5)
                camera_location = actor_location + camera_offset
                
                # Calculate rotation to look at actor
                camera_rotation = unreal.MathLibrary.find_look_at_rotation(camera_location, actor_location)
            
            # Set the viewport camera
            editor_subsystem.set_level_viewport_camera_info(camera_location, camera_rotation)
            
            return {
                'success': True,
                'message': f'Focused viewport on: {actorName}',
                'location': {
                    'x': float(actor_location.x),
                    'y': float(actor_location.y),
                    'z': float(actor_location.z)
                }
            }
            
        except Exception as e:
            log_error(f"Failed to focus on actor: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def set_render_mode(self, mode='lit'):
        """Change viewport rendering mode.
        
        Args:
            mode: Rendering mode (lit, unlit, wireframe, etc.)
            
        Returns:
            dict: Result with mode info
        """
        try:
            mode_map = {
                'lit': 'LIT',
                'unlit': 'UNLIT', 
                'wireframe': 'WIREFRAME',
                'detail_lighting': 'DETAILLIGHTING',
                'lighting_only': 'LIGHTINGONLY',
                'light_complexity': 'LIGHTCOMPLEXITY',
                'shader_complexity': 'SHADERCOMPLEXITY'
            }
            
            if mode not in mode_map:
                return {
                    'success': False,
                    'error': f'Invalid render mode: {mode}. Valid modes: {", ".join(mode_map.keys())}'
                }
            
            # Get editor world for console commands
            editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
            world = editor_subsystem.get_editor_world()
            
            # Apply the render mode
            if mode == 'wireframe':
                # Use ShowFlag for wireframe
                execute_console_command("ShowFlag.Wireframe 1", world)
                execute_console_command("ShowFlag.Materials 0", world)
                execute_console_command("ShowFlag.Lighting 0", world)
            elif mode == 'unlit':
                execute_console_command("viewmode unlit", world)
            elif mode == 'lit':
                # Reset all show flags when going back to lit mode
                execute_console_command("ShowFlag.Wireframe 0", world)
                execute_console_command("ShowFlag.Materials 1", world)
                execute_console_command("ShowFlag.Lighting 1", world)
                execute_console_command("viewmode lit", world)
            elif mode == 'detail_lighting':
                execute_console_command("viewmode lit_detaillighting", world)
            elif mode == 'lighting_only':
                execute_console_command("viewmode lightingonly", world)
            elif mode == 'light_complexity':
                execute_console_command("viewmode lightcomplexity", world)
            elif mode == 'shader_complexity':
                execute_console_command("viewmode shadercomplexity", world)
            
            log_debug(f"Set viewport render mode to {mode}")
            
            return {
                'success': True,
                'mode': mode,
                'message': f'Viewport render mode set to {mode}'
            }
            
        except Exception as e:
            log_error(f"Failed to set render mode: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def look_at_target(self, target=None, actorName=None, distance=1000, 
                      pitch=-30, height=500):
        """Point viewport camera to look at specific coordinates or actor.
        
        Args:
            target: [X, Y, Z] target location
            actorName: Name of actor to look at
            distance: Distance from target
            pitch: Camera pitch angle
            height: Camera height offset
            
        Returns:
            dict: Result with camera info
        """
        try:
            # Get target location
            if actorName:
                actor = find_actor_by_name(actorName)
                if not actor:
                    return {'success': False, 'error': f'Actor not found: {actorName}'}
                target_location = actor.get_actor_location()
            elif target:
                target_location = create_vector(target)
            else:
                return {'success': False, 'error': 'Must provide either target coordinates or actorName'}
            
            # Calculate camera position
            angle = -45 * math.pi / 180  # -45 degrees in radians
            
            camera_x = target_location.x + distance * math.cos(angle)
            camera_y = target_location.y + distance * math.sin(angle)
            camera_z = target_location.z + height
            
            camera_location = unreal.Vector(camera_x, camera_y, camera_z)
            
            # Calculate yaw to look at target
            dx = target_location.x - camera_x
            dy = target_location.y - camera_y
            
            # Calculate angle and convert to Unreal's coordinate system
            angle_rad = math.atan2(dy, dx)
            yaw = -(angle_rad * 180 / math.pi)
            
            # Set camera rotation
            camera_rotation = unreal.Rotator(0, pitch, yaw)
            
            # Apply to viewport
            editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
            editor_subsystem.set_level_viewport_camera_info(camera_location, camera_rotation)
            
            return {
                'success': True,
                'location': [camera_location.x, camera_location.y, camera_location.z],
                'rotation': [camera_rotation.roll, camera_rotation.pitch, camera_rotation.yaw],
                'targetLocation': [target_location.x, target_location.y, target_location.z],
                'message': 'Camera positioned to look at target'
            }
            
        except Exception as e:
            log_error(f"Failed to look at target: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def set_mode(self, mode='perspective'):
        """Position camera for standard views (top, front, side, etc.).
        
        NOTE: This positions the camera but doesn't change projection type.
        For true orthographic projection, use the viewport UI controls.
        
        Args:
            mode: View mode (perspective, top, bottom, left, right, front, back)
            
        Returns:
            dict: Result with camera position
        """
        try:
            mode = mode.lower()
            
            # Get editor subsystem
            editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
            
            # Get current location to maintain position
            current_location, current_rotation = editor_subsystem.get_level_viewport_camera_info()
            
            # Create rotation for each mode
            # Use explicit property setting to avoid Rotator constructor issues
            if mode == 'top':
                rotation = unreal.Rotator()
                rotation.pitch = -90.0  # Look straight down
                rotation.yaw = 0.0
                rotation.roll = 0.0
            elif mode == 'bottom':
                rotation = unreal.Rotator()
                rotation.pitch = 90.0   # Look straight up
                rotation.yaw = 0.0
                rotation.roll = 0.0
            elif mode == 'front':
                rotation = unreal.Rotator()
                rotation.pitch = 0.0
                rotation.yaw = 0.0      # Face north (-X)
                rotation.roll = 0.0
            elif mode == 'back':
                rotation = unreal.Rotator()
                rotation.pitch = 0.0
                rotation.yaw = 180.0    # Face south (+X)
                rotation.roll = 0.0
            elif mode == 'left':
                rotation = unreal.Rotator()
                rotation.pitch = 0.0
                rotation.yaw = -90.0    # Face east (-Y)
                rotation.roll = 0.0
            elif mode == 'right':
                rotation = unreal.Rotator()
                rotation.pitch = 0.0
                rotation.yaw = 90.0     # Face west (+Y)
                rotation.roll = 0.0
            elif mode == 'perspective':
                # Default perspective view
                rotation = unreal.Rotator()
                rotation.pitch = -30.0
                rotation.yaw = 45.0
                rotation.roll = 0.0
            else:
                return {
                    'success': False,
                    'error': f'Invalid mode: {mode}. Valid modes: perspective, top, bottom, left, right, front, back'
                }
            
            # Check if any actors are selected for centering
            editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
            selected_actors = editor_actor_subsystem.get_selected_level_actors()
            
            if selected_actors:
                # Center on selected actors
                bounds_origin = unreal.Vector(0, 0, 0)
                bounds_extent = unreal.Vector(0, 0, 0)
                
                # Calculate combined bounds
                for i, actor in enumerate(selected_actors):
                    actor_origin, actor_extent = actor.get_actor_bounds(False)
                    if i == 0:
                        bounds_origin = actor_origin
                        bounds_extent = actor_extent
                    else:
                        # Expand bounds to include this actor
                        min_point = unreal.Vector(
                            min(bounds_origin.x - bounds_extent.x, actor_origin.x - actor_extent.x),
                            min(bounds_origin.y - bounds_extent.y, actor_origin.y - actor_extent.y),
                            min(bounds_origin.z - bounds_extent.z, actor_origin.z - actor_extent.z)
                        )
                        max_point = unreal.Vector(
                            max(bounds_origin.x + bounds_extent.x, actor_origin.x + actor_extent.x),
                            max(bounds_origin.y + bounds_extent.y, actor_origin.y + actor_extent.y),
                            max(bounds_origin.z + bounds_extent.z, actor_origin.z + actor_extent.z)
                        )
                        bounds_origin = (min_point + max_point) * 0.5
                        bounds_extent = (max_point - min_point) * 0.5
                
                # Calculate camera distance based on bounds
                max_extent = max(bounds_extent.x, bounds_extent.y, bounds_extent.z)
                distance = max_extent * 3
                
                # Position camera based on mode
                if mode == 'top':
                    location = unreal.Vector(bounds_origin.x, bounds_origin.y, bounds_origin.z + distance)
                elif mode == 'bottom':
                    location = unreal.Vector(bounds_origin.x, bounds_origin.y, bounds_origin.z - distance)
                elif mode == 'front':
                    location = unreal.Vector(bounds_origin.x - distance, bounds_origin.y, bounds_origin.z)
                elif mode == 'back':
                    location = unreal.Vector(bounds_origin.x + distance, bounds_origin.y, bounds_origin.z)
                elif mode == 'left':
                    location = unreal.Vector(bounds_origin.x, bounds_origin.y - distance, bounds_origin.z)
                elif mode == 'right':
                    location = unreal.Vector(bounds_origin.x, bounds_origin.y + distance, bounds_origin.z)
                else:  # perspective
                    location = unreal.Vector(
                        bounds_origin.x - distance * 0.7,
                        bounds_origin.y - distance * 0.7,
                        bounds_origin.z + distance * 0.5
                    )
            else:
                # No selection, maintain current distance
                location = current_location
            
            # Apply the camera transform
            editor_subsystem.set_level_viewport_camera_info(location, rotation)
            
            return {
                'success': True,
                'mode': mode,
                'location': [location.x, location.y, location.z],
                'rotation': [rotation.roll, rotation.pitch, rotation.yaw],
                'message': f'Camera set to {mode} view'
            }
            
        except Exception as e:
            log_error(f"Failed to set viewport mode: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_bounds(self):
        """Get current viewport boundaries and visible area.
        
        Returns:
            dict: Viewport bounds information
        """
        try:
            # Get viewport camera info
            editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
            camera_location, camera_rotation = editor_subsystem.get_level_viewport_camera_info()
            
            # Get FOV (default to 90 if not available)
            fov = 90.0  # Default FOV
            
            # Estimate view distance (simplified)
            view_distance = 5000.0  # Default view distance
            
            # Calculate rough bounds based on camera position and FOV
            # This is a simplified estimation since direct frustum API is not exposed
            half_fov_rad = math.radians(fov / 2)
            extent_at_distance = view_distance * math.tan(half_fov_rad)
            
            # Calculate view direction
            forward = camera_rotation.get_forward_vector()
            right = camera_rotation.get_right_vector()
            up = camera_rotation.get_up_vector()
            
            # Calculate corner points
            center = camera_location + forward * view_distance
            
            min_x = center.x - extent_at_distance
            max_x = center.x + extent_at_distance
            min_y = center.y - extent_at_distance
            max_y = center.y + extent_at_distance
            min_z = center.z - extent_at_distance
            max_z = center.z + extent_at_distance
            
            return {
                'success': True,
                'camera': {
                    'location': [camera_location.x, camera_location.y, camera_location.z],
                    'rotation': [camera_rotation.roll, camera_rotation.pitch, camera_rotation.yaw]
                },
                'bounds': {
                    'min': [min_x, min_y, min_z],
                    'max': [max_x, max_y, max_z]
                },
                'viewDistance': view_distance,
                'fov': fov,
                'message': 'Viewport bounds calculated (estimated)'
            }
            
        except Exception as e:
            log_error(f"Failed to get viewport bounds: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def fit_actors(self, actors=None, filter=None, padding=20):
        """Fit actors in viewport by adjusting camera position.
        
        Args:
            actors: List of specific actor names to fit
            filter: Pattern to filter actor names
            padding: Padding percentage around actors (default: 20)
            
        Returns:
            dict: Result with camera adjustment info
        """
        try:
            # Get all actors to check
            editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
            all_actors = editor_actor_subsystem.get_all_level_actors()
            
            # Filter actors based on provided criteria
            actors_to_fit = []
            
            if actors:
                # Specific actors requested
                for actor in all_actors:
                    if actor and hasattr(actor, 'get_actor_label'):
                        if actor.get_actor_label() in actors:
                            actors_to_fit.append(actor)
            elif filter:
                # Filter pattern provided
                filter_lower = filter.lower()
                for actor in all_actors:
                    if actor and hasattr(actor, 'get_actor_label'):
                        if filter_lower in actor.get_actor_label().lower():
                            actors_to_fit.append(actor)
            else:
                return {'success': False, 'error': 'Must provide either actors list or filter pattern'}
            
            if not actors_to_fit:
                return {'success': False, 'error': 'No actors found matching criteria'}
            
            # Calculate combined bounds of all actors
            combined_min = None
            combined_max = None
            
            for actor in actors_to_fit:
                origin, extent = actor.get_actor_bounds(False)
                
                actor_min = unreal.Vector(
                    origin.x - extent.x,
                    origin.y - extent.y,
                    origin.z - extent.z
                )
                actor_max = unreal.Vector(
                    origin.x + extent.x,
                    origin.y + extent.y,
                    origin.z + extent.z
                )
                
                if combined_min is None:
                    combined_min = actor_min
                    combined_max = actor_max
                else:
                    combined_min = unreal.Vector(
                        min(combined_min.x, actor_min.x),
                        min(combined_min.y, actor_min.y),
                        min(combined_min.z, actor_min.z)
                    )
                    combined_max = unreal.Vector(
                        max(combined_max.x, actor_max.x),
                        max(combined_max.y, actor_max.y),
                        max(combined_max.z, actor_max.z)
                    )
            
            # Calculate center and size
            bounds_center = (combined_min + combined_max) * 0.5
            bounds_size = combined_max - combined_min
            
            # Apply padding
            padding_factor = 1.0 + (padding / 100.0)
            
            # Calculate required camera distance
            max_dimension = max(bounds_size.x, bounds_size.y, bounds_size.z)
            camera_distance = max_dimension * padding_factor
            
            # Get current camera rotation to maintain view angle
            editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
            current_location, current_rotation = editor_subsystem.get_level_viewport_camera_info()
            
            # Position camera to fit all actors
            # Use current rotation to determine camera offset direction
            forward = current_rotation.get_forward_vector()
            camera_location = bounds_center - forward * camera_distance
            
            # Apply the camera position
            editor_subsystem.set_level_viewport_camera_info(camera_location, current_rotation)
            
            # Also select the actors for clarity
            editor_actor_subsystem.set_selected_level_actors(actors_to_fit)
            
            return {
                'success': True,
                'fittedActors': len(actors_to_fit),
                'boundsCenter': [bounds_center.x, bounds_center.y, bounds_center.z],
                'boundsSize': [bounds_size.x, bounds_size.y, bounds_size.z],
                'cameraLocation': [camera_location.x, camera_location.y, camera_location.z],
                'message': f'Fitted {len(actors_to_fit)} actors in viewport'
            }
            
        except Exception as e:
            log_error(f"Failed to fit actors in viewport: {str(e)}")
            return {'success': False, 'error': str(e)}