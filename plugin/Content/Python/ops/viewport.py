"""
UEMCP Viewport Operations - All viewport and camera-related operations

Enhanced with improved error handling framework to eliminate try/catch boilerplate.
"""

import unreal
import os
import time
import math
# import tempfile
import platform as py_platform
from typing import Dict, Any, List, Optional

# Enhanced error handling framework
from utils.error_handling import (
    validate_inputs, handle_unreal_errors, safe_operation,
    RequiredRule, TypeRule, ListLengthRule,
    require_actor, ActorError, ValidationError
)

from utils import create_vector, create_rotator, find_actor_by_name, execute_console_command, log_debug, log_error


class ViewportOperations:
    """Handles all viewport and camera-related operations."""

    @validate_inputs({
        'width': [TypeRule(int)],
        'height': [TypeRule(int)],
        'screenPercentage': [TypeRule((int, float))],
        'compress': [TypeRule(bool)],
        'quality': [TypeRule(int)]
    })
    @handle_unreal_errors("take_screenshot")
    @safe_operation("viewport")
    def screenshot(self, width: int = 640, height: int = 360,
                   screenPercentage: float = 50, compress: bool = True, quality: int = 60):
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
        # Create temp directory for screenshots
        timestamp = int(time.time())
        base_filename = f"uemcp_screenshot_{timestamp}"

        # Take screenshot
        unreal.AutomationLibrary.take_high_res_screenshot(
            width,
            height,
            base_filename,
            None,  # Camera (None = current view)
            False,  # Mask enabled
            False,  # Capture HDR
            unreal.ComparisonTolerance.LOW,
        )

        # Determine expected save path
        project_path = unreal.SystemLibrary.get_project_directory()
        system = py_platform.system()

        if system == "Darwin":  # macOS
            expected_path = os.path.join(
                project_path,
                "Saved",
                "Screenshots",
                "MacEditor",
                f"{base_filename}.png")
        elif system == "Windows":
            expected_path = os.path.join(
                project_path, "Saved", "Screenshots", "WindowsEditor", f"{base_filename}.png"
            )
        else:
            expected_path = os.path.join(
                project_path, "Saved", "Screenshots", "LinuxEditor", f"{base_filename}.png"
            )

        log_debug(f"Screenshot requested: {expected_path}")

        return {
            "filepath": expected_path,
            "message": f"Screenshot initiated. File will be saved to: {expected_path}",
        }

    @validate_inputs({
        'location': [ListLengthRule(3)],
        'rotation': [ListLengthRule(3)],
        'focusActor': [TypeRule((str, type(None)))],
        'distance': [TypeRule((int, float))]
    })
    @handle_unreal_errors("set_camera")
    @safe_operation("viewport")
    def set_camera(self, location: Optional[List[float]] = None, 
                   rotation: Optional[List[float]] = None, focusActor: Optional[str] = None, 
                   distance: float = 500):
        """Set viewport camera position and rotation.

        Args:
            location: [X, Y, Z] camera location
            rotation: [Roll, Pitch, Yaw] camera rotation
            focusActor: Name of actor to focus on
            distance: Distance from focus actor

        Returns:
            dict: Result with camera info
        """
        editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)

        if focusActor:
            # Find and focus on specific actor using error handling framework
            target_actor = require_actor(focusActor)

            # Get actor location and bounds
            actor_location = target_actor.get_actor_location()
            actor_bounds = target_actor.get_actor_bounds(False)
            _ = actor_bounds[1]  # Box extent

            # Calculate camera position
            camera_offset = unreal.Vector(-distance * 0.7, 0, distance * 0.7)  # Back, Side, Up
            camera_location = actor_location + camera_offset

            # Calculate rotation to look at actor
            direction = actor_location - camera_location
            camera_rotation = direction.rotation()

            # Set viewport camera
            editor_subsystem.set_level_viewport_camera_info(camera_location, camera_rotation)

            # Also pilot the actor for better framing
            unreal.EditorLevelLibrary.pilot_level_actor(target_actor)
            unreal.EditorLevelLibrary.eject_pilot_level_actor()

            current_loc = camera_location
            current_rot = camera_rotation

        else:
            # Manual camera positioning
            if location is None:
                raise ValidationError(
                    "Location required when not focusing on an actor",
                    operation="set_camera"
                )

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
            editor_subsystem.set_level_viewport_camera_info(current_loc, current_rot)

        return {
            "location": {"x": float(current_loc.x), "y": float(current_loc.y), "z": float(current_loc.z)},
            "rotation": {
                "pitch": float(current_rot.pitch),
                "yaw": float(current_rot.yaw),
                "roll": float(current_rot.roll),
            },
            "message": "Viewport camera updated",
        }

    @validate_inputs({
        'actorName': [RequiredRule(), TypeRule(str)],
        'preserveRotation': [TypeRule(bool)]
    })
    @handle_unreal_errors("focus_on_actor")
    @safe_operation("viewport")
    def focus_on_actor(self, actorName: str, preserveRotation: bool = False):
        """Focus viewport on a specific actor.

        Args:
            actorName: Name of the actor to focus on
            preserveRotation: Whether to keep current camera angles

        Returns:
            dict: Result with focus info
        """
        actor = require_actor(actorName)

        # Select the actor
        editor_actor_subsystem = unreal.get_editor_subsystem(
            unreal.EditorActorSubsystem)
        editor_actor_subsystem.set_selected_level_actors([actor])

        # Get editor subsystem
        editor_subsystem = unreal.get_editor_subsystem(
            unreal.UnrealEditorSubsystem)

        # Get actor's location and bounds
        actor_location = actor.get_actor_location()
        actor_bounds = actor.get_actor_bounds(
            only_colliding_components=False)
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
                    actor_location.x, actor_location.y, actor_location.z + camera_distance
                )
                camera_rotation = current_rotation
            else:
                # Calculate offset based on current rotation
                forward_vector = current_rotation.get_forward_vector()
                camera_location = actor_location - \
                    (forward_vector * camera_distance)
                camera_rotation = current_rotation
        else:
            # Set camera to look at the actor from a nice angle
            camera_offset = unreal.Vector(-camera_distance, -
                                          camera_distance * 0.5, camera_distance * 0.5)
            camera_location = actor_location + camera_offset

            # Calculate rotation to look at actor
            camera_rotation = unreal.MathLibrary.find_look_at_rotation(
                camera_location, actor_location)

        # Set the viewport camera
        editor_subsystem.set_level_viewport_camera_info(
            camera_location, camera_rotation)

        return {
            "message": f"Focused viewport on: {actorName}",
            "location": {"x": float(actor_location.x), "y": float(actor_location.y), "z": float(actor_location.z)},
        }

    @validate_inputs({
        'mode': [TypeRule(str)]
    })
    @handle_unreal_errors("set_render_mode")
    @safe_operation("viewport")
    def set_render_mode(self, mode: str = "lit"):
        """Change viewport rendering mode.

        Args:
            mode: Rendering mode (lit, unlit, wireframe, etc.)

        Returns:
            dict: Result with mode info
        """
        mode_map = {
            "lit": "LIT",
            "unlit": "UNLIT",
            "wireframe": "WIREFRAME",
            "detail_lighting": "DETAILLIGHTING",
            "lighting_only": "LIGHTINGONLY",
            "light_complexity": "LIGHTCOMPLEXITY",
            "shader_complexity": "SHADERCOMPLEXITY",
        }

        if mode not in mode_map:
            raise ValidationError(f'Invalid render mode: {mode}. Valid modes: {", ".join(mode_map.keys())}')

        # Get editor world for console commands
        editor_subsystem = unreal.get_editor_subsystem(
            unreal.UnrealEditorSubsystem)
        world = editor_subsystem.get_editor_world()

        # Apply the render mode
        if mode == "wireframe":
            # Use ShowFlag for wireframe
            execute_console_command("ShowFlag.Wireframe 1", world)
            execute_console_command("ShowFlag.Materials 0", world)
            execute_console_command("ShowFlag.Lighting 0", world)
        elif mode == "unlit":
            execute_console_command("viewmode unlit", world)
        elif mode == "lit":
            # Reset all show flags when going back to lit mode
            execute_console_command("ShowFlag.Wireframe 0", world)
            execute_console_command("ShowFlag.Materials 1", world)
            execute_console_command("ShowFlag.Lighting 1", world)
            execute_console_command("viewmode lit", world)
        elif mode == "detail_lighting":
            execute_console_command("viewmode lit_detaillighting", world)
        elif mode == "lighting_only":
            execute_console_command("viewmode lightingonly", world)
        elif mode == "light_complexity":
            execute_console_command("viewmode lightcomplexity", world)
        elif mode == "shader_complexity":
            execute_console_command("viewmode shadercomplexity", world)

        log_debug(f"Set viewport render mode to {mode}")

        return {"mode": mode,
                "message": f"Viewport render mode set to {mode}"}

    @validate_inputs({
        'target': [ListLengthRule(3, allow_none=True)],
        'actorName': [TypeRule(str, allow_none=True)],
        'distance': [TypeRule((int, float))],
        'pitch': [TypeRule((int, float))],
        'height': [TypeRule((int, float))],
        'angle': [TypeRule((int, float))]
    })
    @handle_unreal_errors("look_at_target")
    @safe_operation("viewport")
    def look_at_target(self, target=None, actorName=None,
                       distance=1000, pitch=-30, height=500, angle=-135):
        """Point viewport camera to look at specific coordinates or actor.

        Args:
            target: [X, Y, Z] target location
            actorName: Name of actor to look at
            distance: Distance from target
            pitch: Camera pitch angle
            height: Camera height offset
            angle: Angle around target in degrees (default: -135 for NW position)

        Returns:
            dict: Result with camera info
        """
        # Get target location
        if actorName:
            actor = require_actor(actorName)
            target_location = actor.get_actor_location()
        elif target:
            target_location = create_vector(target)
        else:
            raise ValidationError("Must provide either target coordinates or actorName")

        # Calculate camera position using provided angle
        angle_rad = angle * math.pi / 180  # Convert angle to radians

        # Position camera at specified angle around target
        camera_x = target_location.x + distance * math.cos(angle_rad)
        camera_y = target_location.y + distance * math.sin(angle_rad)
        camera_z = target_location.z + height

        camera_location = unreal.Vector(camera_x, camera_y, camera_z)

        # Calculate yaw to look at target
        dx = target_location.x - camera_x
        dy = target_location.y - camera_y

        # Calculate angle correctly (no negation needed)
        angle_to_target = math.atan2(dy, dx)
        yaw = math.degrees(angle_to_target)

        # Set camera rotation (Roll, Pitch, Yaw order)
        camera_rotation = unreal.Rotator(0, pitch, yaw)

        # Apply to viewport
        editor_subsystem = unreal.get_editor_subsystem(
            unreal.UnrealEditorSubsystem)
        editor_subsystem.set_level_viewport_camera_info(
            camera_location, camera_rotation)

        return {
            "location": [camera_location.x, camera_location.y, camera_location.z],
            "rotation": [camera_rotation.roll, camera_rotation.pitch, camera_rotation.yaw],
            "targetLocation": [target_location.x, target_location.y, target_location.z],
            "message": "Camera positioned to look at target",
        }

    @validate_inputs({
        'mode': [TypeRule(str)]
    })
    @handle_unreal_errors("set_mode")
    @safe_operation("viewport")
    def set_mode(self, mode: str = "perspective"):
        """Position camera for standard views (top, front, side, etc.).

        NOTE: This positions the camera but doesn't change projection type.
        For true orthographic projection, use the viewport UI controls.

        Args:
            mode: View mode (perspective, top, bottom, left, right, front, back)

        Returns:
            dict: Result with camera position
        """
        mode = mode.lower()

        # Get editor subsystem
        editor_subsystem = unreal.get_editor_subsystem(
            unreal.UnrealEditorSubsystem)

        # Get current location to maintain position
        current_location, current_rotation = editor_subsystem.get_level_viewport_camera_info()

        # Get rotation for mode
        rotation = self._get_mode_rotation(mode)
        if rotation is None:
            raise ValidationError(f"Invalid mode: {mode}. Valid modes: perspective, top, bottom, left, right, front, back")

        # Calculate location based on selected actors or current position
        location = self._calculate_camera_location(mode, current_location)

        # Apply the camera transform
        editor_subsystem.set_level_viewport_camera_info(location, rotation)

        return {
            "mode": mode,
            "location": [location.x, location.y, location.z],
            "rotation": [rotation.roll, rotation.pitch, rotation.yaw],
            "message": f"Camera set to {mode} view",
        }

    def _get_mode_rotation(self, mode):
        """Get camera rotation for a view mode.

        Args:
            mode: View mode string

        Returns:
            unreal.Rotator or None: Rotation for the mode, None if invalid
        """
        rotations = {
            "top": (-90.0, 0.0, 0.0),  # Look straight down
            "bottom": (90.0, 0.0, 0.0),  # Look straight up
            "front": (0.0, 0.0, 0.0),  # Face north (-X)
            "back": (0.0, 180.0, 0.0),  # Face south (+X)
            "left": (0.0, -90.0, 0.0),  # Face east (-Y)
            "right": (0.0, 90.0, 0.0),  # Face west (+Y)
            "perspective": (-30.0, 45.0, 0.0),  # Default perspective view
        }

        if mode not in rotations:
            return None

        pitch, yaw, roll = rotations[mode]
        rotation = unreal.Rotator()
        rotation.pitch = pitch
        rotation.yaw = yaw
        rotation.roll = roll
        return rotation

    def _calculate_camera_location(self, mode, current_location):
        """Calculate camera location based on mode and selected actors.

        Args:
            mode: View mode string
            current_location: Current camera location

        Returns:
            unreal.Vector: Camera location
        """
        # Check if any actors are selected for centering
        editor_actor_subsystem = unreal.get_editor_subsystem(
            unreal.EditorActorSubsystem)
        selected_actors = editor_actor_subsystem.get_selected_level_actors()

        if not selected_actors:
            # No selection, maintain current distance
            return current_location

        # Calculate combined bounds of selected actors
        bounds_origin, bounds_extent = self._calculate_combined_bounds(
            selected_actors)

        # Calculate camera distance based on bounds
        max_extent = max(bounds_extent.x, bounds_extent.y, bounds_extent.z)
        distance = max_extent * 3

        # Position camera based on mode
        return self._get_camera_position_for_mode(
            mode, bounds_origin, distance)

    def _calculate_combined_bounds(self, actors):
        """Calculate combined bounds of multiple actors.

        Args:
            actors: List of actors

        Returns:
            tuple: (bounds_origin, bounds_extent)
        """
        if not actors:
            return unreal.Vector(0, 0, 0), unreal.Vector(0, 0, 0)

        bounds_origin = unreal.Vector(0, 0, 0)
        bounds_extent = unreal.Vector(0, 0, 0)

        for i, actor in enumerate(actors):
            actor_origin, actor_extent = actor.get_actor_bounds(False)

            if i == 0:
                bounds_origin = actor_origin
                bounds_extent = actor_extent
            else:
                # Expand bounds to include this actor
                bounds_origin, bounds_extent = self._expand_bounds(
                    bounds_origin, bounds_extent, actor_origin, actor_extent
                )

        return bounds_origin, bounds_extent

    def _expand_bounds(self, bounds_origin, bounds_extent,
                       actor_origin, actor_extent):
        """Expand bounds to include another actor.

        Args:
            bounds_origin: Current bounds origin
            bounds_extent: Current bounds extent
            actor_origin: Actor origin to include
            actor_extent: Actor extent to include

        Returns:
            tuple: (new_origin, new_extent)
        """
        min_point = unreal.Vector(
            min(bounds_origin.x - bounds_extent.x,
                actor_origin.x - actor_extent.x),
            min(bounds_origin.y - bounds_extent.y,
                actor_origin.y - actor_extent.y),
            min(bounds_origin.z - bounds_extent.z,
                actor_origin.z - actor_extent.z),
        )
        max_point = unreal.Vector(
            max(bounds_origin.x + bounds_extent.x,
                actor_origin.x + actor_extent.x),
            max(bounds_origin.y + bounds_extent.y,
                actor_origin.y + actor_extent.y),
            max(bounds_origin.z + bounds_extent.z,
                actor_origin.z + actor_extent.z),
        )
        new_origin = (min_point + max_point) * 0.5
        new_extent = (max_point - min_point) * 0.5
        return new_origin, new_extent

    def _get_camera_position_for_mode(self, mode, origin, distance):
        """Get camera position for a specific view mode.

        Args:
            mode: View mode string
            origin: Target origin point
            distance: Distance from origin

        Returns:
            unreal.Vector: Camera position
        """
        positions = {
            "top": unreal.Vector(origin.x, origin.y, origin.z + distance),
            "bottom": unreal.Vector(origin.x, origin.y, origin.z - distance),
            "front": unreal.Vector(origin.x - distance, origin.y, origin.z),
            "back": unreal.Vector(origin.x + distance, origin.y, origin.z),
            "left": unreal.Vector(origin.x, origin.y - distance, origin.z),
            "right": unreal.Vector(origin.x, origin.y + distance, origin.z),
            "perspective": unreal.Vector(
                origin.x - distance * 0.7,
                origin.y - distance * 0.7,
                origin.z + distance * 0.5,
            ),
        }
        return positions.get(mode, origin)

    @handle_unreal_errors("get_bounds")
    @safe_operation("viewport")
    def get_bounds(self):
        """Get current viewport boundaries and visible area.

        Returns:
            dict: Viewport bounds information
        """
        # Get viewport camera info
        editor_subsystem = unreal.get_editor_subsystem(
            unreal.UnrealEditorSubsystem)
        camera_location, camera_rotation = editor_subsystem.get_level_viewport_camera_info()

        # Get FOV (default to 90 if not available)
        fov = 90.0  # Default FOV

        # Estimate view distance (simplified)
        view_distance = 5000.0  # Default view distance

        # Calculate rough bounds based on camera position and FOV
        # This is a simplified estimation since direct frustum API is not
        # exposed
        half_fov_rad = math.radians(fov / 2)
        extent_at_distance = view_distance * math.tan(half_fov_rad)

        # Calculate view direction
        forward = camera_rotation.get_forward_vector()
        _ = camera_rotation.get_right_vector()
        _ = camera_rotation.get_up_vector()

        # Calculate corner points
        center = camera_location + forward * view_distance

        min_x = center.x - extent_at_distance
        max_x = center.x + extent_at_distance
        min_y = center.y - extent_at_distance
        max_y = center.y + extent_at_distance
        min_z = center.z - extent_at_distance
        max_z = center.z + extent_at_distance

        return {
            "camera": {
                "location": [camera_location.x, camera_location.y, camera_location.z],
                "rotation": [camera_rotation.roll, camera_rotation.pitch, camera_rotation.yaw],
            },
            "bounds": {"min": [min_x, min_y, min_z], "max": [max_x, max_y, max_z]},
            "viewDistance": view_distance,
            "fov": fov,
            "message": "Viewport bounds calculated (estimated)",
        }

    @validate_inputs({
        'actors': [TypeRule(list, allow_none=True)],
        'filter': [TypeRule(str, allow_none=True)],
        'padding': [TypeRule((int, float))]
    })
    @handle_unreal_errors("fit_actors")
    @safe_operation("viewport")
    def fit_actors(self, actors=None, filter=None, padding=20):
        """Fit actors in viewport by adjusting camera position.

        Args:
            actors: List of specific actor names to fit
            filter: Pattern to filter actor names
            padding: Padding percentage around actors (default: 20)

        Returns:
            dict: Result with camera adjustment info
        """
        # Get all actors to check
        editor_actor_subsystem = unreal.get_editor_subsystem(
            unreal.EditorActorSubsystem)
        all_actors = editor_actor_subsystem.get_all_level_actors()

        # Filter actors based on provided criteria
        actors_to_fit = []

        if actors:
            # Specific actors requested
            for actor in all_actors:
                if actor and hasattr(actor, "get_actor_label"):
                    if actor.get_actor_label() in actors:
                        actors_to_fit.append(actor)
        elif filter:
            # Filter pattern provided
            filter_lower = filter.lower()
            for actor in all_actors:
                if actor and hasattr(actor, "get_actor_label"):
                    if filter_lower in actor.get_actor_label().lower():
                        actors_to_fit.append(actor)
        else:
            raise ValidationError("Must provide either actors list or filter pattern")

        if not actors_to_fit:
            raise ValidationError("No actors found matching criteria")

        # Calculate combined bounds of all actors
        combined_min = None
        combined_max = None

        for actor in actors_to_fit:
            origin, extent = actor.get_actor_bounds(False)

            actor_min = unreal.Vector(
                origin.x - extent.x,
                origin.y - extent.y,
                origin.z - extent.z)
            actor_max = unreal.Vector(
                origin.x + extent.x,
                origin.y + extent.y,
                origin.z + extent.z)

            if combined_min is None:
                combined_min = actor_min
                combined_max = actor_max
            else:
                combined_min = unreal.Vector(
                    min(combined_min.x, actor_min.x),
                    min(combined_min.y, actor_min.y),
                    min(combined_min.z, actor_min.z),
                )
                combined_max = unreal.Vector(
                    max(combined_max.x, actor_max.x),
                    max(combined_max.y, actor_max.y),
                    max(combined_max.z, actor_max.z),
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
        editor_subsystem = unreal.get_editor_subsystem(
            unreal.UnrealEditorSubsystem)
        current_location, current_rotation = editor_subsystem.get_level_viewport_camera_info()

        # Position camera to fit all actors
        # Use current rotation to determine camera offset direction
        forward = current_rotation.get_forward_vector()
        camera_location = bounds_center - forward * camera_distance

        # Apply the camera position
        editor_subsystem.set_level_viewport_camera_info(
            camera_location, current_rotation)

        # Also select the actors for clarity
        editor_actor_subsystem.set_selected_level_actors(actors_to_fit)

        return {
            "fittedActors": len(actors_to_fit),
            "boundsCenter": [bounds_center.x, bounds_center.y, bounds_center.z],
            "boundsSize": [bounds_size.x, bounds_size.y, bounds_size.z],
            "cameraLocation": [camera_location.x, camera_location.y, camera_location.z],
            "message": f"Fitted {len(actors_to_fit)} actors in viewport",
        }
