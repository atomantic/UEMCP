"""
UEMCP Error Handling Framework

Provides decorators, validators, and error types to reduce try/catch boilerplate
while improving error specificity and consistency.
"""

import functools
import inspect
from typing import Any, Dict, List, Optional, Union

import unreal

from utils import log_debug, log_error
from utils.general import get_actor_subsystem, get_level_editor_subsystem

# ============================================================================
# Custom Exception Types - More specific than generic Exception
# ============================================================================


class UEMCPError(Exception):
    """Base exception for all UEMCP operations."""

    def __init__(self, message: str, operation: str = None, details: Dict = None):
        self.message = message
        self.operation = operation or "unknown"
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to standardized error response format."""
        return {"success": False, "error": self.message, "operation": self.operation, "details": self.details}


class ValidationError(UEMCPError):
    """Raised when input validation fails."""

    pass


class ProcessingError(UEMCPError):
    """Raised when operations fail during execution."""

    pass


# ============================================================================
# Input Validation Framework
# ============================================================================


class ValidationRule:
    """Base class for validation rules."""

    def validate(self, value: Any, field_name: str) -> Optional[str]:
        """Validate a value. Returns error message if invalid, None if valid."""
        raise NotImplementedError


class RequiredRule(ValidationRule):
    """Validates that a value is not None or empty."""

    def validate(self, value: Any, field_name: str) -> Optional[str]:
        if value is None:
            return f"{field_name} is required"
        if isinstance(value, (str, list, dict)) and len(value) == 0:
            return f"{field_name} cannot be empty"
        return None


class TypeRule(ValidationRule):
    """Validates that a value is of the expected type."""

    def __init__(self, expected_type: Union[type, tuple], allow_none: bool = False):
        self.expected_type = expected_type
        self.allow_none = allow_none

    def validate(self, value: Any, field_name: str) -> Optional[str]:
        if value is None and self.allow_none:
            return None
        if not isinstance(value, self.expected_type):
            expected_name = getattr(self.expected_type, "__name__", str(self.expected_type))
            actual_name = type(value).__name__
            if self.allow_none:
                return f"{field_name} must be {expected_name} or None, got {actual_name}"
            else:
                return f"{field_name} must be {expected_name}, got {actual_name}"
        return None


class ListLengthRule(ValidationRule):
    """Validates that a list has the expected length."""

    def __init__(self, expected_length: int, allow_none: bool = False):
        self.expected_length = expected_length
        self.allow_none = allow_none

    def validate(self, value: Any, field_name: str) -> Optional[str]:
        if value is None and self.allow_none:
            return None
        if not isinstance(value, (list, tuple)):
            return f"{field_name} must be a list or tuple"
        if len(value) != self.expected_length:
            return f"{field_name} must have {self.expected_length} elements, got {len(value)}"
        return None


class NumericRangeRule(ValidationRule):
    """Validates that a numeric value is within a range."""

    def __init__(self, min_val: float = None, max_val: float = None):
        self.min_val = min_val
        self.max_val = max_val

    def validate(self, value: Any, field_name: str) -> Optional[str]:
        if not isinstance(value, (int, float)):
            return f"{field_name} must be numeric"
        if self.min_val is not None and value < self.min_val:
            return f"{field_name} must be >= {self.min_val}"
        if self.max_val is not None and value > self.max_val:
            return f"{field_name} must be <= {self.max_val}"
        return None


class AssetPathRule(ValidationRule):
    """Validates that a UE content-browser asset path is properly formatted.

    Enforces:
    - Must start with a known root (/Game/, /Engine/, or /Script/, or a caller-specified subset)
    - No traversal segments (..)
    - No backslashes (Windows path separators are invalid here)
    - At least ``min_parts`` slash-delimited parts after splitting (default 3: '', root, name)

    Args:
        allowed_roots: Tuple of allowed path prefixes. Defaults to Game/Engine/Script.
        min_parts: Minimum number of parts after split('/').
            3 → '/Game/Asset' is valid (e.g. blueprint directly under Game root).
            4 → '/Game/Folder/Asset' required (e.g. import destination folders).
    """

    _DEFAULT_ROOTS = ("/Game/", "/Engine/", "/Script/")

    def __init__(self, allowed_roots: tuple = None, min_parts: int = 3):
        self._allowed_roots = allowed_roots if allowed_roots is not None else self._DEFAULT_ROOTS
        self._min_parts = min_parts

    def validate(self, value: Any, field_name: str) -> Optional[str]:
        if not isinstance(value, str):
            return f"{field_name} must be a string"
        if value.endswith("/"):
            return f"{field_name} must not have a trailing slash"
        if not any(value.startswith(root) for root in self._allowed_roots):
            return f"{field_name} must start with a valid UE content root " f"({', '.join(self._allowed_roots)})"
        if "\\" in value:
            return f"{field_name} must not contain backslashes"
        parts = value.split("/")
        if ".." in parts:
            return f"{field_name} must not contain traversal segments (..)"
        if "" in parts[1:]:
            return f"{field_name} must not contain empty path segments (double slashes)"
        if len(parts) < self._min_parts:
            return f"{field_name} must be a valid asset path like '/Game/Folder/MyAsset'"
        return None


class FileExistsRule(ValidationRule):
    """Validates that a file or directory path exists on the filesystem."""

    def validate(self, value: Any, field_name: str) -> Optional[str]:
        import os

        if not isinstance(value, str):
            return f"{field_name} must be a string"
        if not os.path.exists(value):
            return f"{field_name} path does not exist: {value}"
        return None


class OffsetRule(ValidationRule):
    """
    Validates offset parameter - accepts both dict {x,y,z} and list [x,y,z] formats.

    Examples:
        # Dict format
        {"x": 0, "y": 0, "z": 0}

        # List format
        [0, 0, 0]
    """

    def validate(self, value: Any, field_name: str) -> Optional[str]:
        if value is None:
            return None

        if isinstance(value, dict):
            # Dict format: {x: 0, y: 0, z: 0}
            required_keys = {"x", "y", "z"}
            if not required_keys.issubset(value.keys()):
                missing = required_keys - value.keys()
                return f"{field_name} dict missing keys: {missing}"
            if not all(isinstance(value[k], (int, float)) for k in required_keys):
                return f"{field_name} dict values must be numeric"
            return None
        elif isinstance(value, (list, tuple)):
            # Array format: [x, y, z]
            if len(value) != 3:
                return f"{field_name} array must have 3 elements [x, y, z]"
            if not all(isinstance(v, (int, float)) for v in value):
                return f"{field_name} array elements must be numeric"
            return None
        else:
            return f"{field_name} must be a dict {{x,y,z}} or array [x,y,z]"


def validate_inputs(validation_schema: Dict[str, List[ValidationRule]]):
    """
    Decorator that validates function inputs against a schema.

    Args:
        validation_schema: Dict mapping parameter names to list of validation rules

    Example:
        @validate_inputs({
            'assetPath': [RequiredRule(), AssetPathRule()],
            'location': [RequiredRule(), ListLengthRule(3)],
            'scale': [TypeRule(list), ListLengthRule(3)]
        })
        def spawn_actor(assetPath, location, scale=[1,1,1]):
            # Function body here - inputs are already validated!
    """

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Get function signature to map args to parameter names
            sig = inspect.signature(func)
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()

            # Validate each parameter according to schema
            for param_name, rules in validation_schema.items():
                if param_name in bound_args.arguments:
                    value = bound_args.arguments[param_name]
                    for rule in rules:
                        error_msg = rule.validate(value, param_name)
                        if error_msg:
                            raise ValidationError(
                                error_msg,
                                operation=func.__name__,
                                details={"parameter": param_name, "value": str(value)},
                            )

            return func(*args, **kwargs)

        return wrapper

    return decorator


# ============================================================================
# Error Handling Decorators
# ============================================================================


def handle_unreal_errors(operation_name: str = None):
    """
    Decorator that catches and converts UE-specific errors to UEMCPError types.

    Args:
        operation_name: Name of the operation for error context
    """

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            op_name = operation_name or func.__name__

            try:
                return func(*args, **kwargs)

            # Specific UE error handling
            except AttributeError as e:
                if "unreal" in str(e).lower():
                    raise ProcessingError(
                        f"Unreal Engine API error: {str(e)}",
                        operation=op_name,
                        details={"error_type": "AttributeError"},
                    ) from e
                raise  # Re-raise if not UE-related

            except RuntimeError as e:
                if any(keyword in str(e).lower() for keyword in ["unreal", "editor", "asset", "actor"]):
                    raise ProcessingError(
                        f"Unreal Engine runtime error: {str(e)}",
                        operation=op_name,
                        details={"error_type": "RuntimeError"},
                    ) from e
                raise  # Re-raise if not UE-related

            # Keep specific UEMCP errors as-is
            except UEMCPError:
                raise

        return wrapper

    return decorator


def safe_operation(operation_type: str = "operation"):
    """
    Decorator that provides safe execution with standardized error handling.

    Args:
        operation_type: Type of operation (actor, asset, viewport, etc.)
    """

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            try:
                result = func(*args, **kwargs)

                # Ensure result is properly formatted
                if not isinstance(result, dict):
                    return {"success": True, "result": result}
                if "success" not in result:
                    result["success"] = True

                return result

            except UEMCPError as e:
                log_error(f"{operation_type} operation failed: {e.message}")
                return e.to_dict()

            except Exception as e:
                # Last resort for truly unexpected errors
                log_error(f"Unexpected error in {operation_type} operation: {str(e)}")
                return {
                    "success": False,
                    "error": f"Unexpected {operation_type} error: {str(e)}",
                    "operation": func.__name__,
                    "details": {"error_type": type(e).__name__},
                }

        return wrapper

    return decorator


# ============================================================================
# Utility Functions for Common Validations
# ============================================================================


def require_actor(actor_name: str) -> unreal.Actor:
    """
    Find and return an actor by name, raising ProcessingError if not found.

    Args:
        actor_name: Name of the actor to find

    Returns:
        unreal.Actor: The found actor

    Raises:
        ProcessingError: If actor is not found
    """
    from utils import find_actor_by_name  # Import here to avoid circular imports

    actor = find_actor_by_name(actor_name)
    if not actor:
        raise ProcessingError(
            f"Actor '{actor_name}' not found in level", operation="find_actor", details={"actor_name": actor_name}
        )
    return actor


def require_asset(asset_path: str) -> unreal.Object:
    """
    Load and return an asset, raising ProcessingError if not found or invalid.

    Args:
        asset_path: Path to the asset

    Returns:
        unreal.Object: The loaded asset

    Raises:
        ProcessingError: If asset cannot be loaded
    """
    from utils import load_asset  # Import here to avoid circular imports

    asset = load_asset(asset_path)
    if not asset:
        raise ProcessingError(
            f"Could not load asset: {asset_path}", operation="load_asset", details={"asset_path": asset_path}
        )
    return asset


# ============================================================================
# Context Managers for Resource Management
# ============================================================================


class DisableViewportUpdates:
    """Context manager to temporarily disable viewport updates for performance."""

    def __enter__(self):
        try:
            self._subsystem = get_level_editor_subsystem()
            self._subsystem.editor_set_viewport_realtime(False)
            log_debug("Disabled viewport updates for performance")
        except Exception as e:
            self._subsystem = None
            log_debug(f"Could not disable viewport updates: {str(e)}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        subsystem = getattr(self, "_subsystem", None)
        if subsystem is None:
            try:
                subsystem = get_level_editor_subsystem()
            except RuntimeError:
                log_debug("Skipping viewport re-enable: subsystem unavailable")
                return
        try:
            subsystem.editor_set_viewport_realtime(True)
            log_debug("Re-enabled viewport updates")
        except Exception as e:
            log_error(f"Failed to re-enable viewport updates: {str(e)}")


# ============================================================================
# Example Usage and Tests
# ============================================================================

if __name__ == "__main__":
    # Example of how to use the new error handling framework

    @validate_inputs(
        {
            "assetPath": [RequiredRule(), AssetPathRule()],
            "location": [RequiredRule(), ListLengthRule(3)],
            "name": [TypeRule(str)],
        }
    )
    @handle_unreal_errors("spawn_actor")
    @safe_operation("actor")
    def example_spawn_actor(assetPath: str, location: List[float], name: str = None):
        """Example function showing the new error handling pattern."""
        # No try/catch needed! Validation and error handling are automatic

        # These will throw specific errors if they fail
        asset = require_asset(assetPath)

        # Business logic without error handling boilerplate
        from utils import create_transform

        ue_location, ue_rotation, ue_scale = create_transform(location, [0, 0, 0], [1, 1, 1])

        # This might raise ProcessingError which will be caught and converted
        editor_actor_subsystem = get_actor_subsystem()
        actor = editor_actor_subsystem.spawn_actor_from_object(asset, ue_location, ue_rotation)

        if not actor:
            raise ProcessingError("Failed to spawn actor from asset")

        if name:
            actor.set_actor_label(name)

        return {"actor_name": actor.get_actor_label(), "location": location, "asset_path": assetPath}
