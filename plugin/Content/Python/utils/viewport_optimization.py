"""
UEMCP Viewport Optimization - Disable viewport updates during bulk operations
"""

import unreal
from typing import Optional
from contextlib import contextmanager
from utils import log_debug, execute_console_command


class ViewportManager:
    """Manages viewport performance during bulk operations."""
    
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
            
            # Disable real-time rendering in all viewports
            execute_console_command(f"r.MaxFPS {self.bulk_operation_fps}")  # Reduce FPS during bulk ops
            execute_console_command(f"r.ScreenPercentage {self.bulk_operation_screen_percentage}")  # Reduce render quality
            
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
            
            # Restore normal rendering
            execute_console_command(f"r.MaxFPS {self.normal_fps}")  # Restore normal FPS
            execute_console_command(f"r.ScreenPercentage {self.normal_screen_percentage}")  # Restore render quality
            
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
        """
        if bulk_fps is not None:
            self.bulk_operation_fps = bulk_fps
        if bulk_screen_percentage is not None:
            self.bulk_operation_screen_percentage = bulk_screen_percentage
        if normal_fps is not None:
            self.normal_fps = normal_fps
        if normal_screen_percentage is not None:
            self.normal_screen_percentage = normal_screen_percentage


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