"""
UEMCP Utilities Package - Common utilities and helpers
"""

# Import commonly used functions for convenience
from .general import (
    log_debug,
    log_error,
    log_warning,
    safe_str,
    format_unreal_type,
    create_vector,
    create_rotator,
    create_transform,
    find_actor_by_name,
    load_asset,
    get_all_actors,
    get_project_info,
    execute_console_command,
    asset_exists,
)
from .validation import ValidationManager, validate_actor_spawn, validate_actor_deleted, validate_actor_modifications
from .port import check_port_available, force_free_port, is_port_in_use, force_free_port_silent
from .thread_tracker import track_thread, get_tracked_threads, clear_threads
from .memory_optimization import (
    track_operation,
    cleanup_memory,
    get_memory_stats,
    check_memory_pressure,
    configure_memory_manager,
)
from .viewport_optimization import (
    optimized_viewport,
    start_viewport_optimization,
    end_viewport_optimization,
    is_viewport_optimized,
)

__all__ = [
    # General utils
    "log_debug",
    "log_error",
    "log_warning",
    "safe_str",
    "format_unreal_type",
    "create_vector",
    "create_rotator",
    "create_transform",
    "find_actor_by_name",
    "load_asset",
    "get_all_actors",
    "get_project_info",
    "execute_console_command",
    "asset_exists",
    # Validation
    "ValidationManager",
    "validate_actor_spawn",
    "validate_actor_deleted",
    "validate_actor_modifications",
    # Port utils
    "check_port_available",
    "force_free_port",
    "is_port_in_use",
    "force_free_port_silent",
    # Thread tracking
    "track_thread",
    "get_tracked_threads",
    "clear_threads",
    # Memory optimization
    "track_operation",
    "cleanup_memory",
    "get_memory_stats",
    "check_memory_pressure",
    "configure_memory_manager",
    # Viewport optimization
    "optimized_viewport",
    "start_viewport_optimization",
    "end_viewport_optimization",
    "is_viewport_optimized",
]
