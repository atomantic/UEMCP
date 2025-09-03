"""
UEMCP Viewport Optimization - Disable viewport updates during bulk operations
"""

import unreal
from typing import Optional, Any
from contextlib import contextmanager
from utils import log_debug, execute_console_command


class ViewportManager:
    """Manages viewport performance during bulk operations."""
    
    # Validation bounds for viewport optimization parameters
    MIN_FPS = 1
    MAX_FPS = 1000
    MIN_SCREEN_PERCENTAGE = 1
    MAX_SCREEN_PERCENTAGE = 200
    
    def __init__(self):
        self.is_optimized = False
        self.original_realtime = {}
        self.original_fps = None
        # Configurable optimization settings
        self.bulk_operation_fps = 10  # FPS during bulk operations
        self.bulk_operation_screen_percentage = 50  # Screen percentage during bulk ops
        self.normal_fps = 120  # Normal FPS to restore to
        self.normal_screen_percentage = 100  # Normal screen percentage to restore to
    
    def start_bulk_operation(self) -> None:
        """Optimize viewport for bulk operations."""
        if self.is_optimized:
            return
        
        try:
            log_debug("Starting viewport optimization for bulk operation")
            
            # Get all viewports
            editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
            if not editor_subsystem:
                log_debug("Could not get editor subsystem")
                return
            
            # Get safe validated values for console commands
            bulk_fps, bulk_screen, _, _ = self._get_safe_values()
            
            # Disable real-time rendering in all viewports
            execute_console_command(f"r.MaxFPS {bulk_fps}")  # Reduce FPS during bulk ops
            execute_console_command(f"r.ScreenPercentage {bulk_screen}")  # Reduce render quality
            
            # Store that we're optimized
            self.is_optimized = True
            log_debug("Viewport optimization enabled")
            
        except Exception as e:
            log_debug(f"Failed to optimize viewport: {e}")
    
    def end_bulk_operation(self) -> None:
        """Restore viewport to normal operation."""
        if not self.is_optimized:
            return
        
        try:
            log_debug("Restoring viewport after bulk operation")
            
            # Get safe validated values for console commands
            _, _, normal_fps, normal_screen = self._get_safe_values()
            
            # Restore normal rendering
            execute_console_command(f"r.MaxFPS {normal_fps}")  # Restore normal FPS
            execute_console_command(f"r.ScreenPercentage {normal_screen}")  # Restore render quality
            
            # Force viewport refresh
            execute_console_command("r.Invalidate")
            
            self.is_optimized = False
            log_debug("Viewport optimization disabled")
            
        except Exception as e:
            log_debug(f"Failed to restore viewport: {e}")
    
    def configure(self, bulk_fps: Optional[int] = None, bulk_screen_percentage: Optional[int] = None,
                  normal_fps: Optional[int] = None, normal_screen_percentage: Optional[int] = None) -> None:
        """Configure viewport optimization parameters.
        
        Args:
            bulk_fps: FPS to use during bulk operations (default: 10)
            bulk_screen_percentage: Screen percentage during bulk ops (default: 50)
            normal_fps: Normal FPS to restore to (default: 120)
            normal_screen_percentage: Normal screen percentage to restore to (default: 100)
            
        Raises:
            ValueError: If any parameter is not a valid positive integer within reasonable bounds
        """
        if bulk_fps is not None:
            if not isinstance(bulk_fps, int) or bulk_fps < self.MIN_FPS or bulk_fps > self.MAX_FPS:
                raise ValueError(f"bulk_fps must be a positive integer between {self.MIN_FPS} and {self.MAX_FPS}, got {bulk_fps}")
            self.bulk_operation_fps = bulk_fps
        if bulk_screen_percentage is not None:
            if not isinstance(bulk_screen_percentage, int) or bulk_screen_percentage < self.MIN_SCREEN_PERCENTAGE or bulk_screen_percentage > self.MAX_SCREEN_PERCENTAGE:
                raise ValueError(f"bulk_screen_percentage must be a positive integer between {self.MIN_SCREEN_PERCENTAGE} and {self.MAX_SCREEN_PERCENTAGE}, got {bulk_screen_percentage}")
            self.bulk_operation_screen_percentage = bulk_screen_percentage
        if normal_fps is not None:
            if not isinstance(normal_fps, int) or normal_fps < self.MIN_FPS or normal_fps > self.MAX_FPS:
                raise ValueError(f"normal_fps must be a positive integer between {self.MIN_FPS} and {self.MAX_FPS}, got {normal_fps}")
            self.normal_fps = normal_fps
        if normal_screen_percentage is not None:
            if not isinstance(normal_screen_percentage, int) or normal_screen_percentage < self.MIN_SCREEN_PERCENTAGE or normal_screen_percentage > self.MAX_SCREEN_PERCENTAGE:
                raise ValueError(f"normal_screen_percentage must be a positive integer between {self.MIN_SCREEN_PERCENTAGE} and {self.MAX_SCREEN_PERCENTAGE}, got {normal_screen_percentage}")
            self.normal_screen_percentage = normal_screen_percentage
    
    def _get_safe_int_value(self, name: str, value: Any, default: int) -> int:
        """Get a safe integer value, using default if value is invalid. Warn if float conversion loses precision."""
        if isinstance(value, (int, float)) and value > 0:
            if isinstance(value, float) and not value.is_integer():
                log_debug(f"Warning: {name} value {value} is a float and will be truncated to {int(value)}. Precision loss may occur.")
            return int(value)
        else:
            log_debug(f"Invalid {name}: {value}, using safe default {default}")
            return default
    
    def _get_safe_values(self) -> tuple:
        """Get safe integer values for console commands."""
        bulk_fps = self._get_safe_int_value("bulk_operation_fps", self.bulk_operation_fps, 10)
        bulk_screen = self._get_safe_int_value("bulk_operation_screen_percentage", self.bulk_operation_screen_percentage, 50)
        normal_fps = self._get_safe_int_value("normal_fps", self.normal_fps, 120)  
        normal_screen = self._get_safe_int_value("normal_screen_percentage", self.normal_screen_percentage, 100)
        return bulk_fps, bulk_screen, normal_fps, normal_screen


# Global viewport manager instance
_viewport_manager = ViewportManager()


@contextmanager
def optimized_viewport():
    """Context manager for optimized viewport during bulk operations.
    
    Usage:
        with optimized_viewport():
            # Perform bulk operations
            spawn_many_actors()
    """
    _viewport_manager.start_bulk_operation()
    try:
        yield
    finally:
        _viewport_manager.end_bulk_operation()


def start_viewport_optimization() -> None:
    """Start viewport optimization for bulk operations."""
    _viewport_manager.start_bulk_operation()


def end_viewport_optimization() -> None:
    """End viewport optimization and restore normal rendering."""
    _viewport_manager.end_bulk_operation()


def is_viewport_optimized() -> bool:
    """Check if viewport is currently optimized for bulk operations."""
    return _viewport_manager.is_optimized


def configure_viewport_optimization(bulk_fps: Optional[int] = None, 
                                   bulk_screen_percentage: Optional[int] = None,
                                   normal_fps: Optional[int] = None, 
                                   normal_screen_percentage: Optional[int] = None) -> None:
    """Configure viewport optimization parameters.
    
    Args:
        bulk_fps: FPS to use during bulk operations (default: 10)
        bulk_screen_percentage: Screen percentage during bulk ops (default: 50) 
        normal_fps: Normal FPS to restore to (default: 120)
        normal_screen_percentage: Normal screen percentage to restore to (default: 100)
    """
    _viewport_manager.configure(bulk_fps, bulk_screen_percentage, normal_fps, normal_screen_percentage)