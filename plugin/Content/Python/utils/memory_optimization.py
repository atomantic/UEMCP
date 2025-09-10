"""
UEMCP Memory Optimization - Manage memory usage for long-running sessions
"""

import gc
import os
import time
from typing import Any, Dict, Optional

from utils import execute_console_command, log_debug, log_warning

# Unreal Engine streaming pool size valid range in MB
MIN_STREAMING_POOL_SIZE = 64
MAX_STREAMING_POOL_SIZE = 4096

# Try to import psutil, fall back to basic implementation if not available
try:
    import psutil

    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    log_debug("psutil not available, using basic memory tracking")


class MemoryManager:
    """Manages memory optimization for long-running sessions."""

    def __init__(self):
        self.last_cleanup = time.time()
        self.cleanup_interval = 300  # 5 minutes
        self.memory_threshold = 0.85  # 85% memory usage threshold
        self.operation_count = 0
        self.cleanup_frequency = 100  # Cleanup every 100 operations
        self.original_streaming_pool_size = None  # Store original texture streaming pool size
        self.streaming_cleanup_delay = 1.0  # Configurable delay for streaming pool cleanup in seconds

    def track_operation(self) -> None:
        """Track an operation and potentially trigger cleanup."""
        self.operation_count += 1

        current_time = time.time()
        time_since_cleanup = current_time - self.last_cleanup

        # Trigger cleanup based on operation count or time
        should_cleanup = self.operation_count >= self.cleanup_frequency or time_since_cleanup >= self.cleanup_interval

        if should_cleanup:
            self.cleanup_memory()

    def _get_streaming_pool_size(self) -> int:
        """Get current texture streaming pool size from Unreal Engine."""
        try:
            # Try to query the current value - this is a simplified approach
            # In reality, UE console variables are harder to query directly
            # We'll use a reasonable default if we can't get the original
            if self.original_streaming_pool_size is None:
                # Default UE streaming pool size is typically 1000MB
                self.original_streaming_pool_size = 1000
            return self.original_streaming_pool_size
        except Exception:
            return 1000  # Safe fallback

    def cleanup_memory(self) -> Dict[str, Any]:
        """Perform memory cleanup and return statistics."""
        log_debug("Starting memory cleanup")

        cleanup_stats = {
            "timestamp": time.time(),
        }

        # Get memory usage before cleanup if psutil is available
        if HAS_PSUTIL:
            try:
                process = psutil.Process(os.getpid())
                memory_before = process.memory_info().rss / 1024 / 1024  # MB
                cleanup_stats["memory_before_mb"] = memory_before
            except Exception:
                cleanup_stats["memory_before_mb"] = "unavailable"
        else:
            cleanup_stats["memory_before_mb"] = "unavailable"

        try:
            # Python garbage collection
            collected = gc.collect()
            cleanup_stats["gc_collected"] = collected

            # Unreal Engine memory cleanup
            execute_console_command("gc.collect")
            execute_console_command("obj gc")

            # Clear unused texture streaming pool
            original_pool_size = self._get_streaming_pool_size()
            execute_console_command("r.Streaming.PoolSize 0")

            # Allow time for memory cleanup to take effect
            # Note: Uses blocking sleep - could be replaced with UE tick system for non-blocking behavior
            if self.streaming_cleanup_delay > 0:
                time.sleep(self.streaming_cleanup_delay)

            # Validate original_pool_size before resetting
            if (
                isinstance(original_pool_size, int)
                and MIN_STREAMING_POOL_SIZE <= original_pool_size <= MAX_STREAMING_POOL_SIZE
            ):
                execute_console_command(f"r.Streaming.PoolSize {original_pool_size}")  # Reset to original
            else:
                msg = (
                    f"Invalid streaming pool size '{original_pool_size}' - must be integer in "
                    f"[{MIN_STREAMING_POOL_SIZE}, {MAX_STREAMING_POOL_SIZE}] MB. "
                    f"Resetting to safe default ({MIN_STREAMING_POOL_SIZE} MB)."
                )
                log_warning(msg)
                execute_console_command(f"r.Streaming.PoolSize {MIN_STREAMING_POOL_SIZE}")  # Reset to safe default

            # Memory after cleanup if psutil is available
            if (
                HAS_PSUTIL
                and "memory_before_mb" in cleanup_stats
                and cleanup_stats["memory_before_mb"] != "unavailable"
            ):
                try:
                    process = psutil.Process(os.getpid())
                    memory_after = process.memory_info().rss / 1024 / 1024  # MB
                    cleanup_stats["memory_after_mb"] = memory_after
                    cleanup_stats["memory_saved_mb"] = cleanup_stats["memory_before_mb"] - memory_after

                    if cleanup_stats["memory_saved_mb"] > 10:  # Only log if significant
                        log_debug(f"Memory cleanup saved {cleanup_stats['memory_saved_mb']:.1f} MB")
                except Exception:
                    cleanup_stats["memory_after_mb"] = "unavailable"
            else:
                cleanup_stats["memory_after_mb"] = "unavailable"
                cleanup_stats["memory_saved_mb"] = "unavailable"

            # Reset counters
            self.last_cleanup = time.time()
            self.operation_count = 0

            return cleanup_stats

        except Exception as e:
            log_warning(f"Memory cleanup failed: {e}")
            cleanup_stats["error"] = str(e)
            return cleanup_stats

    def get_memory_stats(self) -> Dict[str, Any]:
        """Get current memory statistics."""
        stats = {
            "operations_since_cleanup": self.operation_count,
            "time_since_cleanup": time.time() - self.last_cleanup,
            "has_psutil": HAS_PSUTIL,
        }

        if HAS_PSUTIL:
            try:
                process = psutil.Process(os.getpid())
                memory_info = process.memory_info()
                system_memory = psutil.virtual_memory()

                stats.update(
                    {
                        "process_memory_mb": memory_info.rss / 1024 / 1024,
                        "process_memory_percent": process.memory_percent(),
                        "system_memory_percent": system_memory.percent,
                        "system_available_mb": system_memory.available / 1024 / 1024,
                    }
                )
            except Exception as e:
                stats["error"] = str(e)
        else:
            stats.update(
                {
                    "process_memory_mb": "unavailable",
                    "process_memory_percent": "unavailable",
                    "system_memory_percent": "unavailable",
                    "system_available_mb": "unavailable",
                }
            )

        return stats

    def check_memory_pressure(self) -> bool:
        """Check if system is under memory pressure."""
        if not HAS_PSUTIL:
            return False

        try:
            system_memory = psutil.virtual_memory()
            return system_memory.percent > (self.memory_threshold * 100)
        except Exception:
            return False

    def configure(
        self,
        cleanup_interval: Optional[int] = None,
        memory_threshold: Optional[float] = None,
        cleanup_frequency: Optional[int] = None,
        streaming_cleanup_delay: Optional[float] = None,
    ) -> None:
        """Configure memory manager parameters."""
        if cleanup_interval is not None:
            self.cleanup_interval = cleanup_interval
        if memory_threshold is not None:
            self.memory_threshold = memory_threshold
        if cleanup_frequency is not None:
            self.cleanup_frequency = cleanup_frequency
        if streaming_cleanup_delay is not None:
            self.streaming_cleanup_delay = max(0.0, streaming_cleanup_delay)  # Ensure non-negative


# Global memory manager instance
_memory_manager = MemoryManager()


def track_operation() -> None:
    """Track an operation for memory management."""
    _memory_manager.track_operation()


def cleanup_memory() -> Dict[str, Any]:
    """Force memory cleanup and return statistics."""
    return _memory_manager.cleanup_memory()


def get_memory_stats() -> Dict[str, Any]:
    """Get current memory usage statistics."""
    return _memory_manager.get_memory_stats()


def check_memory_pressure() -> bool:
    """Check if system is under memory pressure."""
    return _memory_manager.check_memory_pressure()


def configure_memory_manager(
    cleanup_interval: Optional[int] = None,
    memory_threshold: Optional[float] = None,
    cleanup_frequency: Optional[int] = None,
    streaming_cleanup_delay: Optional[float] = None,
) -> None:
    """Configure memory manager parameters."""
    _memory_manager.configure(cleanup_interval, memory_threshold, cleanup_frequency, streaming_cleanup_delay)
