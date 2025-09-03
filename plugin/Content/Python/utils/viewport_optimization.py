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
            execute_console_command("r.MaxFPS 10")  # Reduce FPS during bulk ops
            execute_console_command("r.ScreenPercentage 50")  # Reduce render quality
            
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
            execute_console_command("r.MaxFPS 120")  # Restore normal FPS
            execute_console_command("r.ScreenPercentage 100")  # Restore render quality
            
            # Force viewport refresh
            execute_console_command("r.Invalidate")
            
            self.is_optimized = False
            log_debug("Viewport optimization disabled")
            
        except Exception as e:
            log_debug(f"Failed to restore viewport: {e}")


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