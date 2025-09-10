"""
UEMCP Utilities Package - Common utilities and helpers
"""

# Import commonly used functions for convenience
from .general import (
    asset_exists,
    create_rotator,
    create_transform,
    create_vector,
    execute_console_command,
    find_actor_by_name,
    format_unreal_type,
    get_all_actors,
    get_project_info,
    load_asset,
    log_debug,
    log_error,
    log_warning,
    safe_str,
)
from .memory_optimization import (
    check_memory_pressure,
    cleanup_memory,
    configure_memory_manager,
    get_memory_stats,
    track_operation,
)
from .port import check_port_available, force_free_port, force_free_port_silent, is_port_in_use
from .thread_tracker import clear_threads, get_tracked_threads, track_thread
from .validation import ValidationManager, validate_actor_deleted, validate_actor_modifications, validate_actor_spawn
from .viewport_optimization import (
    configure_viewport_optimization,
    end_viewport_optimization,
    is_viewport_optimized,
    optimized_viewport,
    start_viewport_optimization,
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
    "configure_viewport_optimization",
]
